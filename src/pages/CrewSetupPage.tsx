import { useState, type FormEvent } from 'react';
import { getPendingInvite, setPendingInvite, useSession } from '../lib/session';
import { getMyName } from '../lib/settings';
import { errorMessage } from '../lib/supabase';

/** Accepts a bare code or a full invite link. */
function parseInvite(input: string): string {
  const match = input.match(/\/join\/([\w-]+)/);
  return (match ? match[1] : input).trim().toLowerCase();
}

export function CrewSetupPage({ onDone }: { onDone?: () => void }) {
  const { createCrew, joinCrew } = useSession();
  const [displayName, setDisplayName] = useState(getMyName());
  const [invite, setInvite] = useState(getPendingInvite() ?? '');
  const [crewName, setCrewName] = useState('');
  const [mode, setMode] = useState<'join' | 'create'>(getPendingInvite() ? 'join' : 'create');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const invited = Boolean(getPendingInvite());

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      if (mode === 'join') await joinCrew(parseInvite(invite), displayName.trim());
      else await createCrew(crewName.trim(), displayName.trim());
      onDone?.();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  const ready = displayName.trim() && (mode === 'join' ? invite.trim() : crewName.trim());

  return (
    <form className="page form narrow" onSubmit={submit}>
      <h1>{invited ? 'Join your crew 🍻' : 'Your crew'}</h1>
      <p className="muted">Everyone in a crew shares one list of bartenders.</p>

      <label>
        What does the crew call you?
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={40} placeholder="Alex" />
      </label>

      <div className="segmented" role="radiogroup">
        <button type="button" role="radio" aria-checked={mode === 'join'} className={mode === 'join' ? 'on' : ''} onClick={() => setMode('join')}>
          Join a crew
        </button>
        <button type="button" role="radio" aria-checked={mode === 'create'} className={mode === 'create' ? 'on' : ''} onClick={() => setMode('create')}>
          Start a crew
        </button>
      </div>

      {mode === 'join' ? (
        <label>
          Invite link or code
          <input value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="Paste the link a friend sent you" />
        </label>
      ) : (
        <label>
          Crew name
          <input value={crewName} onChange={(e) => setCrewName(e.target.value)} maxLength={80} placeholder="Thursday Night Crew" />
        </label>
      )}

      <div className="actions">
        {onDone && (
          <button
            type="button"
            onClick={() => {
              setPendingInvite(null);
              onDone();
            }}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="primary" disabled={busy || !ready}>
          {busy ? 'One sec…' : mode === 'join' ? 'Join crew' : 'Start crew'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
