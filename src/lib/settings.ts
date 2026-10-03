import { useSyncExternalStore } from 'react';

const NAME_KEY = 'hybt:myName';
const listeners = new Set<() => void>();

export function getMyName(): string {
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function setMyName(name: string) {
  localStorage.setItem(NAME_KEY, name.trim());
  listeners.forEach((l) => l());
}

export function useMyName(): string {
  return useSyncExternalStore((l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  }, getMyName);
}
