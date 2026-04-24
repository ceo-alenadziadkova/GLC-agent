import { useState, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { API_PATHS } from '../config/api-paths';
import { apiFetch } from '../data/api-http';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../data/auditTypes';

/**
 * Loads `profiles` row; runs GET /api/profile when missing (creates row via attachProfile)
 * or when role is still `guest` so the server can promote guest → client after OAuth linkIdentity.
 */
async function loadProfileRowForSession(session: Session): Promise<{
  profile: Profile | null;
  error: string | null;
}> {
  let { data, error: dbError } = await supabase
    .from('profiles')
    .select('id, role, full_name, created_at')
    .eq('id', session.user.id)
    .single();

  if (dbError?.code === 'PGRST116') {
    try {
      await apiFetch(API_PATHS.profile, { method: 'GET' });
      const retry = await supabase
        .from('profiles')
        .select('id, role, full_name, created_at')
        .eq('id', session.user.id)
        .single();
      data = retry.data;
      dbError = retry.error;
    } catch {
      /* fall through */
    }
  }

  if (dbError || !data) {
    return { profile: null, error: dbError?.message ?? 'Profile not found' };
  }

  if (data.role === 'guest') {
    try {
      const api = await apiFetch<{ role?: UserRole; full_name?: string | null }>(API_PATHS.profile, {
        method: 'GET',
      });
      if (api.role && (api.role === 'client' || api.role === 'consultant' || api.role === 'guest')) {
        data = {
          ...data,
          role: api.role,
          full_name: api.full_name ?? data.full_name,
        };
      }
    } catch {
      /* keep DB row as-is */
    }
  }

  let canManagePlatform = false;
  if (data.role === 'consultant') {
    try {
      const apiProfile = await apiFetch<{ can_manage_platform_settings?: boolean }>(API_PATHS.profile, {
        method: 'GET',
      });
      canManagePlatform = apiProfile.can_manage_platform_settings === true;
    } catch {
      canManagePlatform = false;
    }
  }

  return {
    profile: { ...(data as Profile), can_manage_platform_settings: canManagePlatform },
    error: null,
  };
}

interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
  /** From GET /api/profile when `role === 'consultant'`. */
  can_manage_platform_settings?: boolean;
}

interface UseProfileResult {
  profile: Profile | null;
  role: UserRole | null;
  /** Product label for UI: internal role `consultant` displays as Admin. */
  roleDisplayName: 'Admin' | 'Client' | 'Guest' | null;
  isConsultant: boolean;
  /** Same as isConsultant — GLC internal staff (DB role `consultant`). */
  isAdmin: boolean;
  /** Platform settings ACL (open mode: any consultant; restricted: `is_platform_admin` / legacy list). */
  canManagePlatformSettings: boolean;
  isClient: boolean;
  /** Anonymous / snapshot-only session — full client portal blocked until registration. */
  isGuest: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Reads the current user's profile from Supabase.
 * Role is set by the server (`consultant_email_allowlist`).
 *
 * If the profile row doesn't exist yet (user created before migration 005,
 * or handle_new_user trigger missed), calls GET /api/profile which runs
 * attachProfile() to upsert the row, then re-reads from the DB.
 */
export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Latest loaded profile user id — used to treat repeat SIGNED_IN for same user as background refresh. */
  const profileUserIdRef = useRef<string | null>(null);
  profileUserIdRef.current = profile?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    /**
     * `blocking`: full-screen loaders (ProtectedRoute) may wait — use for first load and sign-in/out.
     * `background`: refresh profile without unmounting the portal (e.g. USER_UPDATED, token metadata).
     */
    const load = async (mode: 'blocking' | 'background' = 'blocking') => {
      if (mode === 'blocking') {
        setLoading(true);
      }
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        if (!cancelled) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      const { profile: next, error: loadErr } = await loadProfileRowForSession(session);

      if (!cancelled) {
        if (loadErr || !next) {
          setProfile(null);
          setError(loadErr ?? 'Profile not found');
        } else {
          setProfile(next);
        }
        setLoading(false);
      }
    };

    void load('blocking');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        return;
      }
      if (session === null || event === 'SIGNED_OUT') {
        void load('blocking');
        return;
      }
      if (event === 'SIGNED_IN') {
        const uid = session?.user?.id ?? null;
        const sameUser = uid != null && uid === profileUserIdRef.current;
        void load(sameUser ? 'background' : 'blocking');
        return;
      }
      if (event === 'USER_UPDATED') {
        void load('background');
        return;
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const refetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { profile: next, error: loadErr } = await loadProfileRowForSession(session);
    if (loadErr || !next) {
      setProfile(null);
      setError(loadErr ?? 'Profile not found');
    } else {
      setProfile(next);
    }
    setLoading(false);
  };

  const isConsultant = profile?.role === 'consultant';
  const isGuest = profile?.role === 'guest';
  const canManagePlatformSettings = profile?.can_manage_platform_settings === true;
  return {
    profile,
    role: profile?.role ?? null,
    roleDisplayName: profile
      ? (profile.role === 'consultant' ? 'Admin' : profile.role === 'guest' ? 'Guest' : 'Client')
      : null,
    isConsultant,
    isAdmin: isConsultant,
    canManagePlatformSettings,
    isClient: profile?.role === 'client',
    isGuest,
    loading,
    error,
    refetch,
  };
}
