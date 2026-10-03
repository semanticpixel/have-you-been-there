import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useBartenders } from '../lib/store';
import { groupByBar } from '../lib/bars';
import { formatDate } from '../lib/util';

export function BarsPage() {
  const bartenders = useBartenders();
  const bars = useMemo(() => groupByBar(bartenders), [bartenders]);

  return (
    <div className="page">
      <h1>Bars</h1>
      {bars.length === 0 ? (
        <p className="empty">Bars show up here once you log a bartender.</p>
      ) : (
        <div className="list">
          {bars.map((bar) => (
            <Link key={bar.key} to={`/bars/${encodeURIComponent(bar.key)}`} className="card">
              <div className="row spread">
                <strong>{bar.place.name}</strong>
                <small className="muted">Last visit {formatDate(bar.lastVisit)}</small>
              </div>
              {bar.place.address && <div className="muted small">{bar.place.address}</div>}
              <div>{bar.bartenders.map((b) => b.name).join(' · ')}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
