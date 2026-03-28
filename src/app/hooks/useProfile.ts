import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../data/auditTypes';

interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
}

interface UseProfileResult {
  profile: Profile | null;
  role: UserRole | null;
  isConsultant: boolean;
  isClient: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Reads the current user's profile from Supabase.
 * Role is set by the server at sign-in via the CONSULTANT_EMAILS env check.
 *
 * Returns null while loading or if the user is not signed in.
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

      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('id, role, full_name, created_at')
        .eq('id', session.user.id)
        .single();

      if (!cancelled) {
        if (dbError || !data) {
          // Profile may not exist yet (migration not applied, or first login before trigger ran).
          // Fail gracefully — treat as client.
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return {
    profile,
    role: profile?.role ?? null,
    isConsultant: profile?.role === 'consultant',
    isClient: profile?.role === 'client',
    loading,
    error,
  };
}
