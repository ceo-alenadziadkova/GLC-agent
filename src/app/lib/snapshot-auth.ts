import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Detects legacy Supabase anonymous sessions (no longer created by the app).
 * Kept for typing / edge cases if an old JWT is still in localStorage.
 */
export function isAnonymousUser(user: User | null): boolean {
  if (!user) return false;
  const flagged = (user as { is_anonymous?: boolean }).is_anonymous;
  if (flagged === true) return true;
  const ids = user.identities ?? [];
  return ids.length > 0 && ids.every(i => i.provider === 'anonymous');
}

/** Bearer for snapshot API — only an existing logged-in session (no anonymous sign-in). */
export async function getSnapshotAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
