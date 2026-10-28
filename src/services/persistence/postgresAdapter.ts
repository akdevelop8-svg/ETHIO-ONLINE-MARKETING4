import { IPersistenceAdapter } from './persistenceAdapter.js';
import { pool } from '../../db/pg.js';

export class PostgresPersistenceAdapter implements IPersistenceAdapter {
  private cache = new Map<string, any[]>();
  private isLoaded = false;
  private pendingWrites = new Set<Promise<void>>();
  private pendingWriteErrors: string[] = [];

  public async loadAllFromDatabase(): Promise<void> {
    if (!pool) {
      console.warn('PostgresPersistenceAdapter: no database pool; using an empty development cache.');
      this.isLoaded = true;
      return;
    }

    try {
      const res = await pool.query('SELECT collection, id, data FROM backend_storage');
      this.cache.clear();

      for (const row of res.rows) {
        let item = row.data;
        if (typeof item === 'string') item = JSON.parse(item);
        if (!item || typeof item !== 'object') continue;
        if (!item.id) item.id = row.id;

        const existing = this.cache.get(row.collection) || [];
        existing.push(item);
        this.cache.set(row.collection, existing);
      }
      this.isLoaded = true;
    } catch (err: any) {
      this.isLoaded = false;
      console.error('Failed to load persisted data from PostgreSQL:', err?.message || err);

      if (process.env.NODE_ENV === 'production' && (process.env.REQUIRE_POSTGRES === 'true' || process.env.VERCEL === '1')) {
        throw new Error('Unable to load EOM persistent data from PostgreSQL. Startup stopped to protect existing data.');
      }

      this.isLoaded = true;
    }
  }

  private trackWrite(collectionName: string, queryPromise: Promise<unknown>): void {
    const pending = queryPromise
      .then(() => undefined)
      .catch((err: any) => {
        // Never log customer data, credentials, or password hashes.
        const safeMessage = err?.message || 'Unknown database error';
        console.error(`PostgreSQL persistence write failed for collection "${collectionName}":`, safeMessage);
        this.pendingWriteErrors.push(`Collection "${collectionName}" could not be persisted.`);
      });

    this.pendingWrites.add(pending);
    void pending.finally(() => this.pendingWrites.delete(pending));
  }

  /** Wait for currently queued writes and fail when any write did not persist. */
  public async flushPendingWrites(): Promise<void> {
    while (this.pendingWrites.size > 0) {
      await Promise.all(Array.from(this.pendingWrites));
    }

    if (this.pendingWriteErrors.length > 0) {
      const failedWrites = this.pendingWriteErrors.splice(0, this.pendingWriteErrors.length);
      throw new Error(`Failed to persist ${failedWrites.length} database write operation(s).`);
    }
  }

  public getAll<T>(collectionName: string): T[] {
    if (!this.isLoaded) {
      console.warn(`getAll called before loadAllFromDatabase finished for ${collectionName}`);
    }
    return (this.cache.get(collectionName) || []) as T[];
  }

  public save<T extends { id: string }>(collectionName: string, item: T): void {
    const all = this.getAll<T>(collectionName);
    const index = all.findIndex((entry) => entry.id === item.id);

    if (index >= 0) {
      all[index] = item;
    } else {
      all.push(item);
    }
    this.cache.set(collectionName, all);

    if (pool) {
      const query = `
        INSERT INTO backend_storage (collection, id, data, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (collection, id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `;
      this.trackWrite(collectionName, pool.query(query, [collectionName, item.id, item]));
    }
  }

  private getPersistedItemId(item: any): string | null {
    const id = item?.id ?? item?.userId ?? item?.token;
    return typeof id === 'string' && id.length > 0 ? id : null;
  }

  public batchSave<T>(collectionName: string, items: T[]): void {
    this.cache.set(collectionName, [...items]);

    if (!pool) return;

    const identifiedItems = (items as any[])
      .map((item) => ({ id: this.getPersistedItemId(item), item }))
      .filter((entry) => Boolean(entry.id)) as Array<{ id: string; item: any }>;
    const persistedIds = identifiedItems.map((entry) => entry.id);

    const writeBatch = (async () => {
      const client = await pool!.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          'DELETE FROM backend_storage WHERE collection = $1 AND NOT (id = ANY($2::varchar[]))',
          [collectionName, persistedIds]
        );

        const upsert = `
          INSERT INTO backend_storage (collection, id, data, updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (collection, id)
          DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
        `;

        for (const entry of identifiedItems) {
          await client.query(upsert, [collectionName, entry.id, entry.item]);
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    })();

    this.trackWrite(collectionName, writeBatch);
  }

  public delete(collectionName: string, id: string): void {
    const all = this.getAll<{ id: string }>(collectionName);
    this.cache.set(collectionName, all.filter((item) => item.id !== id));

    if (pool) {
      this.trackWrite(collectionName, pool.query(
        'DELETE FROM backend_storage WHERE collection = $1 AND id = $2',
        [collectionName, id]
      ));
    }
  }

  public clear(collectionName: string): void {
    this.cache.delete(collectionName);

    if (pool) {
      this.trackWrite(collectionName, pool.query(
        'DELETE FROM backend_storage WHERE collection = $1',
        [collectionName]
      ));
    }
  }
}
