/**
 * Enrich GET /api/audits/:id for completed free_snapshot: mirror GET /api/snapshot/:token
 * cache heal so the client portal shows the same issues, quick wins, scores, and deterministic
 * fields when DB columns were empty but the snapshot domain cache still has the payload.
 */

import { readSnapshotCache, normalizeSnapshotHost } from '../snapshot/cache.js';
import {
  derivePublicUxFieldsFromSnapshotPayload,
  snapshotPayloadToDeterministicApiRecord,
} from '../snapshot/run-snapshot.js';

export async function healUxDomainRowForFreeSnapshotPortal(
  uxRow: Record<string, unknown>,
  companyUrl: string,
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { ...uxRow };
  const rawData =
    typeof out.raw_data === 'object' && out.raw_data !== null && !Array.isArray(out.raw_data)
      ? { ...(out.raw_data as Record<string, unknown>) }
      : {};
  let det =
    typeof rawData.snapshot_deterministic === 'object' &&
    rawData.snapshot_deterministic !== null &&
    !Array.isArray(rawData.snapshot_deterministic)
      ? { ...(rawData.snapshot_deterministic as Record<string, unknown>) }
      : {};

  const issues = Array.isArray(out.issues) ? out.issues : [];
  const quickWins = Array.isArray(out.quick_wins) ? out.quick_wins : [];
  const score = out.score;
  const summary = typeof out.summary === 'string' ? out.summary : '';

  const needsDeterministicHeal =
    typeof det.overall_score !== 'number' ||
    score == null ||
    issues.length === 0 ||
    quickWins.length === 0 ||
    !summary.trim();

  if (!needsDeterministicHeal) {
    return out;
  }

  const host = normalizeSnapshotHost(companyUrl);
  const cached = host ? await readSnapshotCache(host) : null;
  if (!cached) {
    return out;
  }

  const uxFields = derivePublicUxFieldsFromSnapshotPayload(cached);
  if (issues.length === 0 && uxFields.issues.length > 0) {
    out.issues = uxFields.issues;
  }
  if (quickWins.length === 0 && uxFields.quick_wins.length > 0) {
    out.quick_wins = uxFields.quick_wins;
  }
  if (score == null && uxFields.ux_score != null) {
    out.score = uxFields.ux_score;
    out.label = uxFields.ux_label;
  }
  if (!summary.trim() && uxFields.ux_summary) {
    out.summary = uxFields.ux_summary;
  }

  const detRecord = snapshotPayloadToDeterministicApiRecord(cached);
  det = { ...detRecord, ...det };
  rawData.snapshot_deterministic = det;
  out.raw_data = rawData;

  return out;
}
