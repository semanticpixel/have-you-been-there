import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { store, useBartender } from '../lib/store';
import { useMyName } from '../lib/settings';
import type { Bartender, Place } from '../lib/types';
import { newId, today } from '../lib/util';
import { PlaceInput } from '../components/PlaceInput';
import { VibePicker } from '../components/VibePicker';

export function BartenderFormPage() {
  const { id } = useParams();
  const existing = useBartender(id);
  const myName = useMyName();
  const navigate = useNavigate();

  if (id && !existing) return <p className="empty">Bartender not found.</p>;
  // Key on id so switching between edit/new resets the form state.
  return <BartenderForm key={id ?? 'new'} existing={existing} defaultMetBy={myName} onDone={(b) => navigate(`/bartenders/${b.id}`, { replace: true })} />;
}

function BartenderForm({
  existing,
  defaultMetBy,
  onDone,
}: {
  existing?: Bartender;
  defaultMetBy: string;
  onDone: (b: Bartender) => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [pronunciation, setPronunciation] = useState(existing?.pronunciation ?? '');
  const [bar, setBar] = useState<Place | undefined>(existing?.bar);
  const [appearance, setAppearance] = useState(existing?.appearance ?? '');
  const [vibe, setVibe] = useState<string[]>(existing?.vibe ?? []);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [metOn, setMetOn] = useState(existing?.metOn ?? today());
  const [metBy, setMetBy] = useState(existing?.metBy ?? defaultMetBy);
  const [favorite, setFavorite] = useState(existing?.favorite ?? false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !bar?.name.trim()) return;
    const now = new Date().toISOString();
    const bartender: Bartender = {
      id: existing?.id ?? newId(),
      sightings: existing?.sightings ?? [],
      recommendations: existing?.recommendations ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      name: name.trim(),
      pronunciation: pronunciation.trim() || undefined,
      bar: { ...bar, name: bar.name.trim() },
      appearance: appearance.trim() || undefined,
      vibe,
      notes: notes.trim() || undefined,
      metOn,
      metBy: metBy.trim() || undefined,
      favorite,
    };
    store.save(bartender);
    onDone(bartender);
  }

  return (
    <form className="page form" onSubmit={submit}>
      <h1>{existing ? `Edit ${existing.name}` : 'Met someone new 🍸'}</h1>

      <label>
        Name*
        <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus={!existing} placeholder="Siobhan" />
      </label>
      <label>
        How to say it
        <input value={pronunciation} onChange={(e) => setPronunciation(e.target.value)} placeholder="shiv-AWN" />
      </label>

      <label>
        Where they work*
        <PlaceInput value={bar} onChange={setBar} placeholder="Search for the bar…" required />
      </label>

      <label>
        What they look like
        <textarea
          value={appearance}
          onChange={(e) => setAppearance(e.target.value)}
          rows={2}
          placeholder="Curly red hair, sleeve tattoo of koi fish, round glasses"
        />
      </label>

      <fieldset>
        <legend>Vibe</legend>
        <VibePicker value={vibe} onChange={setVibe} />
      </fieldset>

      <label>
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="From Dublin, into climbing, works Thu–Sat nights"
        />
      </label>

      <div className="grid-2">
        <label>
          Met on
          <input type="date" value={metOn} onChange={(e) => setMetOn(e.target.value)} max={today()} required />
        </label>
        <label>
          Met by
          <input value={metBy} onChange={(e) => setMetBy(e.target.value)} placeholder="Who in the crew" />
        </label>
      </div>

      <label className="checkbox">
        <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} /> ★ Favorite
      </label>

      <div className="actions">
        <button type="button" onClick={() => history.back()}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={!name.trim() || !bar?.name.trim()}>
          {existing ? 'Save' : 'Add bartender'}
        </button>
      </div>
      {!existing && <p className="muted small">Add their recommendations on the next screen.</p>}
    </form>
  );
}
