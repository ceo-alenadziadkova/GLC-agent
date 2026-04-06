/**
 * Copy for public pre-brief success screens + typed accessors for intake token metadata.
 */

import type { BriefResponses } from '../data/briefQuestions';
import { isBriefValueBlank } from '../data/briefQuestions';
import { isIndustryOption } from '../data/industry-options';

export type IntakeClientMetadata = {
  company_name?: string;
  /** Pre-fills "Company website" on the public pre-brief form; client can edit. */
  company_website?: string;
  /** Pre-fills "Industry"; client can edit. */
  industry?: string;
  /** When industry is Other, pre-fills the sector description on the public pre-brief. */
  industry_specify?: string;
  message?: string;
  consultant_name?: string;
  /** When the client should expect contact, e.g. "24 hours", "Friday", "our Thursday call". */
  expected_contact?: string;
  /** Channel, e.g. "WhatsApp", "phone", "email". */
  contact_channel?: string;
  consultant_email?: string;
  consultant_whatsapp?: string;
};

export function parseIntakeClientMetadata(raw: Record<string, unknown>): IntakeClientMetadata {
  const str = (key: string): string | undefined => {
    const v = raw[key];
    if (typeof v !== 'string') return undefined;
    const t = v.trim();
    return t.length ? t : undefined;
  };
  return {
    company_name: str('company_name'),
    company_website: str('company_website'),
    industry: str('industry'),
    industry_specify: str('industry_specify'),
    message: str('message'),
    consultant_name: str('consultant_name'),
    expected_contact: str('expected_contact'),
    contact_channel: str('contact_channel'),
    consultant_email: str('consultant_email'),
    consultant_whatsapp: str('consultant_whatsapp'),
  };
}

function formatTimingPhrase(when: string): string {
  const t = when.trim();
  if (!t) return 'within 24 hours';
  if (/^(within|before|by|after)\s/i.test(t)) return t;
  return `within ${t}`;
}

/** Natural sentence for when / how follow-up happens (consultant-configured). */
export function buildFollowUpExpectationLine(meta: IntakeClientMetadata): string | null {
  const channel = meta.contact_channel?.trim();
  const when = meta.expected_contact?.trim();
  if (!channel && !when) return null;
  const timing = when ? formatTimingPhrase(when) : 'within 24 hours';
  if (channel) {
    return `Expect contact on ${channel} ${timing}.`;
  }
  return `Expect to hear from us ${timing}.`;
}

const INTAKE_METADATA_TO_RESPONSE_FIELD: Array<{ metaKey: string; fieldId: string }> = [
  { metaKey: 'company_name', fieldId: 'intake_company_name' },
  { metaKey: 'company_website', fieldId: 'intake_company_website' },
  { metaKey: 'industry', fieldId: 'intake_industry' },
];

/**
 * Seeds empty pre-brief answer fields from token metadata (consultant pre-fill).
 * Does not overwrite existing client answers.
 */
export function applyIntakeMetadataPrefill(
  responses: BriefResponses,
  metadata: Record<string, unknown>,
): BriefResponses {
  const out: BriefResponses = { ...responses };
  for (const { metaKey, fieldId } of INTAKE_METADATA_TO_RESPONSE_FIELD) {
    if (!isBriefValueBlank(out[fieldId])) continue;
    const v = metadata[metaKey];
    if (typeof v !== 'string' || !v.trim()) continue;
    const trimmed = v.trim();
    if (fieldId === 'intake_industry' && !isIndustryOption(trimmed)) continue;
    out[fieldId] = { value: trimmed, source: 'client' };
  }

  const metaSpec = metadata.industry_specify;
  if (typeof metaSpec === 'string' && metaSpec.trim() && isBriefValueBlank(out.intake_industry_specify)) {
    const ind = out.intake_industry;
    const indVal =
      ind != null && typeof ind === 'object' && !Array.isArray(ind) && 'value' in ind
        ? (ind as { value: unknown }).value
        : ind;
    if (indVal === 'Other') {
      out.intake_industry_specify = { value: metaSpec.trim(), source: 'client' };
    }
  }

  return out;
}

/** True if the consultant sent any structured pre-fill for the three identity fields. */
export function hasIntakeConsultantPrefill(metadata: Record<string, unknown>): boolean {
  const hasCore = INTAKE_METADATA_TO_RESPONSE_FIELD.some(({ metaKey, fieldId }) => {
    const v = metadata[metaKey];
    if (typeof v !== 'string' || !v.trim()) return false;
    if (fieldId === 'intake_industry') return isIndustryOption(v.trim());
    return true;
  });
  const ind = typeof metadata.industry === 'string' ? metadata.industry.trim() : '';
  const spec = typeof metadata.industry_specify === 'string' ? metadata.industry_specify.trim() : '';
  if (ind === 'Other' && spec) return true;
  return hasCore;
}

export function buildIntakeContactFooterLines(meta: IntakeClientMetadata): string[] {
  const lines: string[] = [];
  if (meta.consultant_email) {
    lines.push(`Questions? Email ${meta.consultant_email}.`);
  }
  if (meta.consultant_whatsapp) {
    lines.push(`WhatsApp: ${meta.consultant_whatsapp}.`);
  }
  return lines;
}
