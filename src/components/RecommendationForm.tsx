import { useState, type FormEvent } from 'react';
import { RECOMMENDATION_KINDS, type Place, type Recommendation, type RecommendationKind } from '../lib/types';
import { newId } from '../lib/util';
import { PlaceInput } from './PlaceInput';

const TITLE_HINTS: Record<RecommendationKind, string> = {
  drink: 'Mezcal negroni',
  bar: 'The speakeasy behind the taco shop',
  food: 'Late-night birria',
  other: 'Jazz on Tuesdays',
};

export function RecommendationForm({ onAdd, onCancel }: { onAdd: (r: Recommendation) => void; onCancel: () => void }) {
  const [kind, setKind] = useState<RecommendationKind>('drink');
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState<Place>();
  const [notes, setNotes] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    // Picking a place for a bar/food rec is enough; use its name as the title.
    const finalTitle = title.trim() || place?.name;
    if (!finalTitle) return;
    onAdd({
      id: newId(),
      kind,
      title: finalTitle,
      place,
      notes: notes.trim() || undefined,
      tried: false,
      createdAt: new Date().toISOString(),
    });
  }

  const placeFirst = kind === 'bar' || kind === 'food';

  return (
    <form className="card form rec-form" onSubmit={submit}>
      <div className="segmented" role="radiogroup">
        {RECOMMENDATION_KINDS.map((k) => (
          <button
            type="button"
            key={k.value}
            role="radio"
            aria-checked={kind === k.value}
            className={kind === k.value ? 'on' : ''}
            onClick={() => setKind(k.value)}
          >
            {k.emoji} {k.label}
          </button>
        ))}
      </div>
      {!placeFirst && (
        <label>
          What
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={TITLE_HINTS[kind]} autoFocus />
        </label>
      )}
      <label>
        {placeFirst ? 'Where' : 'Where to get it (optional)'}
        <PlaceInput value={place} onChange={setPlace} placeholder="Search for the place…" />
      </label>
      {placeFirst && (
        <label>
          What to get there (optional)
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={TITLE_HINTS[kind]} />
        </label>
      )}
      <label>
        Notes
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ask for Marco, tell him Siobhan sent you" />
      </label>
      <div className="actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={!title.trim() && !place}>
          Add rec
        </button>
      </div>
    </form>
  );
}
