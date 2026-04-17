import { randomUUID } from 'crypto';
import { ensureHttpsUrl } from '@glc/intake-core';
import { resolveSelfServeAuditOwnerUserId } from '../../lib/self-serve-audit-owner.js';
import { defaultExecutionPlanForPackage } from '../../services/execution-plan.js';
import { STARTER_AUDIT_COVERAGE_PACKAGE } from '../../types/audit.js';
import { getFreeSnapshotTokenBudget } from '../../config/snapshot-public.js';
import { PublicUrlNotAllowedError, validatePublicAuditUrl } from '../../lib/public-http-url.js';
import { readSnapshotCache, normalizeSnapshotHost } from '../cache.js';
import {
  getSnapshotDomainFreshCooldownRetryAfterSecondsAsync,
  isSnapshotDomainFreshCooldownActiveAsync,
} from '../abuse-guards.js';
import {
  initSnapshotAuditChildren,
  insertFreeSnapshotAudit,
  rollbackAuditOnInitFailure,
} from '../repositories/snapshot-route.repository.js';
import type { ApiErrorCode } from '../../config/api-error-codes.js';

export type StartSnapshotResult =
  | { type: 'invalid_public_url'; code: ApiErrorCode; message: string }
  | { type: 'cooldown'; retryAfterSec: number }
  | { type: 'owner_resolution_error'; statusCode: number; code: ApiErrorCode; error: string }
  | { type: 'create_failed'; details?: Record<string, unknown> }
  | { type: 'init_failed'; auditId: string; initErrors: unknown[] }
  | { type: 'ok'; snapshotToken: string; auditId: string; normalizedUrl: string };

export async function startSnapshotAudit(companyUrlRaw: string): Promise<StartSnapshotResult> {
  let url = ensureHttpsUrl(companyUrlRaw);
  try {
    url = await validatePublicAuditUrl(url);
  } catch (e) {
    if (e instanceof PublicUrlNotAllowedError) {
      return { type: 'invalid_public_url', code: e.code, message: e.message };
    }
    throw e;
  }

  const snapHost = normalizeSnapshotHost(url);
  if (snapHost) {
    const cacheHit = await readSnapshotCache(snapHost);
    if (!cacheHit && (await isSnapshotDomainFreshCooldownActiveAsync(snapHost))) {
      const retrySec = await getSnapshotDomainFreshCooldownRetryAfterSecondsAsync(snapHost);
      return { type: 'cooldown', retryAfterSec: retrySec };
    }
  }

  const resolved = await resolveSelfServeAuditOwnerUserId();
  if (!resolved.ok) {
    return {
      type: 'owner_resolution_error',
      statusCode: resolved.statusCode,
      code: resolved.code,
      error: resolved.error,
    };
  }

  const snapshotToken = randomUUID();
  const { data: audit, error: auditErr } = await insertFreeSnapshotAudit({
    companyUrl: url,
    snapshotToken,
    ownerUserId: resolved.userId,
    executionPlan: defaultExecutionPlanForPackage(STARTER_AUDIT_COVERAGE_PACKAGE),
    tokenBudget: getFreeSnapshotTokenBudget(),
  });

  if (auditErr || !audit) {
    const pe = auditErr as { message?: string; code?: string; details?: string; hint?: string } | null;
    return {
      type: 'create_failed',
      details: pe
        ? {
            message: pe.message,
            code: pe.code,
            details: pe.details,
            hint: pe.hint,
          }
        : undefined,
    };
  }

  const auditId = audit.id as string;
  const initResults = await initSnapshotAuditChildren(auditId);
  const initFailed = initResults.some(
    r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)
  );
  if (initFailed) {
    await rollbackAuditOnInitFailure(auditId);
    const placeholders = ['audit_recon', 'audit_domains'] as const;
    const initErrors = initResults
      .map((r, i) => {
        const label = placeholders[i] ?? `idx_${i}`;
        if (r.status === 'rejected') {
          return { table: label, error: (r.reason as Error)?.message ?? String(r.reason) };
        }
        if (r.status === 'fulfilled' && r.value.error) {
          const err = r.value.error as { message?: string; code?: string; details?: string; hint?: string };
          return { table: label, error: err.message, code: err.code, details: err.details, hint: err.hint };
        }
        return null;
      })
      .filter(Boolean);
    return { type: 'init_failed', auditId, initErrors };
  }

  return { type: 'ok', snapshotToken, auditId, normalizedUrl: url };
}
