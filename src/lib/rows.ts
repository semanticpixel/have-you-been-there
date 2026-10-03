import type { Bartender, Place, Recommendation, RecommendationKind, Sighting } from './types';

/** Database row shapes (see supabase/migrations). */
export interface BartenderRow {
  id: string;
  crew_id: string;
  name: string;
  pronunciation: string | null;
  bar: Place;
  appearance: string | null;
  vibe: string[];
  notes: string | null;
  met_on: string;
  met_by: string | null;
  favorite: boolean;
  created_at: string;
}

export interface SightingRow {
  id: string;
  bartender_id: string;
  crew_id: string;
  date: string;
  note: string | null;
}

export interface RecommendationRow {
  id: string;
  bartender_id: string;
  crew_id: string;
  kind: RecommendationKind;
  title: string;
  place: Place | null;
  notes: string | null;
  tried: boolean;
  created_at: string;
}

export type BartenderWithChildren = BartenderRow & {
  updated_at: string;
  sightings: SightingRow[];
  recommendations: RecommendationRow[];
};

export function fromRow(row: BartenderWithChildren): Bartender {
  return {
    id: row.id,
    name: row.name,
    pronunciation: row.pronunciation ?? undefined,
    bar: row.bar,
    appearance: row.appearance ?? undefined,
    vibe: row.vibe,
    notes: row.notes ?? undefined,
    metOn: row.met_on,
    metBy: row.met_by ?? undefined,
    favorite: row.favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sightings: row.sightings
      .map((s): Sighting => ({ id: s.id, date: s.date, note: s.note ?? undefined }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    recommendations: row.recommendations
      .map(
        (r): Recommendation => ({
          id: r.id,
          kind: r.kind,
          title: r.title,
          place: r.place ?? undefined,
          notes: r.notes ?? undefined,
          tried: r.tried,
          createdAt: r.created_at,
        }),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export function toBartenderRow(b: Bartender, crewId: string): BartenderRow {
  return {
    id: b.id,
    crew_id: crewId,
    name: b.name,
    pronunciation: b.pronunciation ?? null,
    bar: b.bar,
    appearance: b.appearance ?? null,
    vibe: b.vibe,
    notes: b.notes ?? null,
    met_on: b.metOn,
    met_by: b.metBy ?? null,
    favorite: b.favorite,
    created_at: b.createdAt,
  };
}

function toSightingRow(s: Sighting, bartenderId: string, crewId: string): SightingRow {
  return { id: s.id, bartender_id: bartenderId, crew_id: crewId, date: s.date, note: s.note ?? null };
}

function toRecommendationRow(r: Recommendation, bartenderId: string, crewId: string): RecommendationRow {
  return {
    id: r.id,
    bartender_id: bartenderId,
    crew_id: crewId,
    kind: r.kind,
    title: r.title,
    place: r.place ?? null,
    notes: r.notes ?? null,
    tried: r.tried,
    created_at: r.createdAt,
  };
}

export interface SavePlan {
  bartender?: BartenderRow;
  upsertSightings: SightingRow[];
  deleteSightingIds: string[];
  upsertRecommendations: RecommendationRow[];
  deleteRecommendationIds: string[];
}

/**
 * Work out the smallest set of writes to go from `prev` to `next`. Writing only what changed means
 * two friends ticking different recs (or logging a sighting) at the same time don't overwrite each other.
 */
export function planSave(prev: Bartender | undefined, next: Bartender, crewId: string): SavePlan {
  const row = toBartenderRow(next, crewId);
  const sightings = diff(prev?.sightings ?? [], next.sightings);
  const recs = diff(prev?.recommendations ?? [], next.recommendations);
  return {
    bartender: prev && sameJson(toBartenderRow(prev, crewId), row) ? undefined : row,
    upsertSightings: sightings.changed.map((s) => toSightingRow(s, next.id, crewId)),
    deleteSightingIds: sightings.removedIds,
    upsertRecommendations: recs.changed.map((r) => toRecommendationRow(r, next.id, crewId)),
    deleteRecommendationIds: recs.removedIds,
  };
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diff<T extends { id: string }>(prev: T[], next: T[]): { changed: T[]; removedIds: string[] } {
  const prevById = new Map(prev.map((p) => [p.id, p]));
  const nextIds = new Set(next.map((n) => n.id));
  return {
    changed: next.filter((n) => !prevById.has(n.id) || !sameJson(prevById.get(n.id), n)),
    removedIds: prev.filter((p) => !nextIds.has(p.id)).map((p) => p.id),
  };
}
