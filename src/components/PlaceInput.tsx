import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { Place } from '../lib/types';
import { mapsEnabled } from '../lib/maps';

interface Props {
  value: Place | undefined;
  onChange: (place: Place | undefined) => void;
  placeholder?: string;
  required?: boolean;
}

/** Pick a place with Google Places autocomplete, or type it in by hand when Maps isn't configured. */
export function PlaceInput(props: Props) {
  return mapsEnabled ? <GooglePlaceInput {...props} /> : <ManualPlaceInput {...props} />;
}

function ManualPlaceInput({ value, onChange, placeholder, required }: Props) {
  return (
    <div className="place-manual">
      <input
        value={value?.name ?? ''}
        placeholder={placeholder ?? 'Place name'}
        required={required}
        onChange={(e) => onChange(e.target.value ? { ...value, name: e.target.value } : undefined)}
      />
      <input
        value={value?.address ?? ''}
        placeholder="Address or neighborhood (optional)"
        onChange={(e) => value && onChange({ ...value, address: e.target.value || undefined })}
        disabled={!value}
      />
    </div>
  );
}

function GooglePlaceInput({ value, onChange, placeholder, required }: Props) {
  const places = useMapsLibrary('places');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.PlacePrediction[]>([]);
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState(false);
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | undefined>(undefined);

  useEffect(() => {
    if (!places || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    sessionToken.current ??= new places.AutocompleteSessionToken();
    const timer = setTimeout(async () => {
      try {
        const res = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: sessionToken.current,
        });
        if (!cancelled) {
          setSuggestions(res.suggestions.flatMap((s) => (s.placePrediction ? [s.placePrediction] : [])));
          setError(undefined);
        }
      } catch (e) {
        if (!cancelled) setError('Place search failed — check that "Places API (New)" is enabled for your key.');
        console.error(e);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [places, query]);

  async function pick(prediction: google.maps.places.PlacePrediction) {
    const place = prediction.toPlace();
    await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location'] });
    sessionToken.current = undefined; // a pick ends the billing session
    onChange({
      name: place.displayName ?? prediction.mainText?.text ?? prediction.text.text,
      address: place.formattedAddress ?? undefined,
      placeId: place.id,
      lat: place.location?.lat(),
      lng: place.location?.lng(),
    });
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  }

  if (value) {
    return (
      <div className="place-chip">
        <div>
          <strong>{value.name}</strong>
          {value.address && <small>{value.address}</small>}
        </div>
        <button type="button" className="link" onClick={() => onChange(undefined)}>
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="place-search">
      <input
        value={query}
        placeholder={placeholder ?? 'Search Google Maps…'}
        required={required}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && query.trim().length >= 2 && (
        <ul className="suggestions" role="listbox">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)}>
                <strong>{s.mainText?.text ?? s.text.text}</strong>
                {s.secondaryText && <small>{s.secondaryText.text}</small>}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="muted"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange({ name: query.trim() });
                setQuery('');
                setOpen(false);
              }}
            >
              Use “{query.trim()}” without a map location
            </button>
          </li>
        </ul>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
