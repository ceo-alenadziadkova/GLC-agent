import {
  DISCOVERY_BRIEF_PATCH_A5_MULTI_PAGE_SITE,
  DISCOVERY_BRIEF_PATCH_A5_NO_WEBSITE_YET,
  ensureHttpsUrl,
} from '@glc/intake-core';
import type { User } from '@supabase/supabase-js';
import type { BriefResponseSource } from '../data/auditTypes';
import { ApiError } from '../data/api-error';
import type { BriefResponseEntry, BriefResponses } from '../data/briefQuestions';
import { A11_VALUE_WHEN_NO_PUBLIC_SITE } from '../data/briefQuestions';
import { isIndustryOption } from '../data/industry-options';

export function unwrapBriefString(responses: BriefResponses, id: string): string | undefined {
  const raw = responses[id];
  if (raw == null) return undefined;
  const v =
    typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw
      ? (raw as BriefResponseEntry).value
      : raw;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

/** Map pre-brief website answer to audit URL; skip placeholders with no real site. */
export function websiteAnswerToAuditUrl(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const lower = t.toLowerCase();
  const isNoWebsitePlaceholder =
    lower === A11_VALUE_WHEN_NO_PUBLIC_SITE ||
    lower === 'no website' ||
    lower === 'n/a' ||
    lower === 'na';
  if (isNoWebsitePlaceholder) return undefined;
  return ensureHttpsUrl(t);
}

/** Aligns step-0 Basics fields with intake brief question ids before save. */
export function buildStep0IntakePatch(
  name: string,
  industry: string,
  industrySpecify: string,
  url: string,
  noPublicWebsite: boolean,
  source: BriefResponseSource = 'consultant',
): Partial<BriefResponses> {
  const patch: Partial<BriefResponses> = {};
  const nt = name.trim();
  if (nt) {
    patch.a12 = { value: nt, source };
  }
  if (industry.trim() && isIndustryOption(industry)) {
    patch.a2 = { value: industry, source };
  }
  const spec = industrySpecify.trim();
  if (industry.trim() === 'Other' && spec) {
    patch.intake_industry_specify = { value: spec, source };
  }
  if (noPublicWebsite) {
    patch.a11 = { value: A11_VALUE_WHEN_NO_PUBLIC_SITE, source };
    patch.a5 = { value: DISCOVERY_BRIEF_PATCH_A5_NO_WEBSITE_YET, source };
  } else {
    const ut = url.trim();
    if (ut) {
      patch.a11 = {
        value: ensureHttpsUrl(ut),
        source,
      };
      patch.a5 = { value: DISCOVERY_BRIEF_PATCH_A5_MULTI_PAGE_SITE, source };
    }
  }
  return patch;
}

export function defaultConsultantDisplayName(user: User | null | undefined): string {
  if (!user) return '';
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const full = typeof meta?.full_name === 'string' ? meta.full_name.trim() : '';
  if (full) return full;
  return user.email?.split('@')[0]?.trim() ?? '';
}

/** POST /api/audits returns 503 when no valid self-serve owner is configured (`code: SELF_SERVE_OWNER_UNAVAILABLE`). */
export function isSelfServeOwnerConfigApiError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  if (err.status !== 503) return false;
  if (err.code === 'SELF_SERVE_OWNER_UNAVAILABLE') return true;
  // For correctness we rely on stable machine-readable `code` only.
  return false;
}
