import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

/**
 * Supabase session email for client-side rollout gating (orchestration narrative / deep-dive).
 */
export function useAuthEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        setEmail(session?.user?.email ?? null);
      });
    };
    sync();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      sync();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return email;
}
