import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const isVercelRuntime = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);

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

/** Returns safe connection metadata without exposing passwords or query parameters. */
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

/**
 * Separate one-connection pool for the serverless request mutex. Normal SQL
 * runs through pool while the mutex transaction remains open on its own connection.
 */
export let requestLockPool: pg.Pool | null = null;

const dbUrl = process.env.DATABASE_URL;

if (isValidPostgresUrl(dbUrl)) {
  try {
    const connectionUrl = new URL(dbUrl!);
    const host = connectionUrl.hostname.toLowerCase();
    const isSupabaseHost = host.endsWith('.supabase.co') || host.endsWith('.pooler.supabase.com');

    // Supabase PostgreSQL requires TLS. Add sslmode=require when the supplied
    // connection URI did not already specify an SSL mode.
    if (isSupabaseHost) {
      const sslMode = connectionUrl.searchParams.get('sslmode')?.toLowerCase();
      if (!sslMode) {
        connectionUrl.searchParams.set('sslmode', 'require');
      }

      // Recent pg-connection-string versions interpret sslmode=require as
      // full certificate verification unless libpq compatibility is enabled.
      // Supabase's default/root certificate is private, so that can fail with
      // SELF_SIGNED_CERT_IN_CHAIN. Compatibility keeps TLS encryption required
      // while giving sslmode=require its documented libpq meaning. For strict
      // certificate verification, use sslmode=verify-full with Supabase's CA.
      if (!sslMode || sslMode === 'require') {
        connectionUrl.searchParams.set('uselibpqcompat', 'true');
      }
    }

    const connectionString = connectionUrl.toString();
    const poolOptions = {
      connectionString,
      // Serverless instances are short-lived and multiplied by traffic. Keep
      // each application pool at one connection to avoid exhausting Supabase.
      max: isVercelRuntime ? 1 : 10,
      idleTimeoutMillis: isVercelRuntime ? 10000 : 30000,
      connectionTimeoutMillis: 5000,
      application_name: 'ethio-online-market',
      allowExitOnIdle: isVercelRuntime
    };

    pool = new Pool(poolOptions);
    pool.on('error', (err) => {
      console.error('PostgreSQL idle client error:', err.message);
    });

    if (isVercelRuntime) {
      requestLockPool = new Pool({
        ...poolOptions,
        max: 1,
        application_name: 'ethio-online-market-request-lock'
      });
      requestLockPool.on('error', (err) => {
        console.error('PostgreSQL request-lock client error:', err.message);
      });
    }
  } catch (err: any) {
    console.error('Failed to initialize PostgreSQL pool:', err?.message || 'Unknown error');
    pool = null;
    requestLockPool = null;
  }
} else {
  if (dbUrl) {
    console.warn('DATABASE_URL is not a valid PostgreSQL URL. Configure the real Supabase PostgreSQL connection URI.');
  } else {
    console.warn('DATABASE_URL not set. Persistent database storage is unavailable in this environment.');
  }
}
