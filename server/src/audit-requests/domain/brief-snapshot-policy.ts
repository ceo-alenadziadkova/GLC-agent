import { AUDIT_REQUEST_BRIEF_SNAPSHOT_INDUSTRY_OTHER_MESSAGE } from '../../config/api-error-codes.js';

export type BriefSnapshotPolicyResult =
  | { ok: true; snapshot: Record<string, unknown> }
  | { ok: false; error: string };

/** Ensures "Other" industry has a non-empty specify field in snapshot. */
export function normalizeBriefSnapshotForIndustry(
  industry: string | null | undefined,
  briefSnapshot: Record<string, unknown>,
): BriefSnapshotPolicyResult {
  const snapshot = { ...briefSnapshot };
  if ((industry ?? '').trim() === 'Other') {
    const raw = snapshot.intake_industry_specify;
    const normalized = typeof raw === 'string' ? raw.trim() : '';
    if (!normalized) {
      return { ok: false, error: AUDIT_REQUEST_BRIEF_SNAPSHOT_INDUSTRY_OTHER_MESSAGE };
    }
    snapshot.intake_industry_specify = normalized;
  } else {
    delete snapshot.intake_industry_specify;
  }
  return { ok: true, snapshot };
}
