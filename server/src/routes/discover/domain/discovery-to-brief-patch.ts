import {
  buildPublicDiscoveryUiFragment,
  DISCOVERY_BRIEF_PATCH_A5_NO_WEBSITE_YET,
  DISCOVERY_BRIEF_PATCH_C3_ANALYTICS_NOT_ON_SITE,
  DISCOVERY_BRIEF_USES_CRM_NO,
  DISCOVERY_BRIEF_USES_CRM_YES,
  discoveryCnSite1SelectionsImplyFirstPartyWeb,
  inferDiscoveryUsesCrm,
} from '@glc/intake-core';

export type BriefEntry = { value: unknown; source: 'client' | 'unknown' };

/** Canonical question-bank ids used by public discovery (single source: server UI fragment). */
const DISCOVERY_BANK_KEYS = buildPublicDiscoveryUiFragment().questions.map(q => q.id);

function normalizedPresenceFromBank(answers: Record<string, unknown>): string[] {
  const v = answers.c_nosite_1;
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
}

/**
 * Maps bank-ID discovery answers (a2, d1, c_nosite_*, …) into brief cells.
 */
function discoveryBankIdsToBriefPatch(answers: Record<string, unknown>): Record<string, BriefEntry> {
  const tag = (v: unknown): BriefEntry => ({ value: v, source: 'client' });
  const unk = (): BriefEntry => ({ value: null, source: 'unknown' });
  const patch: Record<string, BriefEntry> = {};

  for (const key of DISCOVERY_BANK_KEYS) {
    if (key === 'a5') continue;
    const v = answers[key];
    if (v == null) continue;
    if (typeof v === 'string' && !v.trim()) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    patch[key] = tag(v);
  }
  patch.a5 = tag(DISCOVERY_BRIEF_PATCH_A5_NO_WEBSITE_YET);

  for (const key of DISCOVERY_BANK_KEYS) {
    const side = `${key}__other`;
    const raw = answers[side];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    if (key === 'a2') {
      patch.intake_industry_specify = tag(raw.trim());
    } else {
      patch[side] = tag(raw.trim());
    }
  }

  const pres = normalizedPresenceFromBank(answers);
  if (pres.length > 0 && !discoveryCnSite1SelectionsImplyFirstPartyWeb(pres)) {
    patch.c3 = tag(DISCOVERY_BRIEF_PATCH_C3_ANALYTICS_NOT_ON_SITE);
  }

  const d1 = Array.isArray(answers.d1) ? (answers.d1 as string[]) : [];
  const crmInference = inferDiscoveryUsesCrm(d1, answers.d1b);
  if (crmInference === 'yes') {
    patch.uses_crm = tag(DISCOVERY_BRIEF_USES_CRM_YES);
  } else if (crmInference === 'no') {
    patch.uses_crm = tag(DISCOVERY_BRIEF_USES_CRM_NO);
  } else {
    patch.uses_crm = unk();
  }

  if (!patch.b1) patch.b1 = unk();
  if (!patch.c5) patch.c5 = unk();
  if (!patch.c3) patch.c3 = unk();
  if (!patch.a6) patch.a6 = unk();

  return patch;
}

/**
 * Maps discovery answers into intake-brief format.
 *
 * Only bank-id shaped discovery payloads are supported (public wizard contract).
 * Pre-bank discovery field names (`industry`, `online_presence`, …) are no longer mapped.
 *
 * Fields we can derive from discovery answers are tagged source:'client'.
 * Required brief fields that cannot be determined from a discovery session
 * are tagged source:'unknown' so the brief-validator counts them as "answered"
 * (consultant-flagged unknowns) and allows the pipeline to start.
 * Monetization is bank id **`a10`** only when present in session answers; no legacy **`revenue_model`** cell is synthesized.
 */
export function discoveryToBriefPatch(answers: Record<string, unknown>): Record<string, BriefEntry> {
  return discoveryBankIdsToBriefPatch(answers);
}

export function coerceDiscoverySessionAnswers(value: unknown): Record<string, unknown> {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
