import { useRef, useState } from 'react';
import { isBartenderList, mergeBartenders, store, useBartenders } from '../lib/store';
import { setMyName, useMyName } from '../lib/settings';
import { mapsEnabled } from '../lib/maps';
import { today } from '../lib/util';

export function SettingsPage() {
  const bartenders = useBartenders();
  const myName = useMyName();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string>();

  function exportData() {
    const blob = new Blob([JSON.stringify(bartenders, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bartenders-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file: File) {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isBartenderList(parsed)) throw new Error('not a bartender export');
      const merged = mergeBartenders(bartenders, parsed);
      store.replaceAll(merged);
      setMessage(`Imported ${parsed.length} bartenders — you now have ${merged.length}.`);
    } catch {
      setMessage("That file doesn't look like a bartender export.");
    }
  }

  return (
    <div className="page form">
      <h1>Crew</h1>

      <label>
        Your name
        <input defaultValue={myName} onBlur={(e) => setMyName(e.target.value)} placeholder="So we know who met who" />
      </label>

      <section className="card">
        <h2>Share with friends</h2>
        <p className="muted small">
          For now everything lives on this device. Export your list and send it to the crew; importing merges lists and keeps the newest
          version of each bartender.
        </p>
        <div className="actions start">
          <button onClick={exportData} disabled={bartenders.length === 0}>
            ⬇️ Export ({bartenders.length})
          </button>
          <button onClick={() => fileInput.current?.click()}>⬆️ Import</button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importData(file);
              e.target.value = '';
            }}
          />
        </div>
        {message && <p>{message}</p>}
      </section>

      <section className="card">
        <h2>Google Maps</h2>
        <p className="muted small">
          {mapsEnabled
            ? 'Connected — place search, the map, and “Who works here?” are using Google Maps.'
            : 'Not configured. Set VITE_GOOGLE_MAPS_API_KEY to turn on place search and the map.'}
        </p>
      </section>
    </div>
  );
}
