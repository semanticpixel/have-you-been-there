import { useCallback, useState } from 'react';

export interface Coords {
  lat: number;
  lng: number;
}

type GeoState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'ready'; coords: Coords }
  | { status: 'error'; message: string };

/** On-demand browser geolocation (we only ask when the user taps a button). */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: 'idle' });

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'error', message: 'Location is not available in this browser.' });
      return;
    }
    setState({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({ status: 'ready', coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      (err) =>
        setState({
          status: 'error',
          message: err.code === err.PERMISSION_DENIED ? 'Location permission was denied.' : 'Could not get your location.',
        }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  return { state, locate };
}
