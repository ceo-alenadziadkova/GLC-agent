import { supabase } from '../services/supabase.js';

export type ConsultantDirectoryRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

/**
 * Lists consultant profiles with auth emails (admin UI). Auth admin listing is
 * best-effort; email may be null if the admin API fails.
 */
export async function listConsultantDirectoryRows(): Promise<ConsultantDirectoryRow[]> {
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'consultant')
    .order('full_name', { ascending: true, nullsFirst: false });

  if (pErr || !profiles?.length) {
    return [];
  }

  const emailById = new Map<string, string>();
  try {
    let page = 1;
    const perPage = 200;
    for (;;) {
      const { data: pageData, error: uErr } = await supabase.auth.admin.listUsers({ page, perPage });
      if (uErr) {
        break;
      }
      const users = pageData?.users ?? [];
      for (const u of users) {
        if (u.email) {
          emailById.set(u.id, u.email);
        }
      }
      if (users.length < perPage) {
        break;
      }
      page += 1;
      if (page > 50) {
        break;
      }
    }
  } catch {
    /* email enrichment is optional */
  }

  return profiles.map(p => ({
    id: p.id as string,
    full_name: (p.full_name as string | null) ?? null,
    email: emailById.get(p.id as string) ?? null,
  }));
}
