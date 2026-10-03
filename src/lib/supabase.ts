import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
// New projects call it the "publishable" key; older ones call it the "anon" key. Either works.
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** Without Supabase configured, the app runs in single-device mode on localStorage. */
export const supabaseEnabled = url.length > 0 && key.length > 0;

export const supabase = supabaseEnabled ? createClient(url, key) : null;

export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') return e.message;
  return String(e);
}
