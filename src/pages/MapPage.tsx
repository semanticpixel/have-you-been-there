import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdvancedMarker, InfoWindow, Map, Pin, useMap } from '@vis.gl/react-google-maps';
import { useBartenders } from '../lib/store';
import { groupByBar } from '../lib/bars';
import { MAP_ID, mapsEnabled } from '../lib/maps';
import { RECOMMENDATION_KINDS, type Place } from '../lib/types';
import { hasCoords, mapsUrl } from '../lib/util';

interface MapPoint {
  id: string;
  kind: 'bar' | 'rec';
  place: Place & { lat: number; lng: number };
  title: string;
  lines: { text: string; to?: string }[];
}

export function MapPage() {
  const bartenders = useBartenders();
  const [show, setShow] = useState({ bar: true, rec: true });
  const [selected, setSelected] = useState<MapPoint>();

  const points = useMemo<MapPoint[]>(() => {
    const bars: MapPoint[] = groupByBar(bartenders).flatMap((bar) =>
      hasCoords(bar.place)
        ? [
            {
              id: bar.key,
              kind: 'bar',
              place: bar.place,
              title: bar.place.name,
              lines: bar.bartenders.map((b) => ({ text: b.name, to: `/bartenders/${b.id}` })),
            },
          ]
        : [],
    );
    const recs: MapPoint[] = bartenders.flatMap((b) =>
      b.recommendations.flatMap((r) =>
        hasCoords(r.place)
          ? [
              {
                id: `rec:${r.id}`,
                kind: 'rec' as const,
                place: r.place,
                title: `${RECOMMENDATION_KINDS.find((k) => k.value === r.kind)?.emoji ?? ''} ${r.title}`,
                lines: [{ text: `Recommended by ${b.name}${r.tried ? ' · tried ✓' : ''}`, to: `/bartenders/${b.id}` }],
              },
            ]
          : [],
      ),
    );
    return [...bars, ...recs];
  }, [bartenders]);

  const visible = points.filter((p) => show[p.kind]);

  if (!mapsEnabled) {
    return (
      <div className="page">
        <h1>Map</h1>
        <div className="card">
          <p>
            The map needs a Google Maps API key. Copy <code>.env.example</code> to <code>.env.local</code>, set{' '}
            <code>VITE_GOOGLE_MAPS_API_KEY</code>, and restart the dev server.
          </p>
          <p className="muted small">Everything else works without it — places are just typed in by hand.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page map-page">
      <div className="row spread">
        <h1>Map</h1>
        <div className="row">
          <label className="checkbox small">
            <input type="checkbox" checked={show.bar} onChange={(e) => setShow({ ...show, bar: e.target.checked })} />
            <span className="dot bar" /> Bars
          </label>
          <label className="checkbox small">
            <input type="checkbox" checked={show.rec} onChange={(e) => setShow({ ...show, rec: e.target.checked })} />
            <span className="dot rec" /> Recs
          </label>
        </div>
      </div>
      <div className="map-wrap">
        <Map
          mapId={MAP_ID}
          defaultCenter={{ lat: 40.73, lng: -73.99 }}
          defaultZoom={12}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          colorScheme="DARK"
          onClick={() => setSelected(undefined)}
        >
          <FitBounds points={visible} />
          {visible.map((p) => (
            <AdvancedMarker key={p.id} position={p.place} title={p.title} onClick={() => setSelected(p)}>
              {p.kind === 'bar' ? (
                <Pin background="#f2a541" borderColor="#8a5a14" glyphColor="#16120f" />
              ) : (
                <Pin background="#5ec2b7" borderColor="#25665f" glyphColor="#16120f" />
              )}
            </AdvancedMarker>
          ))}
          {selected && (
            <InfoWindow position={selected.place} onCloseClick={() => setSelected(undefined)} pixelOffset={[0, -36]}>
              <div className="info">
                <strong>{selected.title}</strong>
                {selected.lines.map((l, i) => (
                  <div key={i}>{l.to ? <Link to={l.to}>{l.text}</Link> : l.text}</div>
                ))}
                <a href={mapsUrl(selected.place)} target="_blank" rel="noreferrer">
                  Directions ↗
                </a>
              </div>
            </InfoWindow>
          )}
        </Map>
      </div>
      {points.length === 0 && <p className="muted small">Pick places from Google search when logging bartenders and recs to see them here.</p>}
    </div>
  );
}

/** Zoom the map to fit all markers whenever the set of markers changes. */
function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const signature = points.map((p) => p.id).join('|');
  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.setCenter(points[0].place);
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p.place));
    map.fitBounds(bounds, 48);
  }, [map, signature]); // points is captured via signature
  return null;
}
