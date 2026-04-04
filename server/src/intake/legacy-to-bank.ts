/**
 * Maps legacy `intake_brief` field ids (primary_goal, intake_company_website, …)
 * into question-bank v1 keys when those bank slots are still empty.
 * Does not overwrite explicit bank answers. Idempotent across saves.
 */
import type { IntakeResponsesMap } from './types.js';
import { getResponseString, isIntakeAnswered, unwrapIntakeValue } from './unwrap.js';

function cloneAnswerCell(legacyVal: unknown): unknown {
  if (
    legacyVal &&
    typeof legacyVal === 'object' &&
    !Array.isArray(legacyVal) &&
    'value' in (legacyVal as Record<string, unknown>)
  ) {
    const o = legacyVal as { value: unknown; source?: string };
    return { value: o.value, source: o.source ?? 'client' };
  }
  return legacyVal;
}

function setFromLegacyIfEmpty(
  responses: IntakeResponsesMap,
  bankKey: string,
  legacyKey: string,
): void {
  if (isIntakeAnswered(responses[bankKey])) return;
  if (!isIntakeAnswered(responses[legacyKey])) return;
  responses[bankKey] = cloneAnswerCell(responses[legacyKey]);
}

function setPlainIfEmpty(responses: IntakeResponsesMap, bankKey: string, value: string): void {
  if (isIntakeAnswered(responses[bankKey])) return;
  if (!value.trim()) return;
  responses[bankKey] = value.trim();
}

function mapHandlesPaymentsToA6(raw: unknown): string | null {
  const s = String(unwrapIntakeValue(raw) ?? '').trim();
  if (!s) return null;
  if (s.startsWith('Yes — we process card')) return 'Yes';
  if (s.startsWith('No — we use Stripe')) return 'Sometimes';
  if (s.startsWith('No payments on site')) return 'No, offline only';
  return null;
}

function mapHasGaToC3(raw: unknown): string | null {
  const s = String(unwrapIntakeValue(raw) ?? '').trim();
  if (!s) return null;
  if (s === 'Yes, GA4') return 'Yes, GA4';
  if (s === 'Yes, Universal Analytics' || s === 'Yes, other tool') return 'Yes, another tool';
  if (s === 'No') return 'No';
  if (s === 'Not sure') return "Don't know";
  return null;
}

function mapSearchConsoleToC4(raw: unknown): string | null {
  const s = String(unwrapIntakeValue(raw) ?? '').trim();
  if (!s) return null;
  if (s === 'Yes') return 'Yes';
  if (s === 'No') return 'No';
  if (s === 'Not sure') return "What's that?";
  return null;
}

function mapGdprToE2(raw: unknown): string | null {
  const s = String(unwrapIntakeValue(raw) ?? '').trim();
  if (!s) return null;
  if (s === 'Yes') return 'Yes';
  if (s === 'No') return 'No';
  if (s === 'Partially') return 'Not sure';
  return null;
}

function mapEmailAutomationToD5(raw: unknown): string | null {
  const s = String(unwrapIntakeValue(raw) ?? '').trim();
  if (!s) return null;
  if (s.startsWith('Yes, fully')) return 'Yes, actively';
  if (s.startsWith('Partial')) return "We set something up but it's not maintained";
  if (s === 'No') return 'No';
  return null;
}

/** Legacy budget labels (€) to bank f5 labels (docs/QUESTION_BANK.md §F). */
function mapBudgetToF5(raw: unknown): string | null {
  const s = String(unwrapIntakeValue(raw) ?? '').trim();
  if (!s) return null;
  if (s === '< €1k') return '€500–2,000';
  if (s === '€1k – €5k') return '€500–2,000';
  if (s === '€5k – €20k') return '€2,000–10,000';
  if (s === '€20k – €50k' || s === '> €50k') return 'Over €10,000';
  if (s === 'No budget decided yet') {
    return 'No clear budget yet — depends on the recommendations';
  }
  return null;
}

const LEGACY_TRAFFIC_TO_B2: Record<string, string> = {
  'Organic search (SEO)': 'Google',
  'Paid ads (Google/Meta)': 'Paid ads',
  'Social media': 'Social media',
  'Direct / referral': 'Word of mouth',
  Email: 'Email',
  'Word of mouth': 'Word of mouth',
};

