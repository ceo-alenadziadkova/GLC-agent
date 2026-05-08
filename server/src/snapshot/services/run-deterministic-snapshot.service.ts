/**
 * Orchestrates deterministic free snapshot: tiered fetch, facts, site profile, audit rules, persist recon + UX row.
 */
import { logger } from '../../services/logger.js';
import { supabase } from '../../services/supabase.js';
import type { FreeSnapshotPreview } from '../../types/audit.js';
import {
  acquireSnapshotFreshConcurrency,
  noteSnapshotFreshFetchCompleted,
  releaseSnapshotFreshConcurrency,
  SnapshotAtCapacityError,
} from '../abuse-guards.js';
import {
  readSnapshotCache,
  writeSnapshotCache,
  normalizeSnapshotHost,
  redactSnapshotPayloadForDomainCache,
} from '../cache.js';
import { buildDeterministicSnapshotPayload } from '../deterministic-site-scan-payload.js';
import { buildPreviewFromPayload } from '../mappers/free-preview-from-payload.mapper.js';
import { logSnapshotRunComplete } from '../observability/snapshot-run-telemetry.js';
import { persistSnapshotCacheResult } from './snapshot-persistence.service.js';
import type { SiteProfileDebug } from '../classification/site-profile-runner.js';
import type { SnapshotCachePayload } from '../types.js';

export interface DeterministicSnapshotResult {
  preview: FreeSnapshotPreview;
  profileDebug?: SiteProfileDebug;
}

export async function runDeterministicSnapshot(auditId: string): Promise<DeterministicSnapshotResult> {
  const startedAt = Date.now();
  const { data: audit, error: aErr } = await supabase
    .from('audits')
    .select('company_url, snapshot_token, company_name')
    .eq('id', auditId)
    .single();

  if (aErr || !audit?.company_url) {
    throw new Error('Audit not found or missing company_url');
  }

  const companyUrl = audit.company_url as string;
  const token = (audit.snapshot_token as string) ?? '';
  const host = normalizeSnapshotHost(companyUrl);

  const cached = await readSnapshotCache(host);
  if (cached) {
    await persistSnapshotCacheResult(auditId, cached, {
      persistedFromDomainCache: true,
      redactContactInRecon: true,
    });
    const preview = buildPreviewFromPayload(auditId, token, companyUrl, cached, {
      fromDomainCache: true,
    });
    logSnapshotRunComplete({
      auditId,
      host,
      startedAt,
      outcome: 'cache_hit',
      payload: cached,
    });
    return { preview };
  }

  const { acquired, leaseId } = await acquireSnapshotFreshConcurrency();
  if (!acquired) {
    throw new SnapshotAtCapacityError();
  }

  let released = false;
  const releaseOnce = async () => {
    if (!released) {
      released = true;
      await releaseSnapshotFreshConcurrency(leaseId);
    }
  };

  try {
    const { payload, profileDebug } = await buildDeterministicSnapshotPayload(companyUrl);
    await finalizeSnapshotPersistence(auditId, host, payload, startedAt, profileDebug);
    return {
      preview: buildPreviewFromPayload(auditId, token, companyUrl, payload, {
        fromDomainCache: false,
      }),
      ...(profileDebug ? { profileDebug } : {}),
    };
  } finally {
    await releaseOnce();
  }
}

async function finalizeSnapshotPersistence(
  auditId: string,
  host: string,
  payload: SnapshotCachePayload,
  startedAt: number,
  profileDebug: SiteProfileDebug | undefined,
): Promise<void> {
  if (payload.degraded) {
    await persistSnapshotCacheResult(auditId, payload, {
      persistedFromDomainCache: false,
      redactContactInRecon: true,
    });
    logSnapshotRunComplete({
      auditId,
      host,
      startedAt,
      outcome: 'degraded',
      payload,
    });
    return;
  }

  await writeSnapshotCache(host, redactSnapshotPayloadForDomainCache(payload));
  await noteSnapshotFreshFetchCompleted(host);
  await persistSnapshotCacheResult(auditId, payload, {
    persistedFromDomainCache: false,
    redactContactInRecon: true,
  });

  logSnapshotRunComplete({
    auditId,
    host,
    startedAt,
    outcome: 'fresh_completed',
    payload,
  });
  if (profileDebug) {
    logger.debug('snapshot.profile_debug', { audit_id: auditId, matched: profileDebug.matchedSignals.length });
  }
}
