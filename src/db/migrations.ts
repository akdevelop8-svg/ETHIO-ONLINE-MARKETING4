import fs from 'node:fs';
import path from 'node:path';
import { pool } from './pg.js';

export async function runMigrations(): Promise<void> {
  const mustApplySchema = process.env.VERCEL === '1' ||
    Boolean(process.env.VERCEL_ENV) ||
    process.env.NODE_ENV === 'production';

  if (!pool) {
    if (mustApplySchema) {
      throw new Error('DATABASE_URL is required before the EOM schema can be applied.');
    }
    console.warn('No database pool available; skipping SQL schema setup in local development.');
    return;
  }

  try {
    const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');

    if (!fs.existsSync(schemaPath)) {
      throw new Error('SQL schema file is missing from the deployment package.');
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('EOM database schema applied successfully.');
  } catch (error: any) {
    console.error('EOM database schema setup failed:', error?.message || error);
    if (mustApplySchema) throw error;
  }
}
