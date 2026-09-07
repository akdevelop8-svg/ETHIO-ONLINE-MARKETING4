import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pg.js';
import { authService } from '../services/auth/authService.js';
import { defaultStorageAdapter } from '../services/persistence/index.js';
import { User } from '../types/index.js';
import { requireAuth, AuthRequest, getJwtSecret } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { validateEthiopianPhone } from '../services/auth/validators.js';

export const authRouter = Router();

// In-memory registration lock to prevent concurrent duplicate registration requests
const registrationLock = new Set<string>();

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().trim().optional().or(z.literal('')),
  // Keep username friendly: normalize it server-side instead of exposing rigid
  // "3-32 characters" validation messages to customers.
  username: z.string().trim().max(100, 'Username is too long.').optional().or(z.literal('')),
  role: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().optional(),
  identifier: z.string().optional(),
  password: z.string().min(1, 'Password is required')
}).refine((data) => data.email || data.identifier, { message: 'Email or username/phone is required' });

authRouter.post('/login', authRateLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const identifier = (parsed.identifier || parsed.email || '').trim();
    const password = parsed.password;

    const cleanIdent = identifier.toLowerCase();
    const bareIdent = cleanIdent.replace(/^@/, '');
    const loginPhoneCheck = validateEthiopianPhone(identifier);
    const normalizedLoginPhone = loginPhoneCheck.isValid ? loginPhoneCheck.normalized : identifier.trim();

    // Check for Admin Login (@mr_ebek or @EXO_SMM)
    const isAdminIdent = 
      bareIdent === 'mr_ebek' || 
      bareIdent === 'exo_smm' || 
      cleanIdent === 'mr_ebek@eom.et' || 
      cleanIdent === 'exo_smm@eom.et' || 
      cleanIdent === 'mr_ebek@ethioonline.market' || 
      cleanIdent === 'exo_smm@ethioonline.market';

    if (isAdminIdent) {
      const configuredAdminPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'mrEXO@2026');
      if (!configuredAdminPassword || password !== configuredAdminPassword) {
        return res.status(401).json({ error: 'Invalid email/username or password.' });
      }

      const isExo = bareIdent === 'exo_smm' || cleanIdent.includes('exo_smm');
      const adminUser: User = isExo ? {
        id: 'usr-admin-02',
        email: 'exo_smm@eom.et',
        phone: '+251911000002',
        fullName: 'Ops Admin (@EXO_SMM)',
        username: '@EXO_SMM',
        role: 'ADMIN',
        authRole: 'admin',
        isVerified: true,
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
        walletBalanceETB: 25000,
        lockedBalanceETB: 0,
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: new Date().toISOString()
      } : {
        id: 'usr-admin-01',
        email: 'mr_ebek@eom.et',
        phone: '+251911000001',
        fullName: 'Lead Admin (@mr_ebek)',
        username: '@mr_ebek',
        role: 'ADMIN',
        authRole: 'admin',
        isVerified: true,
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
        walletBalanceETB: 50000,
        lockedBalanceETB: 0,
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: new Date().toISOString()
      };

      const token = jwt.sign(
        { id: adminUser.id, email: adminUser.email, role: 'ADMIN', authRole: 'admin' },
        getJwtSecret(),
        { expiresIn: '7d' }
      );

      return res.json({ success: true, token, user: adminUser });
    }

    let user: User | null = null;
    const atIdent = `@${bareIdent}`;

    if (pool) {
      const result = await pool.query(
        'SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $2 OR LOWER(username) = $3 OR normalized_phone = $4',
        [cleanIdent, cleanIdent, atIdent, normalizedLoginPhone]
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        user = {
          id: row.id,
          email: row.email,
          phone: row.normalized_phone,
          fullName: row.full_name,
          username: row.username,
          role: row.role as any,
          authRole: row.auth_role as any,
          isVerified: row.is_verified,
          emailVerified: row.email_verified,
          phoneVerified: row.phone_verified,
          isActive: row.is_active,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          walletBalanceETB: row.wallet_balance_etb || 0,
          lockedBalanceETB: row.locked_balance_etb || 0
        };
      }
    }

    if (!user) {
      const allUsers = authService.getAllUsersForAdmin({
        id: 'usr-admin-01',
        email: 'mr_ebek@eom.et',
        role: 'ADMIN',
        authRole: 'admin',
        isVerified: true,
        isActive: true,
        createdAt: '',
        updatedAt: ''
      } as User);

      user = allUsers.find(
        (u) =>
          u.email.toLowerCase() === cleanIdent ||
          u.username?.toLowerCase() === cleanIdent ||
          u.username?.toLowerCase() === bareIdent ||
          u.username?.toLowerCase() === atIdent ||
          u.phone === identifier
      ) || null;
    }

    if (!user) {
      const usersFromStorage = defaultStorageAdapter.getAll<User>('users');
      user = usersFromStorage.find(
        (u) =>
          u.email.toLowerCase() === cleanIdent ||
          u.username?.toLowerCase() === cleanIdent ||
          u.username?.toLowerCase() === bareIdent ||
          u.username?.toLowerCase() === atIdent ||
          u.phone === identifier
      ) || null;
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email/username or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account suspended or deactivated.' });
    }

    let isMatch = false;
    if (pool) {
      const result = await pool.query('SELECT password_hash FROM users_secrets WHERE user_id = $1', [user.id]);
      if (result.rows.length > 0) {
        isMatch = await bcrypt.compare(password, result.rows[0].password_hash);
      } else {
        // Verification against authService credentials
        try {
          const loginRes = await authService.login({ identifier, password });
          isMatch = Boolean(loginRes && loginRes.user);
        } catch {
          isMatch = false;
        }
      }
    } else {
      const secrets = defaultStorageAdapter.getAll<any>('users_secrets');
      const secret = secrets.find((s) => s.id === user?.id || s.userId === user?.id);
      if (secret && secret.password_hash) {
        isMatch = await bcrypt.compare(password, secret.password_hash);
      } else {
        try {
          const loginRes = await authService.login({ identifier, password });
          isMatch = Boolean(loginRes && loginRes.user);
        } catch {
          isMatch = false;
        }
      }
    }

    if (isMatch) {
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, authRole: user.authRole },
        getJwtSecret(),
        { expiresIn: '7d' }
      );

      // Return user without any sensitive secret fields
      const { ...safeUser } = user;
      res.json({ success: true, token, user: safeUser });
    } else {
      res.status(401).json({ error: 'Invalid email/username or password.' });
    }
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0].message });
    } else if (err?.code === '23505') {
      res.status(409).json({ error: 'An account with the same email, phone number, or username already exists.' });
    } else {
      res.status(401).json({ error: err.message || 'Authentication failed' });
    }
  }
});

