import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

/**
 * Validates whether a provided connection string is a genuine, well-formed PostgreSQL URL.
 * Protects against masked placeholders (••••), dummy strings, and invalid hosts like 'base'.
 */
export function isValidPostgresUrl(urlStr?: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();

  // Must strictly adhere to PostgreSQL protocol URI
  if (!trimmed.startsWith('postgres://') && !trimmed.startsWith('postgresql://')) {
    return false;
  }

  // Must not contain masked bullet characters or placeholders
  if (trimmed.includes('•') || trimmed.includes('••••')) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname;
    // Reject invalid or placeholder hosts
    if (!host || host === 'base' || host.includes('•') || host === 'your-postgres-host') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns safe connection metadata without exposing password or sensitive query parameters.
 */
export function getSanitizedDbInfo(): { isConfigured: boolean; host?: string; database?: string; port?: string } {
  const dbUrl = process.env.DATABASE_URL;
  if (!isValidPostgresUrl(dbUrl)) {
    return { isConfigured: false };
  }
  try {
    const parsed = new URL(dbUrl!);
    return {
      isConfigured: true,
      host: parsed.hostname,
      port: parsed.port || '5432',
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : undefined
    };
  } catch {
    return { isConfigured: false };
  }
}

export let pool: pg.Pool | null = null;

const dbUrl = process.env.DATABASE_URL;

if (isValidPostgresUrl(dbUrl)) {
  try {
    pool = new Pool({
      connectionString: dbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    });

    pool.on('error', (err) => {
      console.error('PostgreSQL idle client error:', err.message);
    });
  } catch (err: any) {
    console.error('Failed to initialize PostgreSQL pool:', err.message);
    pool = null;
  }
} else {
  if (dbUrl && !isValidPostgresUrl(dbUrl)) {
    console.warn('⚠️ DATABASE_URL format is invalid, placeholder-masked, or unresolvable. Operating with resilient storage persistence layer.');
  } else {
    console.warn('⚠️ DATABASE_URL not set. Running with resilient local storage persistence for preview environments.');
  }
}

