import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useBartenders } from '../lib/store';
import { groupByBar } from '../lib/bars';
import { mapsUrl } from '../lib/util';
import { BartenderCard } from '../components/BartenderCard';

export function BarDetailPage() {
  const { key } = useParams();
  const bartenders = useBartenders();
  const bar = useMemo(() => groupByBar(bartenders).find((b) => b.key === key), [bartenders, key]);

  if (!bar) return <p className="empty">Bar not found.</p>;

  return (
    <div className="page">
      <h1>{bar.place.name}</h1>
      {bar.place.address && <p className="muted">{bar.place.address}</p>}
      <a href={mapsUrl(bar.place)} target="_blank" rel="noreferrer">
        Open in Google Maps ↗
      </a>
      <h2>Who works here</h2>
      <div className="list">
        {bar.bartenders.map((b) => (
          <BartenderCard key={b.id} bartender={b} showBar={false} />
        ))}
      </div>
    </div>
  );
}
