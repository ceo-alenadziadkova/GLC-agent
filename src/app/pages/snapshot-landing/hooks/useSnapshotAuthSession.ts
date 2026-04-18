import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';

export function useSnapshotAuthSession(): User | null {
  const [accountUser, setAccountUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;

    const syncUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        setAccountUser(data.session?.user ?? null);
      }
    };

    void syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncUser();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return accountUser;
}
