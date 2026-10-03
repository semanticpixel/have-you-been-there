import type { Bartender, Place } from './types';

export function newId(): string {
  return crypto.randomUUID();
}

export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Stable key for grouping bartenders by bar: Google place ID if we have one, else the normalised name. */
export function placeKey(place: Place): string {
  return place.placeId ? `pid:${place.placeId}` : `name:${place.name.trim().toLowerCase()}`;
}

export function hasCoords(place?: Place): place is Place & { lat: number; lng: number } {
  return place?.lat != null && place?.lng != null;
}

/** Great-circle distance in metres. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Most recent date we saw this bartender (first meeting or a later sighting). */
export function lastSeen(b: Bartender): string {
  return b.sightings.reduce((latest, s) => (s.date > latest ? s.date : latest), b.metOn);
}

export function mapsUrl(place: Place): string {
  const params = new URLSearchParams({ api: '1', query: [place.name, place.address].filter(Boolean).join(', ') });
  if (place.placeId) params.set('query_place_id', place.placeId);
  return `https://www.google.com/maps/search/?${params}`;
}

/** Case-insensitive match across everything you'd remember about someone: name, bar, looks, vibe, recs. */
export function matchesQuery(b: Bartender, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = [
    b.name,
    b.pronunciation,
    b.bar.name,
    b.bar.address,
    b.appearance,
    b.notes,
    b.metBy,
    ...b.vibe,
    ...b.recommendations.flatMap((r) => [r.title, r.notes, r.place?.name]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return terms.every((t) => haystack.includes(t));
}
