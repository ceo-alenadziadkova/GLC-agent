/**
 * Pre-brief baseline bank ids — shared *operational* minimum on the public link, before branch/case
 * personalization. This is **not** a full client reveal: it is a thin capture (identity + high-level
 * pain/goals) so the pipeline and consultant can start; depth lives in full intake + overlays + session.
 *
 * **Personalized** = everything not in this set (full intake): branch-gated questions, case overlays,
 * vertical rows, optional depth, and express-only required ids not in pre-brief (e.g. c3/c5 when visible).
 *
 * Source of truth: `intake-policy.v1.json` → `modes.pre_brief.identityFieldIds` +
 * `modes.pre_brief.bankIncluded` (same membership as `PRE_BRIEF_PARTICIPATION_IDS` in
 * `intake-brief-catalog-meta.ts`, with a **stable order** here: identity first, then bank-only ids).
 */
import { INTAKE_POLICY_V1 } from './core/load-policy.js';

const preBrief = INTAKE_POLICY_V1.modes.pre_brief;
const identity = preBrief.identityFieldIds ?? [];
const bankIncluded = preBrief.bankIncluded ?? [];
const identitySet = new Set(identity);

/**
 * Ordered bank ids for the minimum shared spine. Identity fields first (policy order), then
 * `bankIncluded` entries not already listed as identity.
 */
export const INTAKE_MINIMUM_CONTEXT_BANK_IDS: readonly string[] = [
  ...identity,
  ...bankIncluded.filter(id => !identitySet.has(id)),
];

const minimumContextSet: ReadonlySet<string> = new Set(INTAKE_MINIMUM_CONTEXT_BANK_IDS);

/** True when `id` is part of the minimum-context baseline (not branch/case-extended). */
export function isIntakeMinimumContextBankId(id: string): boolean {
  return minimumContextSet.has(id);
}
