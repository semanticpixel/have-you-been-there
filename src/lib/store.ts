import { useSyncExternalStore } from 'react';
import type { Bartender } from './types';
import { createLocalStore, type BartenderStore, type StoreStatus } from './storage';

export { isBartenderList } from './storage';

/** Bartenders saved on this device. Used when Supabase isn't configured, and as the source for "upload to crew". */
export const deviceStore = createLocalStore();

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
let active: BartenderStore = deviceStore;
let unsubscribeActive = active.subscribe(notify);

/** Point the whole app at a different backend (e.g. once you've picked a crew). */
export function setActiveStore(next: BartenderStore) {
  if (next === active) return;
  unsubscribeActive();
  active.dispose?.();
  active = next;
  unsubscribeActive = active.subscribe(notify);
  notify();
}

/** The store the app is currently using. */
export const store: BartenderStore = {
  getAll: () => active.getAll(),
  getStatus: () => active.getStatus(),
  save: (b) => active.save(b),
  remove: (id) => active.remove(id),
  importMany: (bs) => active.importMany(bs),
  refresh: () => active.refresh(),
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useBartenders(): Bartender[] {
  return useSyncExternalStore(store.subscribe, store.getAll);
}

export function useBartender(id: string | undefined): Bartender | undefined {
  const all = useBartenders();
  return all.find((b) => b.id === id);
}

export function useStoreStatus(): StoreStatus {
  return useSyncExternalStore(store.subscribe, store.getStatus);
}
