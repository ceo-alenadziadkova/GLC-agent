import { supabase } from '../../services/supabase.js';

export type SnapshotGuestSessionStatus = 'running' | 'completed' | 'failed' | 'claimed';

export type SnapshotGuestSessionUpsertPayload = {
  guest_session_token: string;
  snapshot_token: string;
  status: SnapshotGuestSessionStatus;
  company_url: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  expires_at: string;
  claimed_by_user_id: string | null;
  claimed_at: string | null;
};

export async function upsertSnapshotGuestSession(payload: SnapshotGuestSessionUpsertPayload) {
  return supabase
    .from('snapshot_guest_sessions')
    .upsert(payload, { onConflict: 'guest_session_token' });
}

export async function updateSnapshotGuestSessionStatus(
  snapshotToken: string,
  status: Extract<SnapshotGuestSessionStatus, 'completed' | 'failed'>,
) {
  return supabase
    .from('snapshot_guest_sessions')
    .update({ status })
    .eq('snapshot_token', snapshotToken);
}
