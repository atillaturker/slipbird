import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The project URL and anon (publishable) key are public by design; row-level security and the
// function's own checks protect data. The LLM key never ships in the app.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { storage: localStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : null;

/** Signs in anonymously on first use (no account screens). False when offline or not configured. */
export async function ensureSession(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) return true;
    const { error } = await supabase.auth.signInAnonymously();
    return !error;
  } catch {
    return false;
  }
}

/** The anonymous Supabase user id: also RevenueCat's app user id, so the backend can tell who is Pro. */
export async function getUserId(): Promise<string | null> {
  if (!supabase) return null;
  try {
    return (await supabase.auth.getSession()).data.session?.user.id ?? null;
  } catch {
    return null;
  }
}
