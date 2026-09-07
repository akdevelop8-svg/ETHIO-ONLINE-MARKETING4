import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { defaultStorageAdapter } from '../services/persistence/index.js';
import { authService } from '../services/auth/authService.js';
import { User, UserRole } from '../types/index.js';
import { pool } from '../db/pg.js';

export const getJwtSecret = () => {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET) {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production.');
    }
    return process.env.JWT_SECRET;
  }
  return process.env.JWT_SECRET || 'fallback-secret-for-development';
};

export interface AuthRequest extends Request {
  user?: User;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; email?: string; role?: string; authRole?: string };
    const decodedId = String(decoded.id || '');
    const decodedEmail = String(decoded.email || '').toLowerCase();
    let user: User | undefined;

    // Production source of truth: normalized PostgreSQL users table.
    if (pool && (decodedId || decodedEmail)) {
      const result = await pool.query(
        'SELECT id, email, normalized_phone, full_name, username, role, auth_role, is_verified, email_verified, phone_verified, is_active, avatar_url, wallet_balance_etb, locked_balance_etb, created_at, updated_at FROM users WHERE id = $1 OR LOWER(email) = $2 LIMIT 1',
        [decodedId, decodedEmail]
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        user = {
          id: row.id,
          email: row.email,
          phone: row.normalized_phone,
          fullName: row.full_name,
          username: row.username,
          role: row.role as UserRole,
          authRole: row.auth_role,
          isVerified: Boolean(row.is_verified),
          emailVerified: Boolean(row.email_verified),
          phoneVerified: Boolean(row.phone_verified),
          isActive: Boolean(row.is_active),
          avatarUrl: row.avatar_url || undefined,
          walletBalanceETB: Number(row.wallet_balance_etb || 0),
          lockedBalanceETB: Number(row.locked_balance_etb || 0),
          createdAt: new Date(row.created_at).toISOString(),
          updatedAt: new Date(row.updated_at).toISOString()
        };
      }
    }

    // Development / no-DB fallback: generic users collection first.
    if (!user) {
      const users = defaultStorageAdapter.getAll<User>('users');
      user = users.find((u) => u.id === decodedId || u.email.toLowerCase() === decodedEmail);
    }

    // Legacy vault fallback for existing non-DB deployments.
    if (!user) {
      try {
        const adminProbe = {
          id: 'usr-admin-01',
          email: 'mr_ebek@eom.et',
          role: 'ADMIN',
          authRole: 'admin',
          isVerified: true,
          isActive: true,
          createdAt: '',
          updatedAt: ''
        } as User;
        const allAuthUsers = authService.getAllUsersForAdmin(adminProbe);
        user = allAuthUsers.find((u) => u.id === decodedId || u.email.toLowerCase() === decodedEmail);
      } catch {
        // Ignore fallback lookup failures and return the standard auth error below.
      }
    }

    // Admin login is intentionally backed by a small canonical identity set.
    // This keeps admin access available even when the SQL users table has not been seeded yet.
    if (!user && (decodedId === 'usr-admin-01' || decodedId === 'usr-admin-02')) {
      const isExo = decodedId === 'usr-admin-02';
      user = {
        id: decodedId,
        email: isExo ? 'exo_smm@eom.et' : 'mr_ebek@eom.et',
        phone: isExo ? '+251911000002' : '+251911000001',
        fullName: isExo ? 'Ops Admin (@EXO_SMM)' : 'Lead Admin (@mr_ebek)',
        username: isExo ? '@EXO_SMM' : '@mr_ebek',
        role: 'ADMIN',
        authRole: 'admin',
        isVerified: true,
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
        walletBalanceETB: 0,
        lockedBalanceETB: 0,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: new Date().toISOString()
      };
    }

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User account not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Forbidden: Account suspended or deactivated' });
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Session expired, please sign in again' });
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid authentication token' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
  }

  const access = authService.checkAdminAccess(req.user);
  if (!access.granted) {
    return res.status(403).json({ error: 'Forbidden: Admin access required.' });
  }

  next();
};

export const requireRole = (allowedRoles: UserRole | UserRole[]) => {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    const isAdmin = req.user.authRole === 'admin' || req.user.role === 'ADMIN';
    const hasRole = rolesArray.includes(req.user.role) || isAdmin;

    if (!hasRole) {
      return res.status(403).json({ error: `Forbidden: Only ${rolesArray.join(' or ')} role can perform this action.` });
    }

    next();
  };
};
