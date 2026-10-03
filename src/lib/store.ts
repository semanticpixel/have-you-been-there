import { useSyncExternalStore } from 'react';
import type { Bartender } from './types';
import { createLocalStore } from './storage';

export { isBartenderList, mergeBartenders } from './storage';

export const store = createLocalStore();

export function useBartenders(): Bartender[] {
  return useSyncExternalStore(store.subscribe, store.getAll);
}

export function useBartender(id: string | undefined): Bartender | undefined {
  const all = useBartenders();
  return all.find((b) => b.id === id);
}
