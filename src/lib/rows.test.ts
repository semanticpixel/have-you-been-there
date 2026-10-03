import { describe, expect, it } from 'vitest';
import type { Bartender } from './types';
import { fromRow, planSave, toBartenderRow, type BartenderWithChildren } from './rows';

const CREW = 'crew-1';

function bartender(overrides: Partial<Bartender> = {}): Bartender {
  return {
    id: 'b1',
    name: 'Siobhan',
    bar: { name: 'The Dead Rabbit', placeId: 'abc', lat: 40.7, lng: -74 },
    vibe: ['Chatty'],
    metOn: '2026-09-01',
    favorite: false,
    sightings: [{ id: 's1', date: '2026-09-10' }],
    recommendations: [{ id: 'r1', kind: 'drink', title: 'Mezcal negroni', tried: false, createdAt: '2026-09-01T00:00:00Z' }],
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

describe('planSave', () => {
  it('writes everything for a new bartender', () => {
    const plan = planSave(undefined, bartender(), CREW);
    expect(plan.bartender).toMatchObject({ id: 'b1', crew_id: CREW, met_on: '2026-09-01', pronunciation: null });
    expect(plan.upsertSightings).toEqual([{ id: 's1', bartender_id: 'b1', crew_id: CREW, date: '2026-09-10', note: null }]);
    expect(plan.upsertRecommendations).toHaveLength(1);
    expect(plan.deleteSightingIds).toEqual([]);
  });

  it('only writes the rec that changed, not the bartender row', () => {
    const prev = bartender();
    const next = { ...prev, updatedAt: 'later', recommendations: [{ ...prev.recommendations[0], tried: true }] };
    const plan = planSave(prev, next, CREW);
    expect(plan.bartender).toBeUndefined();
    expect(plan.upsertSightings).toEqual([]);
    expect(plan.upsertRecommendations).toEqual([expect.objectContaining({ id: 'r1', tried: true })]);
  });

  it('adds new sightings and deletes removed ones', () => {
    const prev = bartender();
    const next = { ...prev, sightings: [{ id: 's2', date: '2026-10-01', note: 'Birthday' }] };
    const plan = planSave(prev, next, CREW);
    expect(plan.upsertSightings.map((s) => s.id)).toEqual(['s2']);
    expect(plan.deleteSightingIds).toEqual(['s1']);
    expect(plan.deleteRecommendationIds).toEqual([]);
  });

  it('rewrites the bartender row when a field changes', () => {
    const prev = bartender();
    expect(planSave(prev, { ...prev, favorite: true }, CREW).bartender?.favorite).toBe(true);
  });
});

describe('row mapping', () => {
  it('round-trips through database rows', () => {
    const b = bartender({ pronunciation: 'shiv-AWN', sightings: [{ id: 's2', date: '2026-09-20' }, { id: 's1', date: '2026-09-10' }] });
    const plan = planSave(undefined, b, CREW);
    const row: BartenderWithChildren = {
      ...toBartenderRow(b, CREW),
      updated_at: b.updatedAt,
      sightings: plan.upsertSightings,
      recommendations: plan.upsertRecommendations,
    };
    const back = fromRow(row);
    expect(back).toEqual({ ...b, sightings: [{ id: 's1', date: '2026-09-10' }, { id: 's2', date: '2026-09-20' }] });
  });
});