function mapMainTrafficToB2(raw: unknown): string[] | null {
  const v = unwrapIntakeValue(raw);
  const list = Array.isArray(v) ? v.map(x => String(x).trim()) : typeof v === 'string' && v ? [v.trim()] : [];
  if (!list.length) return null;
  const out = new Set<string>();
  for (const item of list) {
    if (item.toLowerCase().includes("don't know")) continue;
    const mapped = LEGACY_TRAFFIC_TO_B2[item];
    if (mapped) out.add(mapped);
  }
  return out.size > 0 ? Array.from(out) : null;
}

function synthesizeA1(responses: IntakeResponsesMap): string | null {
  const name = getResponseString(responses, 'intake_company_name');
  const ind = unwrapIntakeValue(responses.intake_industry);
  const indStr = typeof ind === 'string' ? ind.trim() : '';
  const spec = getResponseString(responses, 'intake_industry_specify');
  const industry =
    indStr === 'Other' && spec ? spec : indStr === 'Other' ? '' : indStr;
  if (!name && !industry) return null;
  if (name && industry) return `${name} — ${industry}`;
  return name || industry;
}

/** Heuristic a5 from pre-brief website field (URL or "none"). */
function deriveA5FromIntakeWebsite(responses: IntakeResponsesMap): string | null {
  const raw = unwrapIntakeValue(responses.intake_company_website);
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return null;
  if (
    s === 'none' ||
    s === 'n/a' ||
    s.includes('no website') ||
    (s === 'no' && !s.includes('.')) ||
    s.includes('social only') ||
    s.includes('no url')
  ) {
    return 'No website yet';
  }
  if (s.includes('under construction')) return 'Under construction';
  if (s.includes('landing') && !s.includes('multi')) return 'Yes, single landing page';
  return 'Yes, multi-page site';
}

/**
 * Mutates a shallow copy-safe map: pass `{ ...existing }` if the source object must stay frozen.
 */
export function mergeLegacyResponsesIntoBankV1(responses: IntakeResponsesMap): IntakeResponsesMap {
  const r = responses;

  const a1s = synthesizeA1(r);
  if (a1s) setPlainIfEmpty(r, 'a1', a1s);

  setFromLegacyIfEmpty(r, 'a2', 'intake_industry');

  const a5Derived = deriveA5FromIntakeWebsite(r);
  if (a5Derived) setPlainIfEmpty(r, 'a5', a5Derived);

  const a6m = mapHandlesPaymentsToA6(r.handles_payments);
  if (a6m) setPlainIfEmpty(r, 'a6', a6m);

  setFromLegacyIfEmpty(r, 'b1', 'target_audience');
  setFromLegacyIfEmpty(r, 'b3', 'unique_value_prop');

  const b2m = mapMainTrafficToB2(r.main_traffic_source);
  if (b2m && !isIntakeAnswered(r.b2)) {
    r.b2 = b2m;
  }

  setFromLegacyIfEmpty(r, 'c5', 'primary_cta');
  setFromLegacyIfEmpty(r, 'c6', 'biggest_ux_complaint');
  setFromLegacyIfEmpty(r, 'c8', 'main_competitors');

  const c3m = mapHasGaToC3(r.has_google_analytics);
  if (c3m) setPlainIfEmpty(r, 'c3', c3m);
  const c4m = mapSearchConsoleToC4(r.has_search_console);
  if (c4m) setPlainIfEmpty(r, 'c4', c4m);

  const uses = getResponseString(r, 'uses_crm');
  if (uses && !/^no(?:ne)?$/i.test(uses.trim()) && !isIntakeAnswered(r.d1)) {
    r.d1 = [`CRM — ${uses.trim()}`];
  }

  const d5m = mapEmailAutomationToD5(r.email_automation);
  if (d5m) setPlainIfEmpty(r, 'd5', d5m);

  const e2m = mapGdprToE2(r.gdpr_region);
  if (e2m) setPlainIfEmpty(r, 'e2', e2m);

  if (!isIntakeAnswered(r.f1)) {
    if (isIntakeAnswered(r.biggest_pain)) {
      r.f1 = cloneAnswerCell(r.biggest_pain);
    } else if (isIntakeAnswered(r.primary_goal)) {
      r.f1 = cloneAnswerCell(r.primary_goal);
    }
  }

  const f5m = mapBudgetToF5(r.budget_for_changes);
  if (f5m) setPlainIfEmpty(r, 'f5', f5m);

  const kw = getResponseString(r, 'top_keywords');
  if (kw) setPlainIfEmpty(r, 'f6', `Legacy note — target keywords: ${kw}`);

  return r;
}
