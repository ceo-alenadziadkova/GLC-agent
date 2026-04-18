import { emitStructuredNotification } from '../../services/notifications.js';
import {
  SNAPSHOT_CLAIMED_NOTIFICATION_MESSAGE_EN,
  SNAPSHOT_CLAIMED_NOTIFICATION_TITLE_EN,
  snapshotClaimedInAppRoute,
} from '../../config/route-notification-messages.js';
import {
  claimAuditByIdIfUnclaimed,
  findFreeSnapshotAuditByToken,
  readAuditClientById,
  updateGuestSessionClaimed,
} from '../repositories/snapshot-route.repository.js';
import { SNAPSHOT_TOKEN_TTL_HOURS } from '../../config/snapshot-public.js';
import { isSnapshotTokenExpired } from '../domain/snapshot-token-policy.js';

export type SnapshotClaimResult =
  | { type: 'not_found' }
  | { type: 'expired' }
  | { type: 'conflict' }
  | { type: 'ok'; auditId: string; alreadyClaimed: boolean };

export async function claimSnapshotForUser(snapshotToken: string, userId: string): Promise<SnapshotClaimResult> {
  const { data: audit, error: auditErr } = await findFreeSnapshotAuditByToken(snapshotToken);
  if (auditErr || !audit) {
    return { type: 'not_found' };
  }

  if (isSnapshotTokenExpired(String(audit.created_at), SNAPSHOT_TOKEN_TTL_HOURS)) {
    return { type: 'expired' };
  }

  const existingClient = audit.client_id as string | null;
  if (existingClient === userId) {
    await updateGuestSessionClaimed(snapshotToken, userId);
    return { type: 'ok', auditId: audit.id as string, alreadyClaimed: true };
  }

  if (existingClient != null && existingClient !== userId) {
    return { type: 'conflict' };
  }

  const { data: updated, error: updErr } = await claimAuditByIdIfUnclaimed(audit.id as string, userId);
  if (updErr || !updated) {
    const { data: again } = await readAuditClientById(audit.id as string);
    if (again?.client_id === userId) {
      return { type: 'ok', auditId: again.id as string, alreadyClaimed: true };
    }
    return { type: 'conflict' };
  }

  await updateGuestSessionClaimed(snapshotToken, userId);
  await emitStructuredNotification({
    category: 'snapshot',
    event: 'snapshot_claimed',
    priority: 'low',
    audience: 'consultants',
    auditId: updated.id as string,
    title: SNAPSHOT_CLAIMED_NOTIFICATION_TITLE_EN,
    message: SNAPSHOT_CLAIMED_NOTIFICATION_MESSAGE_EN,
    route: snapshotClaimedInAppRoute(updated.id as string),
    payload: {
      audit_id: updated.id,
      claimed_by_user_id: userId,
      actor_role: 'client',
    },
  });

  return { type: 'ok', auditId: updated.id as string, alreadyClaimed: false };
}
