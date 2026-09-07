/**
 * EOM Persistence Adapter Abstraction Layer
 * Phase 10: Production Backend & Persistent Data Foundation
 */

export interface IPersistenceAdapter {
  getAll<T>(collectionName: string): T[];
  save<T extends { id: string }>(collectionName: string, item: T): void;
  batchSave<T>(collectionName: string, items: T[]): void;
  delete(collectionName: string, id: string): void;
  clear(collectionName: string): void;
}

export class LocalStoragePersistenceAdapter implements IPersistenceAdapter {
  private fallbackStore = new Map<string, any[]>();

  public getAll<T>(collectionName: string): T[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return (this.fallbackStore.get(collectionName) || []) as T[];
      }
      const data = localStorage.getItem(collectionName);
      return data ? (JSON.parse(data) as T[]) : [];
    } catch (err) {
      return (this.fallbackStore.get(collectionName) || []) as T[];
    }
  }

  public save<T extends { id: string }>(collectionName: string, item: T): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        const all = this.getAll<T>(collectionName);
        const index = all.findIndex((x) => x.id === item.id);
        if (index >= 0) {
          all[index] = item;
        } else {
          all.push(item);
        }
        this.fallbackStore.set(collectionName, all);
        return;
      }
      const all = this.getAll<T>(collectionName);
      const index = all.findIndex((x) => x.id === item.id);
      if (index >= 0) {
        all[index] = item;
      } else {
        all.push(item);
      }
      localStorage.setItem(collectionName, JSON.stringify(all));
    } catch (err) {
      const all = (this.fallbackStore.get(collectionName) || []) as T[];
      const index = all.findIndex((x) => x.id === item.id);
      if (index >= 0) {
        all[index] = item;
      } else {
        all.push(item);
      }
      this.fallbackStore.set(collectionName, all);
    }
  }

  public batchSave<T>(collectionName: string, items: T[]): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        this.fallbackStore.set(collectionName, [...items]);
        return;
      }
      localStorage.setItem(collectionName, JSON.stringify(items));
    } catch (err) {
      this.fallbackStore.set(collectionName, [...items]);
    }
  }

  public delete(collectionName: string, id: string): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        const all = this.getAll<{ id: string }>(collectionName);
        const filtered = all.filter((x) => x.id !== id);
        this.fallbackStore.set(collectionName, filtered);
        return;
      }
      const all = this.getAll<{ id: string }>(collectionName);
      const filtered = all.filter((x) => x.id !== id);
      localStorage.setItem(collectionName, JSON.stringify(filtered));
    } catch (err) {
      const all = (this.fallbackStore.get(collectionName) || []) as { id: string }[];
      const filtered = all.filter((x) => x.id !== id);
      this.fallbackStore.set(collectionName, filtered);
    }
  }

  public clear(collectionName: string): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        this.fallbackStore.delete(collectionName);
        return;
      }
      localStorage.removeItem(collectionName);
    } catch (err) {
      this.fallbackStore.delete(collectionName);
    }
  }
}

export class InMemoryPersistenceAdapter implements IPersistenceAdapter {
  private store = new Map<string, any[]>();

  public getAll<T>(collectionName: string): T[] {
    return (this.store.get(collectionName) || []) as T[];
  }

  public save<T extends { id: string }>(collectionName: string, item: T): void {
    const all = this.getAll<T>(collectionName);
    const index = all.findIndex((x) => x.id === item.id);
    if (index >= 0) {
      all[index] = item;
    } else {
      all.push(item);
    }
    this.store.set(collectionName, all);
  }

  public batchSave<T>(collectionName: string, items: T[]): void {
    this.store.set(collectionName, [...items]);
  }

  public delete(collectionName: string, id: string): void {
    const all = this.getAll<{ id: string }>(collectionName);
    const filtered = all.filter((x) => x.id !== id);
    this.store.set(collectionName, filtered);
  }

  public clear(collectionName: string): void {
    this.store.delete(collectionName);
  }
}
