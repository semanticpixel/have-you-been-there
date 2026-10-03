import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { store, useBartender } from '../lib/store';
import { RECOMMENDATION_KINDS, type Bartender, type Recommendation } from '../lib/types';
import { formatDate, mapsUrl, newId, placeKey, today } from '../lib/util';
import { RecommendationForm } from '../components/RecommendationForm';

export function BartenderDetailPage() {
  const { id } = useParams();
  const b = useBartender(id);
  const navigate = useNavigate();
  const [addingRec, setAddingRec] = useState(false);
  const [sightingNote, setSightingNote] = useState('');

  if (!b) return <p className="empty">Bartender not found.</p>;

  const update = (patch: Partial<Bartender>) => store.save({ ...b, ...patch });
  const updateRec = (recId: string, patch: Partial<Recommendation>) =>
    update({ recommendations: b.recommendations.map((r) => (r.id === recId ? { ...r, ...patch } : r)) });

  const sightings = [...b.sightings].sort((x, y) => y.date.localeCompare(x.date));
  const sawToday = b.metOn === today() || b.sightings.some((s) => s.date === today());

  return (
    <div className="page">
      <header className="detail-header">
        <div className="avatar large" aria-hidden>
          {b.name.charAt(0).toUpperCase()}
        </div>
        <div className="grow">
          <h1>
            {b.name}{' '}
            <button
              className="icon"
              aria-label={b.favorite ? 'Unfavorite' : 'Favorite'}
              onClick={() => update({ favorite: !b.favorite })}
            >
              {b.favorite ? '★' : '☆'}
            </button>
          </h1>
          {b.pronunciation && <div className="muted">Say it: “{b.pronunciation}”</div>}
          <Link to={`/bars/${encodeURIComponent(placeKey(b.bar))}`}>{b.bar.name}</Link>
          {b.bar.address && <div className="muted small">{b.bar.address}</div>}
        </div>
        <Link className="button" to={`/bartenders/${b.id}/edit`}>
          Edit
        </Link>
      </header>

      {b.appearance && (
        <section>
          <h2>Looks like</h2>
          <p>{b.appearance}</p>
        </section>
      )}
      {b.vibe.length > 0 && (
        <section>
          <h2>Vibe</h2>
          <div className="tags">
            {b.vibe.map((v) => (
              <span key={v} className="tag">
                {v}
              </span>
            ))}
          </div>
        </section>
      )}
      {b.notes && (
        <section>
          <h2>Notes</h2>
          <p className="pre">{b.notes}</p>
        </section>
      )}

      <section>
        <div className="row spread">
          <h2>Recommendations</h2>
          {!addingRec && <button onClick={() => setAddingRec(true)}>＋ Add</button>}
        </div>
        {addingRec && (
          <RecommendationForm
            onCancel={() => setAddingRec(false)}
            onAdd={(r) => {
              update({ recommendations: [r, ...b.recommendations] });
              setAddingRec(false);
            }}
          />
        )}
        {b.recommendations.length === 0 && !addingRec && <p className="muted">None yet — ask them where they drink on their night off.</p>}
        <ul className="recs">
          {b.recommendations.map((r) => {
            const kind = RECOMMENDATION_KINDS.find((k) => k.value === r.kind);
            return (
              <li key={r.id} className={`card rec ${r.tried ? 'tried' : ''}`}>
                <span className="rec-emoji" title={kind?.label}>
                  {kind?.emoji}
                </span>
                <div className="grow">
                  <strong>{r.title}</strong>
                  {r.place && r.place.name !== r.title && <div className="muted">@ {r.place.name}</div>}
                  {r.notes && <div className="small">{r.notes}</div>}
                  {r.place && (
                    <a className="small" href={mapsUrl(r.place)} target="_blank" rel="noreferrer">
                      Open in Google Maps ↗
                    </a>
                  )}
                </div>
                <div className="rec-actions">
                  <label className="checkbox small">
                    <input type="checkbox" checked={r.tried} onChange={(e) => updateRec(r.id, { tried: e.target.checked })} />
                    Tried
                  </label>
                  <button
                    className="icon"
                    aria-label="Remove recommendation"
                    onClick={() => confirm(`Remove “${r.title}”?`) && update({ recommendations: b.recommendations.filter((x) => x.id !== r.id) })}
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2>History</h2>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            update({ sightings: [...b.sightings, { id: newId(), date: today(), note: sightingNote.trim() || undefined }] });
            setSightingNote('');
          }}
        >
          <input value={sightingNote} onChange={(e) => setSightingNote(e.target.value)} placeholder="Note (optional)" />
          <button type="submit" className="primary" disabled={sawToday && !sightingNote.trim()}>
            👋 Saw them today
          </button>
        </form>
        <ul className="timeline">
          {sightings.map((s) => (
            <li key={s.id}>
              <span>{formatDate(s.date)}</span>
              {s.note && <span className="muted"> — {s.note}</span>}
              <button
                className="icon small"
                aria-label="Remove visit"
                onClick={() => update({ sightings: b.sightings.filter((x) => x.id !== s.id) })}
              >
                ✕
              </button>
            </li>
          ))}
          <li>
            <span>{formatDate(b.metOn)}</span>
            <span className="muted"> — first met{b.metBy ? ` (${b.metBy})` : ''}</span>
          </li>
        </ul>
      </section>

      <div className="danger-zone">
        <button
          className="danger"
          onClick={() => {
            if (confirm(`Delete ${b.name}? This can't be undone.`)) {
              store.remove(b.id);
              navigate('/', { replace: true });
            }
          }}
        >
          Delete bartender
        </button>
      </div>
    </div>
  );
}
