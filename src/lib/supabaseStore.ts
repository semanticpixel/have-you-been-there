import type { RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';
import type { Bartender } from './types';
import { newerThanCurrent, type BartenderStore, type StoreStatus } from './storage';
import { fromRow, planSave, type BartenderWithChildren } from './rows';
import { errorMessage } from './supabase';

const TABLES = ['bartenders', 'sightings', 'recommendations'] as const;

/**
 * The crew's shared list. Edits show up instantly on this device (optimistic), are written to
 * Supabase in the background, and arrive on everyone else's device through Realtime.
 */
export function createSupabaseStore(client: SupabaseClient, crewId: string): BartenderStore {
  const listeners = new Set<() => void>();
  let cache: Bartender[] = [];
  let status: StoreStatus = { loading: true };
  let pendingWrites = 0;
  let refetchWanted = false;
  let refetchTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const emit = () => listeners.forEach((l) => l());
  const setStatus = (next: StoreStatus) => {
    status = next;
    emit();
  };

  async function fetchAll() {
    // A fetch that overlaps our own in-flight writes could briefly undo them on screen; wait for them.
    if (pendingWrites > 0) {
      refetchWanted = true;
      return;
    }
    const { data, error } = await client
      .from('bartenders')
      .select('*, sightings(*), recommendations(*)')
      .eq('crew_id', crewId)
      .order('created_at', { ascending: false });
    if (disposed) return;
    if (pendingWrites > 0) {
      refetchWanted = true;
      return;
    }
    if (error) {
      setStatus({ loading: false, error: `Couldn't load the crew's list: ${error.message}` });
      return;
    }
    cache = (data as BartenderWithChildren[]).map(fromRow);
    setStatus({ loading: false });
  }

  function scheduleRefetch() {
    clearTimeout(refetchTimer);
    refetchTimer = setTimeout(fetchAll, 250);
  }

  async function write(work: () => Promise<void>) {
    pendingWrites++;
    try {
      await work();
    } catch (e) {
      if (!disposed) setStatus({ ...status, error: `Couldn't save: ${errorMessage(e)}` });
      refetchWanted = true; // put the screen back in line with what's really stored
    } finally {
      pendingWrites--;
      if (pendingWrites === 0 && refetchWanted && !disposed) {
        refetchWanted = false;
        scheduleRefetch();
      }
    }
  }

  async function check(request: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await request;
    if (error) throw error;
  }

  async function persist(prev: Bartender | undefined, next: Bartender) {
    const plan = planSave(prev, next, crewId);
    if (plan.bartender) await check(client.from('bartenders').upsert(plan.bartender));
    await Promise.all([
      plan.upsertSightings.length > 0 && check(client.from('sightings').upsert(plan.upsertSightings)),
      plan.deleteSightingIds.length > 0 && check(client.from('sightings').delete().in('id', plan.deleteSightingIds)),
      plan.upsertRecommendations.length > 0 && check(client.from('recommendations').upsert(plan.upsertRecommendations)),
      plan.deleteRecommendationIds.length > 0 &&
        check(client.from('recommendations').delete().in('id', plan.deleteRecommendationIds)),
    ]);
  }

  function knownId(id: unknown): boolean {
    return cache.some((b) => b.id === id || b.sightings.some((s) => s.id === id) || b.recommendations.some((r) => r.id === id));
  }

  const channel = client.channel(`crew:${crewId}`);
  for (const table of TABLES) {
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter: `crew_id=eq.${crewId}` }, scheduleRefetch);
    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter: `crew_id=eq.${crewId}` }, scheduleRefetch);
    // Realtime can't filter deletes, and only sends the deleted row's id — refetch if it was one of ours.
    channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, (p: RealtimePostgresChangesPayload<{ id: string }>) => {
      if (knownId((p.old as { id?: string }).id)) scheduleRefetch();
    });
  }
  channel.subscribe((state) => {
    // Covers changes made while we were connecting or disconnected.
    if (state === 'SUBSCRIBED') scheduleRefetch();
  });

  // Phones drop the socket in the background; catch up when the app comes back.
  const onVisible = () => document.visibilityState === 'visible' && scheduleRefetch();
  document.addEventListener('visibilitychange', onVisible);

  fetchAll();

  return {
    getAll: () => cache,
    getStatus: () => status,
    save(bartender) {
      const prev = cache.find((b) => b.id === bartender.id);
      const next = { ...bartender, updatedAt: new Date().toISOString() };
      cache = prev ? cache.map((b) => (b.id === next.id ? next : b)) : [next, ...cache];
      emit();
      write(() => persist(prev, next));
    },
    remove(id) {
      cache = cache.filter((b) => b.id !== id);
      emit();
      write(() => check(client.from('bartenders').delete().eq('id', id)));
    },
    importMany(bartenders) {
      const changed = newerThanCurrent(cache, bartenders);
      for (const b of changed) {
        const prev = cache.find((c) => c.id === b.id);
        cache = prev ? cache.map((c) => (c.id === b.id ? b : c)) : [b, ...cache];
        write(() => persist(prev, b));
      }
      if (changed.length > 0) emit();
      return changed.length;
    },
    refresh() {
      setStatus({ ...status, error: undefined });
      scheduleRefetch();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      disposed = true;
      clearTimeout(refetchTimer);
      document.removeEventListener('visibilitychange', onVisible);
      client.removeChannel(channel);
    },
  };
}
