import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * True when the Supabase session is the anonymous provider only
 * (`is_anonymous` or identities all `anonymous`).
 */
export function isAnonymousUser(user: User | null): boolean {
  if (!user) return false;
  const flagged = (user as { is_anonymous?: boolean }).is_anonymous;
  if (flagged === true) return true;
  const ids = user.identities ?? [];
  return ids.length > 0 && ids.every(i => i.provider === 'anonymous');
}

/**
 * Ensures a JWT exists for the free snapshot flow: reuses the current session or calls
 * `signInAnonymously()`. Requires **Anonymous sign-ins** enabled in the Supabase project.
 */
export async function ensureSnapshotSession(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return session.access_token;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.session?.access_token) {
    throw new Error(
      error?.message
        ?? 'Could not start a preview session. Enable Anonymous sign-ins in Supabase or sign in manually.',
    );
  }
  return data.session.access_token;
}

/** Current access token if any (does not create a session). */
export async function getSnapshotAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
