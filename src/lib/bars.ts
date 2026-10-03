import type { Bartender, Place } from './types';
import { distanceMeters, hasCoords, lastSeen, placeKey } from './util';

export interface Bar {
  key: string;
  place: Place;
  bartenders: Bartender[];
  lastVisit: string;
}

/** Group bartenders by the bar we met them at. */
export function groupByBar(bartenders: Bartender[]): Bar[] {
  const bars = new Map<string, Bar>();
  for (const b of bartenders) {
    const key = placeKey(b.bar);
    const bar = bars.get(key) ?? { key, place: b.bar, bartenders: [], lastVisit: '' };
    bar.bartenders.push(b);
    const seen = lastSeen(b);
    if (seen > bar.lastVisit) bar.lastVisit = seen;
    // Prefer a version of the place that has coordinates.
    if (!hasCoords(bar.place) && hasCoords(b.bar)) bar.place = b.bar;
    bars.set(key, bar);
  }
  return [...bars.values()].sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
}

export function barsNear(bars: Bar[], here: { lat: number; lng: number }, withinMeters: number) {
  return bars
    .filter((bar) => hasCoords(bar.place))
    .map((bar) => ({ bar, distance: distanceMeters(here, bar.place as { lat: number; lng: number }) }))
    .filter((x) => x.distance <= withinMeters)
    .sort((a, b) => a.distance - b.distance);
}
