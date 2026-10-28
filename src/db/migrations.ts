import fs from 'fs';
import path from 'path';
import { pool } from './pg.js';

export async function runMigrations() {
  if (!pool) {
    console.warn('⚠️ No database pool available, skipping migrations.');
    return;
  }
  
  try {
    console.log('📦 Running database migrations from schema.sql...');
    const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error(`❌ Schema file not found at ${schemaPath}`);
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') throw new Error(`Schema file not found at ${schemaPath}`);
      return;
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the SQL schema
    await pool.query(schema);
    console.log('✅ Database migrations applied successfully.');
  } catch (error: any) {
    console.error('❌ Error applying database migrations:', error.message);
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') throw error;
  }
}
