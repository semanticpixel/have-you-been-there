import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { setActiveStore, deviceStore } from './store';
import { createSupabaseStore } from './supabaseStore';
import { setMyName } from './settings';

export interface Crew {
  id: string;
  name: string;
  inviteCode: string;
}

export interface Membership {
  crew: Crew;
  displayName: string;
}

export type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User; memberships: Membership[]; active?: Membership };

interface SessionApi {
  state: SessionState;
  createCrew(name: string, displayName: string): Promise<void>;
  joinCrew(code: string, displayName: string): Promise<void>;
  switchCrew(crewId: string): void;
  renameMe(displayName: string): Promise<void>;
  rotateInvite(): Promise<void>;
  signOut(): Promise<void>;
}

const ACTIVE_CREW_KEY = 'hybt:activeCrew';
const PENDING_INVITE_KEY = 'hybt:pendingInvite';

export function inviteUrl(code: string): string {
  return `${window.location.origin}/join/${code}`;
}

/** An invite code waiting to be used: kept across the sign-in round trip. */
export function getPendingInvite(): string | null {
  return localStorage.getItem(PENDING_INVITE_KEY);
}
export function setPendingInvite(code: string | null) {
  if (code) localStorage.setItem(PENDING_INVITE_KEY, code);
  else localStorage.removeItem(PENDING_INVITE_KEY);
}

const SessionContext = createContext<SessionApi | null>(null);

export function useSession(): SessionApi {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const client = supabase!;
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [memberships, setMemberships] = useState<Membership[] | undefined>(undefined);
  const [activeCrewId, setActiveCrewId] = useState<string | null>(() => localStorage.getItem(ACTIVE_CREW_KEY));

  useEffect(() => {
    client.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = client.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [client]);

  const loadMemberships = useCallback(async () => {
    if (!user) return;
    const { data, error } = await client
      .from('crew_members')
      .select('display_name, crew:crews(id, name, invite_code)')
      .eq('user_id', user.id)
      .order('joined_at');
    if (error) throw error;
    const rows = data as unknown as { display_name: string; crew: { id: string; name: string; invite_code: string } }[];
    setMemberships(
      rows.map((r) => ({ displayName: r.display_name, crew: { id: r.crew.id, name: r.crew.name, inviteCode: r.crew.invite_code } })),
    );
  }, [client, user]);

  useEffect(() => {
    setMemberships(undefined);
    loadMemberships().catch((e) => {
      console.error(e);
      setMemberships([]);
    });
  }, [loadMemberships]);

  const active = memberships?.find((m) => m.crew.id === activeCrewId) ?? memberships?.[0];

  // Point the app's store at the active crew's shared list.
  const activeId = active?.crew.id;
  useEffect(() => {
    if (!activeId) return;
    setActiveStore(createSupabaseStore(client, activeId));
    return () => setActiveStore(deviceStore);
  }, [client, activeId]);

  useEffect(() => {
    if (active) setMyName(active.displayName);
  }, [active]);

  const selectCrew = useCallback((crewId: string) => {
    localStorage.setItem(ACTIVE_CREW_KEY, crewId);
    setActiveCrewId(crewId);
  }, []);

  const api = useMemo<SessionApi>(() => {
    const state: SessionState =
      user === undefined || (user && memberships === undefined)
        ? { status: 'loading' }
        : !user
          ? { status: 'signedOut' }
          : { status: 'signedIn', user, memberships: memberships!, active };

    return {
      state,
      async createCrew(name, displayName) {
        const { data, error } = await client.rpc('create_crew', { crew_name: name, display_name: displayName });
        if (error) throw error;
        await loadMemberships();
        selectCrew((data as { id: string }).id);
      },
      async joinCrew(code, displayName) {
        const { data, error } = await client.rpc('join_crew', { code, display_name: displayName });
        if (error) throw error;
        setPendingInvite(null);
        await loadMemberships();
        selectCrew((data as { id: string }).id);
      },
      switchCrew: selectCrew,
      async renameMe(displayName) {
        if (!user || !active) return;
        const { error } = await client
          .from('crew_members')
          .update({ display_name: displayName })
          .eq('crew_id', active.crew.id)
          .eq('user_id', user.id);
        if (error) throw error;
        await loadMemberships();
      },
      async rotateInvite() {
        if (!active) return;
        const { error } = await client.rpc('rotate_invite_code', { crew: active.crew.id });
        if (error) throw error;
        await loadMemberships();
      },
      async signOut() {
        await client.auth.signOut();
        localStorage.removeItem(ACTIVE_CREW_KEY);
      },
    };
  }, [client, user, memberships, active, loadMemberships, selectCrew]);

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}
