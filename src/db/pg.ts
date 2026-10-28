import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * Validates whether a provided connection string is a well-formed PostgreSQL URL.
 * Rejects masked placeholders and invalid hosts before attempting a connection.
 */
export function isValidPostgresUrl(urlStr?: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();

  if (!trimmed.startsWith('postgres://') && !trimmed.startsWith('postgresql://')) {
    return false;
  }
  if (trimmed.includes('•') || trimmed.includes('••••')) return false;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname;
    if (!host || host === 'base' || host.includes('•') || host === 'your-postgres-host') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns safe connection metadata without exposing passwords or query parameters.
 */
export function getSanitizedDbInfo(): { isConfigured: boolean; host?: string; database?: string; port?: string } {
  const dbUrl = process.env.DATABASE_URL;
  if (!isValidPostgresUrl(dbUrl)) return { isConfigured: false };

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
    const connectionUrl = new URL(dbUrl!);
    const host = connectionUrl.hostname.toLowerCase();
    const isSupabaseHost = host.endsWith('.supabase.co') || host.endsWith('.pooler.supabase.com');

    // Supabase PostgreSQL requires TLS. Add sslmode=require when the supplied
    // connection URI did not already specify an SSL mode.
    if (isSupabaseHost && !connectionUrl.searchParams.has('sslmode')) {
      connectionUrl.searchParams.set('sslmode', 'require');
    }

    pool = new Pool({
      connectionString: connectionUrl.toString(),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      application_name: 'ethio-online-market'
    });

    pool.on('error', (err) => {
      console.error('PostgreSQL idle client error:', err.message);
    });
  } catch (err: any) {
    console.error('Failed to initialize PostgreSQL pool:', err?.message || 'Unknown error');
    pool = null;
  }
} else {
  if (dbUrl) {
    console.warn('DATABASE_URL is not a valid PostgreSQL URL. Configure the real Supabase/managed PostgreSQL connection URI.');
  } else {
    console.warn('DATABASE_URL not set. Persistent database storage is unavailable in this environment.');
  }
}
