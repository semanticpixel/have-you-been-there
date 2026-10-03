import { Link } from 'react-router-dom';
import type { Bartender } from '../lib/types';
import { formatDate, lastSeen } from '../lib/util';

export function BartenderCard({ bartender: b, showBar = true }: { bartender: Bartender; showBar?: boolean }) {
  return (
    <Link to={`/bartenders/${b.id}`} className="card bartender-card">
      <div className="avatar" aria-hidden>
        {b.name.trim().charAt(0).toUpperCase()}
      </div>
      <div className="grow">
        <div className="row">
          <strong className="name">{b.name}</strong>
          {b.favorite && <span title="Favorite">★</span>}
          {b.pronunciation && <small className="muted">“{b.pronunciation}”</small>}
        </div>
        {showBar && <div className="muted">{b.bar.name}</div>}
        {b.appearance && <div className="appearance">{b.appearance}</div>}
        {b.vibe.length > 0 && (
          <div className="tags">
            {b.vibe.map((v) => (
              <span key={v} className="tag">
                {v}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="meta">
        <small>Seen {formatDate(lastSeen(b))}</small>
        {b.recommendations.length > 0 && <small>{b.recommendations.length} rec{b.recommendations.length > 1 && 's'}</small>}
      </div>
    </Link>
  );
}
