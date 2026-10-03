/** A real-world location. `placeId` and coordinates come from Google Places when available. */
export interface Place {
  name: string;
  address?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
}

export type RecommendationKind = 'drink' | 'bar' | 'food' | 'other';

export interface Recommendation {
  id: string;
  kind: RecommendationKind;
  title: string;
  /** Where to find it — for a bar/food rec this is the spot itself. */
  place?: Place;
  notes?: string;
  tried: boolean;
  createdAt: string;
}

/** A return visit where we saw this bartender again. */
export interface Sighting {
  id: string;
  date: string; // YYYY-MM-DD
  note?: string;
}

export interface Bartender {
  id: string;
  name: string;
  /** How to say it, e.g. "SHEV-on". Saves embarrassment next time. */
  pronunciation?: string;
  bar: Place;
  /** Free-text description so we can recognise them again. */
  appearance?: string;
  vibe: string[];
  notes?: string;
  metOn: string; // YYYY-MM-DD
  /** Which of us met them first. */
  metBy?: string;
  favorite: boolean;
  sightings: Sighting[];
  recommendations: Recommendation[];
  createdAt: string;
  updatedAt: string;
}

export const VIBE_OPTIONS = [
  'Friendly',
  'Chatty',
  'Funny',
  'Chill',
  'Cocktail nerd',
  'Heavy pour',
  'Fast',
  'Remembers us',
  'Gives recs',
  'Flirty',
  'No-nonsense',
] as const;

export const RECOMMENDATION_KINDS: { value: RecommendationKind; label: string; emoji: string }[] = [
  { value: 'drink', label: 'Drink', emoji: '🍹' },
  { value: 'bar', label: 'Bar', emoji: '🍻' },
  { value: 'food', label: 'Food', emoji: '🌮' },
  { value: 'other', label: 'Other', emoji: '✨' },
];
