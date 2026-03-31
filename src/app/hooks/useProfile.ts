import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../data/auditTypes';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
}

interface UseProfileResult {
  profile: Profile | null;
  role: UserRole | null;
  /** Product label for UI: internal role `consultant` displays as Admin. */
  roleDisplayName: 'Admin' | 'Client' | null;
  isConsultant: boolean;
  /** Same as isConsultant — GLC internal staff (DB role `consultant`). */
  isAdmin: boolean;
  isClient: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Reads the current user's profile from Supabase.
 * Role is set by the server via the CONSULTANT_EMAILS env check.
 *
 * If the profile row doesn't exist yet (user created before migration 005,
 * or handle_new_user trigger missed), calls GET /api/profile which runs
 * attachProfile() to upsert the row, then re-reads from the DB.
 */
export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        if (!cancelled) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      // Try reading profile directly from DB first (fast path)
      let { data, error: dbError } = await supabase
        .from('profiles')
        .select('id, role, full_name, created_at')
        .eq('id', session.user.id)
        .single();

      // PGRST116 = 0 rows — profile doesn't exist yet.
      // Call /api/profile which runs attachProfile() to upsert it, then re-read.
      if (dbError?.code === 'PGRST116') {
        try {
          await fetch(`${API_URL}/api/profile`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const retry = await supabase
            .from('profiles')
            .select('id, role, full_name, created_at')
            .eq('id', session.user.id)
            .single();
          data = retry.data;
          dbError = retry.error;
        } catch {
          // Server unreachable — fall through to error state
        }
      }

      if (!cancelled) {
        if (dbError || !data) {
          setProfile(null);
          setError(dbError?.message ?? 'Profile not found');
        } else {
          setProfile(data as Profile);
        }
        setLoading(false);
      }
    }

    void load();

    // Re-fetch on auth state changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Only re-run on actual sign-in / sign-out, not on every token refresh
      if (session === null || _event === 'SIGNED_IN' || _event === 'SIGNED_OUT') {
        void load();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const isConsultant = profile?.role === 'consultant';
  return {
    profile,
    role: profile?.role ?? null,
    roleDisplayName: profile ? (profile.role === 'consultant' ? 'Admin' : 'Client') : null,
    isConsultant,
    isAdmin: isConsultant,
    isClient: profile?.role === 'client',
    loading,
    error,
  };
}
