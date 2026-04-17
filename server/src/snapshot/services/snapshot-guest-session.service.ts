import type { Request } from 'express';
import {
  extractUtmFromBody,
  hashSnapshotGuestIp,
} from '../../lib/guest-session.js';
import {
  getGuestFunnelRetentionMs,
  SNAPSHOT_GUEST_HEADER_MAX_LEN,
} from '../../config/snapshot-public.js';
import {
  type SnapshotGuestSessionStatus,
  upsertSnapshotGuestSession,
  updateSnapshotGuestSessionStatus,
} from '../repositories/snapshot-guest-session.repository.js';
import { logger } from '../../services/logger.js';

type RegisterGuestSnapshotSessionParams = {
  guestToken: string;
  snapshotToken: string;
  companyUrl: string;
  req: Request;
};

function readOptionalHeader(req: Request, header: 'user-agent' | 'referer'): string | null {
  const value = req.headers[header];
  return typeof value === 'string' ? value.slice(0, SNAPSHOT_GUEST_HEADER_MAX_LEN) : null;
}

export async function registerGuestSnapshotSession(
  params: RegisterGuestSnapshotSessionParams,
): Promise<void> {
  const utm = extractUtmFromBody(params.req.body);
  const ipHash = hashSnapshotGuestIp(params.req);
  const expiresAt = new Date(Date.now() + getGuestFunnelRetentionMs()).toISOString();

  const { error } = await upsertSnapshotGuestSession({
    guest_session_token: params.guestToken,
    snapshot_token: params.snapshotToken,
    status: 'running',
    company_url: params.companyUrl,
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    referrer: readOptionalHeader(params.req, 'referer'),
    user_agent: readOptionalHeader(params.req, 'user-agent'),
    ip_hash: ipHash,
    expires_at: expiresAt,
    claimed_by_user_id: null,
    claimed_at: null,
  });

  if (error) {
    logger.warn('snapshot.guest_session_upsert_failed', {
      component: 'snapshot',
      message: error.message,
      code: (error as { code?: string }).code,
    });
    return;
  }

  logger.info('snapshot.guest_session_upsert_ok', {
    component: 'snapshot',
    snapshot_token: params.snapshotToken,
  });
}

export async function markGuestSnapshotPollStatus(
  snapshotToken: string,
  status: Extract<SnapshotGuestSessionStatus, 'completed' | 'failed'>,
): Promise<void> {
  const { error } = await updateSnapshotGuestSessionStatus(snapshotToken, status);
  if (error) {
    logger.debug('snapshot.guest_session_poll_update_skipped', {
      component: 'snapshot',
      snapshot_token: snapshotToken,
      message: error.message,
    });
  }
}
