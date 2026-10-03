import { describe, expect, it } from 'vitest';
import type { Bartender } from './types';
import { createLocalStore, isBartenderList, mergeBartenders } from './storage';
import { barsNear, groupByBar } from './bars';
import { distanceMeters, lastSeen, matchesQuery, placeKey } from './util';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

function bartender(overrides: Partial<Bartender> = {}): Bartender {
  return {
    id: crypto.randomUUID(),
    name: 'Siobhan',
    bar: { name: 'The Dead Rabbit', placeId: 'abc', lat: 40.7033, lng: -74.0111 },
    vibe: ['Chatty'],
    metOn: '2026-09-01',
    favorite: false,
    sightings: [],
    recommendations: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('matchesQuery', () => {
  const b = bartender({
    appearance: 'Red curly hair, koi tattoo',
    recommendations: [{ id: '1', kind: 'drink', title: 'Mezcal negroni', tried: false, createdAt: '' }],
  });
  it('matches across name, looks and recs, all terms required', () => {
    expect(matchesQuery(b, 'siob')).toBe(true);
    expect(matchesQuery(b, 'koi rabbit')).toBe(true);
    expect(matchesQuery(b, 'MEZCAL')).toBe(true);
    expect(matchesQuery(b, 'koi beard')).toBe(false);
    expect(matchesQuery(b, '  ')).toBe(true);
  });
});

describe('lastSeen', () => {
  it('uses the latest sighting, falling back to first meeting', () => {
    expect(lastSeen(bartender())).toBe('2026-09-01');
    expect(lastSeen(bartender({ sightings: [{ id: '1', date: '2026-09-20' }, { id: '2', date: '2026-09-10' }] }))).toBe('2026-09-20');
  });
});

describe('groupByBar / barsNear', () => {
  it('groups by place id, or by case-insensitive name without one', () => {
    const bars = groupByBar([
      bartender({ name: 'A' }),
      bartender({ name: 'B' }),
      bartender({ name: 'C', bar: { name: 'Joe’s Pub' } }),
      bartender({ name: 'D', bar: { name: '  joe’s pub ' } }),
    ]);
    expect(bars).toHaveLength(2);
    expect(bars.map((b) => b.bartenders.length).sort()).toEqual([2, 2]);
    expect(placeKey({ name: ' X ' })).toBe('name:x');
  });

  it('finds bars within range sorted by distance', () => {
    const near = bartender({ name: 'Near' });
    const far = bartender({ name: 'Far', bar: { name: 'Far bar', placeId: 'far', lat: 40.8, lng: -73.95 } });
    const noCoords = bartender({ name: 'Unknown', bar: { name: 'Mystery' } });
    const here = { lat: 40.7034, lng: -74.0112 };
    const result = barsNear(groupByBar([far, near, noCoords]), here, 250);
    expect(result.map((r) => r.bar.place.name)).toEqual(['The Dead Rabbit']);
    expect(distanceMeters(here, here)).toBe(0);
  });
});

describe('local store', () => {
  it('saves, updates, removes, and persists', () => {
    const storage = memoryStorage();
    const store = createLocalStore(storage);
    let notified = 0;
    store.subscribe(() => notified++);

    const b = bartender();
    store.save(b);
    store.save({ ...b, name: 'Siobhán' });
    expect(store.getAll()).toHaveLength(1);
    expect(store.getAll()[0].name).toBe('Siobhán');
    expect(createLocalStore(storage).getAll()[0].name).toBe('Siobhán');

    store.remove(b.id);
    expect(store.getAll()).toHaveLength(0);
    expect(notified).toBe(3);
  });
});

describe('import merge', () => {
  it('keeps the newest version of each bartender and adds new ones', () => {
    const mine = bartender({ id: 'x', name: 'Old', updatedAt: '2026-09-01T00:00:00Z' });
    const theirs = bartender({ id: 'x', name: 'New', updatedAt: '2026-09-02T00:00:00Z' });
    const extra = bartender({ id: 'y', name: 'Other' });
    const merged = mergeBartenders([mine], [theirs, extra]);
    expect(merged.map((b) => b.name).sort()).toEqual(['New', 'Other']);
    expect(mergeBartenders([theirs], [mine])[0].name).toBe('New');
  });

  it('validates import shape', () => {
    expect(isBartenderList([bartender()])).toBe(true);
    expect(isBartenderList([{ name: 'nope' }])).toBe(false);
    expect(isBartenderList({})).toBe(false);
  });
});
