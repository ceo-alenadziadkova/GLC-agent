/**
 * Fills legacy brief keys from question-bank v1 answers so SLA gates match consultant wizard flows.
 * Does not overwrite non-empty legacy cells. Runs after mergeLegacyResponsesIntoBankV1.
 */
import { mergeLegacyResponsesIntoBankV1 } from './legacy-to-bank.js';
import type { IntakeResponsesMap } from './types.js';
import { isIntakeAnswered, unwrapIntakeValue } from './unwrap.js';

function toCell(value: unknown, source: string): Record<string, unknown> {
  if (value != null && typeof value === 'object' && !Array.isArray(value) && 'value' in (value as Record<string, unknown>)) {
    const o = value as { value: unknown; source?: string };
    return { value: o.value, source: o.source ?? source };
  }
  return { value, source };
}

function setLegacyIfEmpty(target: IntakeResponsesMap, key: string, bankVal: unknown, source = 'consultant'): void {
  if (isIntakeAnswered(target[key])) return;
  if (!isIntakeAnswered(bankVal)) return;
  target[key] = toCell(bankVal, source);
}

/** Map bank a6 labels to legacy handles_payments single_choice strings. */
export function mapA6ToHandlesPaymentsLegacy(a6: unknown): string | null {
  const s = String(unwrapIntakeValue(a6) ?? '').trim();
  if (!s) return null;
  // 'Yes' covers both direct card processing and hosted-checkout (Stripe/PayPal);
  // we use the broader label so legacy gates treat both as "online payments active".
  if (s === 'Yes') return 'Yes — we process card data';
  if (s === 'Sometimes' || s === 'Rarely') return 'No — we use Stripe/PayPal/etc. hosted checkout';
  if (s.toLowerCase().includes('offline')) return 'No payments on site';
  if (s === 'Not sure') return 'No — we use Stripe/PayPal/etc. hosted checkout';
  return null;
}

/** Map bank c3 labels to legacy has_google_analytics strings. */
export function mapC3ToHasGoogleAnalyticsLegacy(c3: unknown): string | null {
  const s = String(unwrapIntakeValue(c3) ?? '').trim();
  if (!s) return null;
  if (s === 'Yes, GA4') return 'Yes, GA4';
  if (s === 'Yes, another tool') return 'Yes, other tool';
  if (s === 'No') return 'No';
  if (s === "Don't know") return 'Not sure';
  return null;
}

export function hydrateLegacyFromBankForGates(responses: IntakeResponsesMap): IntakeResponsesMap {
  const out: IntakeResponsesMap = { ...responses };

  if (isIntakeAnswered(out.f1)) {
    setLegacyIfEmpty(out, 'primary_goal', out.f1);
    setLegacyIfEmpty(out, 'biggest_pain', out.f1);
  }

  setLegacyIfEmpty(out, 'target_audience', out.b1);
  setLegacyIfEmpty(out, 'unique_value_prop', out.b3);
  setLegacyIfEmpty(out, 'primary_cta', out.c5);
  setLegacyIfEmpty(out, 'biggest_ux_complaint', out.c6);
  setLegacyIfEmpty(out, 'main_competitors', out.c8);

  const ga = mapC3ToHasGoogleAnalyticsLegacy(out.c3);
  if (ga && !isIntakeAnswered(out.has_google_analytics)) {
    out.has_google_analytics = { value: ga, source: 'consultant' };
  }

  const hp = mapA6ToHandlesPaymentsLegacy(out.a6);
  if (hp && !isIntakeAnswered(out.handles_payments)) {
    out.handles_payments = { value: hp, source: 'consultant' };
  }

  return out;
}

/** mergeLegacyResponsesIntoBankV1 + hydrate — canonical shape for validation and persistence. */
export function prepareBriefForValidation(responses: Record<string, unknown>): Record<string, unknown> {
  const merged = mergeLegacyResponsesIntoBankV1({ ...responses });
  return hydrateLegacyFromBankForGates(merged);
}
