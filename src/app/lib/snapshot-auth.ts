import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Second storage for the same anonymous Supabase session. If the default `sb-*-auth-token`
 * entry is cleared or missing (race, partial site-data clear), we can still `setSession`
 * and keep the same `user.id` instead of creating another guest.
 */
export const GLC_PREVIEW_GUEST_SESSION_KEY = 'glc_preview_guest_session_v1';

type PreviewGuestBackup = { access_token: string; refresh_token: string };

function readPreviewGuestBackup(): PreviewGuestBackup | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GLC_PREVIEW_GUEST_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PreviewGuestBackup;
    if (
      typeof parsed?.access_token !== 'string'
      || typeof parsed?.refresh_token !== 'string'
      || !parsed.access_token
      || !parsed.refresh_token
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Drop backup so a stale or upgraded session cannot be mistaken for the preview guest. */
export function clearPreviewSessionBackup(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(GLC_PREVIEW_GUEST_SESSION_KEY);
  } catch {
    /* ignore quota / privacy mode */
  }
}

/** Keep backup aligned with token rotation for anonymous sessions only. */
export function persistPreviewSessionBackupIfAnonymous(session: Session | null): void {
  if (typeof localStorage === 'undefined' || !session?.access_token || !session.refresh_token) return;
  if (!isAnonymousUser(session.user)) return;
  try {
    const payload: PreviewGuestBackup = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    };
    localStorage.setItem(GLC_PREVIEW_GUEST_SESSION_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

async function tryRestoreSnapshotSessionFromBackup(): Promise<string | null> {
  const backup = readPreviewGuestBackup();
  if (!backup) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token: backup.access_token,
    refresh_token: backup.refresh_token,
  });

  if (error || !data.session?.access_token) {
    clearPreviewSessionBackup();
    return null;
  }

  if (!isAnonymousUser(data.session.user)) {
    clearPreviewSessionBackup();
  } else {
    persistPreviewSessionBackupIfAnonymous(data.session);
  }

  return data.session.access_token;
}

/** Coalesces concurrent preview-session setup (mount + submit + auth events) into one anonymous sign-in. */
let snapshotSessionEnsuring: Promise<string> | null = null;

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
 * Returns a JWT when the user already has a Supabase session (optional snapshot features).
 * Public `POST /api/snapshot` uses an httpOnly guest cookie and does not require this token.
 */
export async function ensureSnapshotSession(): Promise<string> {
  if (!snapshotSessionEnsuring) {
    snapshotSessionEnsuring = (async () => {
      const { data: fresh } = await supabase.auth.getSession();
      if (fresh.session?.access_token) {
        persistPreviewSessionBackupIfAnonymous(fresh.session);
        return fresh.session.access_token;
      }

      const fromBackup = await tryRestoreSnapshotSessionFromBackup();
      if (fromBackup) {
        return fromBackup;
      }

      return '';
    })().finally(() => {
      snapshotSessionEnsuring = null;
    });
  }

  return snapshotSessionEnsuring;
}

/** Current access token if any (does not create a session). */
export async function getSnapshotAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