authRouter.post('/register', authRateLimiter, async (req, res) => {
  let lockKey = '';
  try {
    const { email, password, fullName, phone, username } = registerSchema.parse(req.body);

    const cleanEmail = email.trim().toLowerCase();
    const rawUsername = (username || cleanEmail.split('@')[0] || '').replace(/^@/, '').toLowerCase();

    // Check reserved administrative handles
    if (
      rawUsername === 'mr_ebek' || 
      rawUsername === 'exo_smm' || 
      cleanEmail.includes('mr_ebek') || 
      cleanEmail.includes('exo_smm')
    ) {
      return res.status(400).json({ error: 'This username or email address is reserved by EOM system administration.' });
    }

    const phoneValue = (phone || '').trim();
    const phoneCheck = phoneValue ? validateEthiopianPhone(phoneValue) : { isValid: true, normalized: '' };
    if (phoneValue && !phoneCheck.isValid) {
      return res.status(400).json({ error: phoneCheck.error || 'Invalid Ethiopian phone number.' });
    }
    const normalizedPhone = phoneCheck.normalized || null;

    lockKey = `${cleanEmail}:${normalizedPhone || 'no-phone'}`;

    // Concurrent registration race condition protection
    if (registrationLock.has(lockKey)) {
      return res.status(409).json({ error: 'Registration request already in progress for this email or phone.' });
    }
    registrationLock.add(lockKey);

    const formattedUsername = `@${rawUsername}`;

    if (pool) {
      const existing = await pool.query(
        'SELECT id, email, normalized_phone, username FROM users WHERE LOWER(email) = $1 OR normalized_phone = $2 OR LOWER(username) = $3',
        [cleanEmail, normalizedPhone, formattedUsername.toLowerCase()]
      );
      if (existing.rows.length > 0) {
        registrationLock.delete(lockKey);
        const duplicate = existing.rows[0];
        if (duplicate.email?.toLowerCase() === cleanEmail) {
          return res.status(409).json({ error: 'Email already registered. Please sign in instead.' });
        }
        if (duplicate.normalized_phone === normalizedPhone) {
          return res.status(409).json({ error: 'Phone number already registered. Please sign in instead.' });
        }
        return res.status(409).json({ error: 'Username already taken. Please choose a different username.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const id = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const now = new Date().toISOString();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO users (id, email, normalized_phone, full_name, username, role, auth_role, is_verified, email_verified, phone_verified, is_active, wallet_balance_etb, locked_balance_etb)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, 0, 0)`,
          [id, cleanEmail, normalizedPhone, fullName.trim(), formattedUsername, 'USER', 'user', true, true, true]
        );
        await client.query(
          `INSERT INTO users_secrets (user_id, password_hash) VALUES ($1, $2)`,
          [id, hashedPassword]
        );
        await client.query('COMMIT');
      } catch (dbError: any) {
        await client.query('ROLLBACK');
        throw dbError;
      } finally {
        client.release();
      }
    } else {
      const users = defaultStorageAdapter.getAll<User>('users');
      const exists = users.find(
        (u) => u.email.toLowerCase() === cleanEmail || u.phone === normalizedPhone || u.username?.toLowerCase() === formattedUsername.toLowerCase()
      );
      if (exists) {
        registrationLock.delete(lockKey);
        if (exists.email.toLowerCase() === cleanEmail) return res.status(409).json({ error: 'Email already registered. Please sign in instead.' });
        if (exists.phone === normalizedPhone) return res.status(409).json({ error: 'Phone number already registered. Please sign in instead.' });
        return res.status(409).json({ error: 'Username already taken. Please choose a different username.' });
      }

      const id = `usr-${Date.now()}`;
      const newUser: User = {
        id,
        email: cleanEmail,
        phone: normalizedPhone,
        fullName: fullName.trim(),
        username: formattedUsername,
        role: 'USER',
        authRole: 'user',
        isVerified: true,
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        walletBalanceETB: 0,
        lockedBalanceETB: 0
      };
      const hashedPassword = await bcrypt.hash(password, 10);
      defaultStorageAdapter.save('users', newUser);
      defaultStorageAdapter.save('users_secrets', { id, password_hash: hashedPassword });

      // Also register into authService memory
      try {
        await authService.register({
          fullName,
          email: cleanEmail,
          phone: normalizedPhone || '',
          username: formattedUsername,
          password,
          confirmPassword: password,
          agreedToTerms: true
        });
      } catch {
        // Memory registration sync safety
      }
    }

    registrationLock.delete(lockKey);
    res.json({ success: true });
  } catch (err: any) {
    if (lockKey) registrationLock.delete(lockKey);
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0].message });
    } else if (err?.code === '23505') {
      res.status(409).json({ error: 'An account with the same email, phone number, or username already exists.' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

authRouter.post('/logout', requireAuth, async (req: AuthRequest, res) => {
  if (req.user) {
    await authService.logout();
  }
  res.json({ success: true });
});

authRouter.post('/verify-email', requireAuth, async (req: AuthRequest, res) => {
  res.json(req.user);
});

authRouter.post('/resend-verification', requireAuth, async (req: AuthRequest, res) => {
  res.json({ code: '123456' });
});

authRouter.post('/request-password-reset', authRateLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }
  const result = await authService.requestPasswordReset(email);
  res.json(result);
});

authRouter.post('/confirm-password-reset', authRateLimiter, async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body || {};
  try {
    await authService.confirmPasswordReset(token, newPassword, confirmPassword);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

authRouter.put('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user as User;
    const { fullName, phone, username } = req.body || {};

    if (pool) {
      const phoneUpdate = phone !== undefined ? validateEthiopianPhone(String(phone)) : null;
      if (phoneUpdate && !phoneUpdate.isValid) {
        return res.status(400).json({ error: phoneUpdate.error || 'Invalid Ethiopian phone number.' });
      }
      const normalizedPhone = phoneUpdate?.normalized ?? undefined;
      const normalizedUsername = username !== undefined ? `@${String(username).trim().replace(/^@/, '').toLowerCase()}` : undefined;
      if (normalizedUsername === '@' || normalizedUsername === '@mr_ebek' || normalizedUsername === '@exo_smm') {
        return res.status(400).json({ error: 'This username is reserved by EOM system administration or is invalid.' });
      }

      if (normalizedPhone) {
        const phoneConflict = await pool.query('SELECT id FROM users WHERE id <> $1 AND normalized_phone = $2 LIMIT 1', [user.id, normalizedPhone]);
        if (phoneConflict.rows.length) return res.status(409).json({ error: 'Another account is already using this phone number.' });
      }
      if (normalizedUsername) {
        const usernameConflict = await pool.query('SELECT id FROM users WHERE id <> $1 AND LOWER(username) = $2 LIMIT 1', [user.id, normalizedUsername.toLowerCase()]);
        if (usernameConflict.rows.length) return res.status(409).json({ error: 'Another account is already using this username.' });
      }

      const updated = await pool.query(
        `UPDATE users SET full_name = COALESCE($2, full_name), normalized_phone = COALESCE($3, normalized_phone), username = COALESCE($4, username), updated_at = NOW() WHERE id = $1 RETURNING id, email, normalized_phone, full_name, username, role, auth_role, is_verified, email_verified, phone_verified, is_active, avatar_url, wallet_balance_etb, locked_balance_etb, created_at, updated_at`,
        [user.id, fullName?.trim() || null, normalizedPhone ?? null, normalizedUsername ?? null]
      );
      if (!updated.rows.length) return res.status(404).json({ error: 'User account not found.' });
      const row = updated.rows[0];
      return res.json({
        id: row.id, email: row.email, phone: row.normalized_phone, fullName: row.full_name, username: row.username,
        role: row.role, authRole: row.auth_role, isVerified: Boolean(row.is_verified), emailVerified: Boolean(row.email_verified),
        phoneVerified: Boolean(row.phone_verified), isActive: Boolean(row.is_active), avatarUrl: row.avatar_url || undefined,
        walletBalanceETB: Number(row.wallet_balance_etb || 0), lockedBalanceETB: Number(row.locked_balance_etb || 0),
        createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString()
      });
    }

    const updated = await authService.updateProfile(user.id, { fullName, phone, username });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
