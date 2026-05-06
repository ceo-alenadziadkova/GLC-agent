import { supabase } from '../supabase.js';
import { canManagePlatformSettings } from '../../lib/platform-admin.js';

/** Returns access kind for persisted audit row (consultant owns or portal client participant). */
export async function resolveAuditPlanBoardAccess(args: {
  auditId: string;
  userId: string;
  userRole?: 'consultant' | 'client' | 'guest' | undefined;
}): Promise<{ ok: true; kind: 'consultant_owner' | 'client' | 'platform_admin' } | { ok: false; reason: 'not_found' | 'denied' }> {
  const { data: row, error } = await supabase
    .from('audits')
    .select('user_id, client_id')
    .eq('id', args.auditId)
    .maybeSingle();

  if (error || !row) return { ok: false, reason: 'not_found' };
  const owner = row.user_id as string | null | undefined;
  const clientId = row.client_id as string | null | undefined;
  if (owner === args.userId) return { ok: true, kind: 'consultant_owner' };
  if (clientId === args.userId) return { ok: true, kind: 'client' };
  if (args.userRole === 'consultant') {
    const isPlatformAdmin = await canManagePlatformSettings(args.userId);
    if (isPlatformAdmin) return { ok: true, kind: 'platform_admin' };
  }
  return { ok: false, reason: 'denied' };
}
