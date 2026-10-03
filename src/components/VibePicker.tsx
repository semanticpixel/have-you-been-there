import { useState } from 'react';
import { VIBE_OPTIONS } from '../lib/types';

export function VibePicker({ value, onChange }: { value: string[]; onChange: (vibe: string[]) => void }) {
  const [custom, setCustom] = useState('');
  const options = [...new Set([...VIBE_OPTIONS, ...value])];
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div>
      <div className="tags">
        {options.map((v) => (
          <button
            type="button"
            key={v}
            className={`tag toggle ${value.includes(v) ? 'on' : ''}`}
            aria-pressed={value.includes(v)}
            onClick={() => toggle(v)}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="row">
        <input
          value={custom}
          placeholder="Add your own…"
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <button type="button" onClick={addCustom} disabled={!custom.trim()}>
          Add
        </button>
      </div>
    </div>
  );

  function addCustom() {
    const v = custom.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setCustom('');
  }
}
