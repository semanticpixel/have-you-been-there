import type { Bartender } from './types';

/**
 * Storage backend. The app only talks to this interface, so swapping localStorage for a shared
 * backend (Supabase/Firebase) later — so the whole crew sees the same list — is a contained change.
 */
export interface BartenderStore {
  getAll(): Bartender[];
  save(bartender: Bartender): void;
  remove(id: string): void;
  replaceAll(bartenders: Bartender[]): void;
  subscribe(listener: () => void): () => void;
}

const STORAGE_KEY = 'hybt:bartenders:v1';

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
    save(bartender) {
      const stamped = { ...bartender, updatedAt: new Date().toISOString() };
      const exists = cache.some((b) => b.id === bartender.id);
      commit(exists ? cache.map((b) => (b.id === bartender.id ? stamped : b)) : [stamped, ...cache]);
    },
    remove(id) {
      commit(cache.filter((b) => b.id !== id));
    },
    replaceAll(bartenders) {
      commit(bartenders);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Merge an imported list into the current one; newest `updatedAt` wins per bartender. */
export function mergeBartenders(current: Bartender[], incoming: Bartender[]): Bartender[] {
  const byId = new Map(current.map((b) => [b.id, b]));
  for (const b of incoming) {
    const existing = byId.get(b.id);
    if (!existing || b.updatedAt > existing.updatedAt) byId.set(b.id, b);
  }
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
