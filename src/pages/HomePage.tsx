import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBartenders } from '../lib/store';
import { barsNear, groupByBar } from '../lib/bars';
import { useGeolocation } from '../lib/geo';
import { formatDistance, lastSeen, matchesQuery } from '../lib/util';
import { BartenderCard } from '../components/BartenderCard';

type Sort = 'recent' | 'name' | 'favorites';
const NEARBY_METERS = 250;

export function HomePage() {
  const bartenders = useBartenders();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const { state: geo, locate } = useGeolocation();

  const results = useMemo(() => {
    const filtered = bartenders.filter((b) => matchesQuery(b, query) && (sort !== 'favorites' || b.favorite));
    return filtered.sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : lastSeen(b).localeCompare(lastSeen(a))));
  }, [bartenders, query, sort]);

  const nearby = useMemo(
    () => (geo.status === 'ready' ? barsNear(groupByBar(bartenders), geo.coords, NEARBY_METERS) : []),
    [bartenders, geo],
  );

  return (
    <div className="page">
      <header className="hero">
        <h1>Have You Been There?</h1>
        <p className="muted">Never blank on a bartender's name again.</p>
      </header>

      <section className="card here-now">
        <div className="row spread">
          <div>
            <strong>At a bar right now?</strong>
            <div className="muted">See who you already know here.</div>
          </div>
          <button onClick={locate} disabled={geo.status === 'locating'}>
            {geo.status === 'locating' ? 'Locating…' : '📍 Who works here?'}
          </button>
        </div>
        {geo.status === 'error' && <p className="error">{geo.message}</p>}
        {geo.status === 'ready' &&
          (nearby.length === 0 ? (
            <p className="muted">
              No bars you've logged within {NEARBY_METERS} m. <Link to="/bartenders/new">Meet someone new?</Link>
            </p>
          ) : (
            <ul className="nearby">
              {nearby.map(({ bar, distance }) => (
                <li key={bar.key}>
                  <Link to={`/bars/${encodeURIComponent(bar.key)}`}>
                    <strong>{bar.place.name}</strong> <small className="muted">{formatDistance(distance)}</small>
                  </Link>
                  <div>{bar.bartenders.map((b) => b.name).join(' · ')}</div>
                </li>
              ))}
            </ul>
          ))}
      </section>

      <div className="toolbar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search names, bars, “tattoos”, “mezcal”…"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
          <option value="recent">Recent</option>
          <option value="name">A–Z</option>
          <option value="favorites">★ Favorites</option>
        </select>
      </div>

      {bartenders.length === 0 ? (
        <div className="empty">
          <p>No bartenders yet.</p>
          <Link className="button primary" to="/bartenders/new">
            Log the first one
          </Link>
        </div>
      ) : results.length === 0 ? (
        <p className="empty">No one matches “{query}”.</p>
      ) : (
        <div className="list">
          {results.map((b) => (
            <BartenderCard key={b.id} bartender={b} />
          ))}
        </div>
      )}
    </div>
  );
}
