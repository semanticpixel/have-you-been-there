import type { Bartender } from './types';

export interface StoreStatus {
  loading: boolean;
  error?: string;
}

/**
 * Storage backend. The app only talks to this interface: `createLocalStore` keeps data on this
 * device, `createSupabaseStore` shares it with the crew.
 */
export interface BartenderStore {
  getAll(): Bartender[];
  getStatus(): StoreStatus;
  save(bartender: Bartender): void;
  remove(id: string): void;
  /** Merge in bartenders from an export or another store; returns how many were added or updated. */
  importMany(bartenders: Bartender[]): number;
  refresh(): void;
  subscribe(listener: () => void): () => void;
  dispose?(): void;
}

const STORAGE_KEY = 'hybt:bartenders:v1';
const READY: StoreStatus = { loading: false };

export function createLocalStore(storage: Storage = window.localStorage): BartenderStore {
  const listeners = new Set<() => void>();
  let cache: Bartender[] = read();

  function read(): Bartender[] {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Bartender[]) : [];
    } catch {
      return [];
    }
  }

  function commit(next: Bartender[]) {
    cache = next;
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
    listeners.forEach((l) => l());
  }

  // Keep multiple open tabs in sync.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        cache = read();
        listeners.forEach((l) => l());
      }
    });
  }

  return {
    getAll: () => cache,
    getStatus: () => READY,
    save(bartender) {
      const stamped = { ...bartender, updatedAt: new Date().toISOString() };
      const exists = cache.some((b) => b.id === bartender.id);
      commit(exists ? cache.map((b) => (b.id === bartender.id ? stamped : b)) : [stamped, ...cache]);
    },
    remove(id) {
      commit(cache.filter((b) => b.id !== id));
    },
    importMany(bartenders) {
      const changed = newerThanCurrent(cache, bartenders);
      if (changed.length > 0) commit(mergeBartenders(cache, changed));
      return changed.length;
    },
    refresh() {},
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** The incoming bartenders that are new, or newer than the version we already have. */
export function newerThanCurrent(current: Bartender[], incoming: Bartender[]): Bartender[] {
  const byId = new Map(current.map((b) => [b.id, b]));
  return incoming.filter((b) => {
    const existing = byId.get(b.id);
    return !existing || b.updatedAt > existing.updatedAt;
  });
}

/** Merge an imported list into the current one; newest `updatedAt` wins per bartender. */
export function mergeBartenders(current: Bartender[], incoming: Bartender[]): Bartender[] {
  const byId = new Map(current.map((b) => [b.id, b]));
  for (const b of newerThanCurrent(current, incoming)) byId.set(b.id, b);
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function isBartenderList(value: unknown): value is Bartender[] {
  return (
    Array.isArray(value) &&
    value.every(
      (b) =>
        b &&
        typeof b.id === 'string' &&
        typeof b.name === 'string' &&
        b.bar &&
        typeof b.bar.name === 'string' &&
        Array.isArray(b.sightings) &&
        Array.isArray(b.recommendations),
    )
  );
}
