import { IPersistenceAdapter } from './persistenceAdapter.js';
import { pool } from '../../db/pg.js';

export class PostgresPersistenceAdapter implements IPersistenceAdapter {
  private cache = new Map<string, any[]>();
  private isLoaded = false;

  public async loadAllFromDatabase() {
    if (!pool) {
      console.warn('PostgresPersistenceAdapter: pool is null, using empty cache.');
      this.isLoaded = true;
      return;
    }
    try {
      // Domain services use synchronous repository objects (camelCase fields).
      // Persist and restore those objects from the JSONB backend_storage table instead
      // of attempting to hydrate them from the normalized SQL tables (whose column
      // names and shapes differ).
      const res = await pool.query('SELECT collection, id, data FROM backend_storage');
      this.cache.clear();
      for (const row of res.rows) {
        let item = row.data;
        if (typeof item === 'string') {
          item = JSON.parse(item);
        }
        if (!item || typeof item !== 'object') continue;
        if (!item.id) item.id = row.id;
        const existing = this.cache.get(row.collection) || [];
        existing.push(item);
        this.cache.set(row.collection, existing);
      }
      this.isLoaded = true;
    } catch (err) {
      console.error('Failed to load from Postgres:', err);
      this.isLoaded = true;
    }
  }

  public getAll<T>(collectionName: string): T[] {
    if (!this.isLoaded) {
      console.warn(`getAll called before loadAllFromDatabase finished for ${collectionName}`);
    }
    return (this.cache.get(collectionName) || []) as T[];
  }

  public save<T extends { id: string }>(collectionName: string, item: T): void {
    // 1. Update synchronous cache
    const all = this.getAll<T>(collectionName);
    const index = all.findIndex((x) => x.id === item.id);
    if (index >= 0) {
      all[index] = item;
    } else {
      all.push(item);
    }
    this.cache.set(collectionName, all);

    // 2. Fire and forget async write to DB
    if (pool) {
      // Store in a JSONB fallback column or actual columns.
      // For phase 11, we acknowledge full ORM mapping requires async refactoring.
      // So we do a generic upsert using a hypothetical JSONB store if we wanted,
      // or we just log it for the simulated connection.
      const query = `
        INSERT INTO backend_storage (collection, id, data) 
        VALUES ($1, $2, $3)
        ON CONFLICT (collection, id) DO UPDATE SET data = $3
      `;
      pool.query(query, [collectionName, item.id, item]).catch(err => {
         // console.error(`Async save to pg failed for ${collectionName}:`, err.message);
      });
    }
  }

  public batchSave<T>(collectionName: string, items: T[]): void {
    this.cache.set(collectionName, [...items]);
    if (pool) {
       items.forEach((item: any) => {
          if (item.id) this.save(collectionName, item);
       });
    }
  }

  public delete(collectionName: string, id: string): void {
    const all = this.getAll<{ id: string }>(collectionName);
    const filtered = all.filter((x) => x.id !== id);
    this.cache.set(collectionName, filtered);
    if (pool) {
       pool.query('DELETE FROM backend_storage WHERE collection = $1 AND id = $2', [collectionName, id]).catch(e => {});
    }
  }

  public clear(collectionName: string): void {
    this.cache.delete(collectionName);
  }
}
