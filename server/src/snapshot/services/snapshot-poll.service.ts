import type { CrawledPage, FreeSnapshotPreview } from '../../types/audit.js';
import { REQUEST_FIELD_LIMITS } from '../../config/request-field-limits.js';
import { readSnapshotCache, normalizeSnapshotHost } from '../cache.js';
import {
  derivePublicUxFieldsFromSnapshotPayload,
  snapshotPayloadToDeterministicApiRecord,
} from '../run-snapshot.js';
import { overallToLegacyScore } from '../audit/run-audit.js';
import { legacyUxLabelForScore } from '../../config/snapshot-ux-legacy-labels.js';
import { SNAPSHOT_UX_SUMMARY_MAX_CHARS, SNAPSHOT_TOKEN_TTL_HOURS } from '../../config/snapshot-public.js';
import { computePublicSnapshotAccessFlags } from '../snapshot-access-state.js';
import { maybeBuildCompetitorMini } from '../../lib/snapshot-competitor.js';
import { isTruthyQueryValue } from '../../config/query-bool.js';
import { SNAPSHOT_COMPETITOR_TIMEOUT_MS } from '../../config/snapshot-public.js';
import { applyDeterministicRecordToPreview } from '../mappers/public-preview.mapper.js';
import { isSnapshotTokenExpired } from '../domain/snapshot-token-policy.js';
import {
  findFreeSnapshotAuditByToken,
  invalidateSnapshotToken,
  loadSnapshotReconAndUx,
} from '../repositories/snapshot-route.repository.js';

export type SnapshotPollResult =
  | { type: 'not_found' }
  | { type: 'expired' }
  | { type: 'running'; status: string; snapshotToken: string }
  | { type: 'failed'; snapshotToken: string }
  | { type: 'completed'; preview: FreeSnapshotPreview }
  | { type: 'data_not_ready'; snapshotToken: string };

export async function pollSnapshotStatus(params: {
  snapshotToken: string;
  compare: unknown;
  includeCompetitor: unknown;
}): Promise<SnapshotPollResult> {
  const { data: audit, error: auditErr } = await findFreeSnapshotAuditByToken(params.snapshotToken);
  if (auditErr || !audit) {
    return { type: 'not_found' };
  }

  const status = audit.status as string;
  if (isSnapshotTokenExpired(String(audit.created_at), SNAPSHOT_TOKEN_TTL_HOURS)) {
    await invalidateSnapshotToken(audit.id as string);
    return { type: 'expired' };
  }

  if (status !== 'completed' && status !== 'failed') {
    return { type: 'running', status, snapshotToken: params.snapshotToken };
  }

  if (status === 'failed') {
    return { type: 'failed', snapshotToken: params.snapshotToken };
  }

  const [{ data: recon }, { data: uxDomain }] = await loadSnapshotReconAndUx(audit.id as string);
  const rawData = uxDomain?.raw_data as Record<string, unknown> | null | undefined;
  const det = rawData?.snapshot_deterministic as Record<string, unknown> | undefined;
  if (
    !uxDomain ||
    typeof det !== 'object' ||
    det === null ||
    typeof det.overall_score !== 'number' ||
    !Number.isFinite(det.overall_score)
  ) {
    return { type: 'data_not_ready', snapshotToken: params.snapshotToken };
  }

  const companyUrl = audit.company_url as string;
  const preview: FreeSnapshotPreview = {
    audit_id: audit.id as string,
    snapshot_token: params.snapshotToken,
    status: 'completed',
    company_url: companyUrl,
    company_name: (recon?.company_name as string | null) ?? (audit.company_name as string | null) ?? null,
    tech_stack: (recon?.tech_stack as Record<string, string[]>) ?? {},
    location: (recon?.location as string | null) ?? null,
    ux_score: (uxDomain.score as number | null) ?? null,
    ux_label: (uxDomain.label as string | null) ?? null,
    ux_summary: (uxDomain.summary as string | null) ?? null,
    issues: ((uxDomain.issues as unknown[]) ?? []).slice(
      0,
      REQUEST_FIELD_LIMITS.freeSnapshotPreviewItemsMax,
    ) as FreeSnapshotPreview['issues'],
    quick_wins: ((uxDomain.quick_wins as unknown[]) ?? []).slice(
      0,
      REQUEST_FIELD_LIMITS.freeSnapshotPreviewItemsMax,
    ) as FreeSnapshotPreview['quick_wins'],
  };

  applyDeterministicRecordToPreview(preview, det);

  const needsDeterministicHeal =
    typeof preview.overall_score !== 'number' ||
    preview.ux_score === null ||
    preview.issues.length === 0;

  if (needsDeterministicHeal) {
    const host = normalizeSnapshotHost(companyUrl);
    const cached = host ? await readSnapshotCache(host) : null;
    if (cached) {
      if (typeof preview.overall_score !== 'number') {
        applyDeterministicRecordToPreview(preview, snapshotPayloadToDeterministicApiRecord(cached));
      }
      const uxFields = derivePublicUxFieldsFromSnapshotPayload(cached);
      if (preview.ux_score === null) {
        preview.ux_score = uxFields.ux_score;
        preview.ux_label = uxFields.ux_label;
        preview.ux_summary = uxFields.ux_summary;
      }
      if (preview.issues.length === 0) preview.issues = uxFields.issues;
      if (preview.quick_wins.length === 0) preview.quick_wins = uxFields.quick_wins;
      if (!preview.homepage_snippet && cached.homepage_snippet) preview.homepage_snippet = cached.homepage_snippet;
      if (
        cached.tech_stack_tentative &&
        cached.tech_stack_tentative.length > 0 &&
        !(preview.tech_stack_tentative && preview.tech_stack_tentative.length > 0)
      ) {
        preview.tech_stack_tentative = cached.tech_stack_tentative;
      }
      if (cached.ai_visibility && !preview.ai_visibility) preview.ai_visibility = cached.ai_visibility;
    }
  }

  if (preview.ux_score === null && typeof preview.overall_score === 'number') {
    preview.ux_score = overallToLegacyScore(preview.overall_score);
    preview.ux_label = legacyUxLabelForScore(preview.ux_score);
    if (!preview.ux_summary && typeof preview.scan_basis === 'string' && preview.scan_basis.length > 0) {
      const s = preview.scan_basis;
      preview.ux_summary = `${s.slice(0, SNAPSHOT_UX_SUMMARY_MAX_CHARS)}${s.length > SNAPSHOT_UX_SUMMARY_MAX_CHARS ? '…' : ''}`;
    }
  }

  const wantCompetitor =
    isTruthyQueryValue(params.compare) || isTruthyQueryValue(params.includeCompetitor);
  if (wantCompetitor) {
    const pagesCrawled = (recon?.pages_crawled as CrawledPage[] | null) ?? null;
    const competitor = await maybeBuildCompetitorMini(companyUrl, pagesCrawled, SNAPSHOT_COMPETITOR_TIMEOUT_MS);
    if (competitor) preview.competitor_mini = competitor;
  }

  const access = computePublicSnapshotAccessFlags(preview, det);
  if (access.blocked) {
    preview.snapshot_access_blocked = true;
    preview.snapshot_access_robots_blocked = access.robots;
  } else {
    delete preview.snapshot_access_blocked;
    delete preview.snapshot_access_robots_blocked;
  }

  return { type: 'completed', preview };
}
