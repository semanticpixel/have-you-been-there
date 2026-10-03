import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { deviceStore, isBartenderList, store, useBartenders } from '../lib/store';
import { setMyName, useMyName } from '../lib/settings';
import { mapsEnabled } from '../lib/maps';
import { errorMessage, supabase, supabaseEnabled } from '../lib/supabase';
import { inviteUrl, useSession } from '../lib/session';
import { today } from '../lib/util';

export function SettingsPage() {
  return (
    <div className="page form">
      <h1>Crew</h1>
      {supabaseEnabled ? <CrewSection /> : <LocalNameField />}
      <ExportImport />
      <section className="card">
        <h2>Google Maps</h2>
        <p className="muted small">
          {mapsEnabled
            ? 'Connected. Place search, the map, and “Who works here?” are using Google Maps.'
            : 'Not configured. Set VITE_GOOGLE_MAPS_API_KEY to turn on place search and the map.'}
        </p>
      </section>
    </div>
  );
}

function LocalNameField() {
  const myName = useMyName();
  return (
    <label>
      Your name
      <input defaultValue={myName} onBlur={(e) => setMyName(e.target.value)} placeholder="So we know who met who" />
    </label>
  );
}

function CrewSection() {
  const { state, renameMe, rotateInvite, switchCrew, signOut } = useSession();
  const [members, setMembers] = useState<{ user_id: string; display_name: string }[]>([]);
  const [message, setMessage] = useState<string>();
  if (state.status !== 'signedIn' || !state.active) return null;
  const { active, memberships, user } = state;
  const link = inviteUrl(active.crew.inviteCode);

  return (
    <>
      <section className="card">
        <div className="row spread">
          <h2 className="flush">{active.crew.name}</h2>
          {memberships.length > 1 && (
            <select value={active.crew.id} onChange={(e) => switchCrew(e.target.value)} aria-label="Switch crew">
              {memberships.map((m) => (
                <option key={m.crew.id} value={m.crew.id}>
                  {m.crew.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <Members crewId={active.crew.id} members={members} setMembers={setMembers} />

        <p className="small">Invite friends with this link. Anyone who has it can join, so only send it to the crew.</p>
        <div className="row">
          <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Invite link" />
          <button
            type="button"
            className="primary"
            onClick={async () => {
              if (navigator.share) {
                await navigator.share({ title: `Join ${active.crew.name}`, text: 'Join our bartender crew 🍸', url: link }).catch(() => {});
              } else {
                await navigator.clipboard.writeText(link);
                setMessage('Invite link copied.');
              }
            }}
          >
            {'share' in navigator ? 'Share' : 'Copy'}
          </button>
        </div>
        <button
          type="button"
          className="link small"
          onClick={async () => {
            if (!confirm('Make a new invite link? The current one will stop working.')) return;
            try {
              await rotateInvite();
              setMessage('New invite link ready. The old one no longer works.');
            } catch (e) {
              setMessage(errorMessage(e));
            }
          }}
        >
          Reset invite link
        </button>
        {message && <p className="small">{message}</p>}
      </section>

      <label>
        Your name in this crew
        <input
          key={active.crew.id}
          defaultValue={active.displayName}
          maxLength={40}
          onBlur={async (e) => {
            const name = e.target.value.trim();
            if (!name || name === active.displayName) return;
            try {
              await renameMe(name);
              setMembers((ms) => ms.map((m) => (m.user_id === user.id ? { ...m, display_name: name } : m)));
            } catch (err) {
              setMessage(errorMessage(err));
            }
          }}
        />
      </label>

      <UploadDeviceData crewId={active.crew.id} crewName={active.crew.name} />

      <section className="card">
        <div className="row spread">
          <div className="grow">
            <div className="small muted">Signed in as</div>
            <div className="truncate">{user.email}</div>
          </div>
          <button type="button" onClick={() => confirm('Sign out?') && signOut()}>
            Sign out
          </button>
        </div>
        <Link className="small" to="/crew/setup">
          Join or start another crew
        </Link>
      </section>
    </>
  );
}

function Members({
  crewId,
  members,
  setMembers,
}: {
  crewId: string;
  members: { user_id: string; display_name: string }[];
  setMembers: (m: { user_id: string; display_name: string }[]) => void;
}) {
  useEffect(() => {
    supabase!
      .from('crew_members')
      .select('user_id, display_name')
      .eq('crew_id', crewId)
      .order('joined_at')
      .then(({ data }) => setMembers(data ?? []));
  }, [crewId, setMembers]);

  return (
    <div className="tags">
      {members.map((m) => (
        <span key={m.user_id} className="tag">
          {m.display_name}
        </span>
      ))}
    </div>
  );
}

/** Move bartenders logged before the crew existed (saved only on this phone) into the shared list. */
function UploadDeviceData({ crewId, crewName }: { crewId: string; crewName: string }) {
  const doneKey = `hybt:uploadedTo:${crewId}`;
  const [done, setDone] = useState(() => localStorage.getItem(doneKey) === '1');
  const local = deviceStore.getAll();
  if (done || local.length === 0) return null;

  return (
    <section className="card">
      <h2>On this device</h2>
      <p className="small">
        {local.length} bartender{local.length > 1 ? 's are' : ' is'} saved only on this phone. Add them to {crewName} so everyone can see them?
      </p>
      <div className="actions start">
        <button
          type="button"
          className="primary"
          onClick={() => {
            store.importMany(local);
            localStorage.setItem(doneKey, '1');
            setDone(true);
          }}
        >
          Add to crew
        </button>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(doneKey, '1');
            setDone(true);
          }}
        >
          Not now
        </button>
      </div>
    </section>
  );
}

function ExportImport() {
  const bartenders = useBartenders();
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
      const changed = store.importMany(parsed);
      setMessage(changed === 0 ? 'Nothing new in that file.' : `Added or updated ${changed} bartender${changed > 1 ? 's' : ''}.`);
    } catch {
      setMessage("That file doesn't look like a bartender export.");
    }
  }

  return (
    <section className="card">
      <h2>Backup</h2>
      <p className="muted small">
        {supabaseEnabled
          ? 'Download a copy of the crew’s list, or import an export file into it.'
          : 'Everything lives on this device. Export your list to back it up or send to a friend; importing keeps the newest version of each bartender.'}
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
  );
}
