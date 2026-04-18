/**
 * Public Discovery wizard order + rows derived from `intake-policy.v1.json` (`modes.discovery.publicWizardOrder`),
 * `question-bank.v1.json`, and `bank-question-ui-overrides.v1.json`.
 */
import type { BriefQuestion } from './audit-contract.js';
import { buildBriefQuestionStemFromBankId } from './bank-question-presentation.js';
import { INTAKE_POLICY_V1 } from './core/load-policy.js';
import { getQuestionBankSchemaMeta } from './question-bank.js';

export type DiscoveryWizardQuestionSpec = {
  id: string;
  question: string;
  hint?: string;
  type: BriefQuestion['type'];
  optional?: boolean;
};

/**
 * Fallback when `intake-policy.v1.json` omits `modes.discovery.publicWizardOrder`
 * (e.g. older frozen artifact bundles shipped without that field).
 *
 * **Not** a second editorial source of truth: the live policy file should always
 * define `publicWizardOrder`; this array only prevents a broken wizard when an old
 * bundle is loaded. When changing Discovery order for current releases, edit the
 * policy JSON — then mirror any intentional default here so offline/stale bundles
 * stay consistent with the last known good order.
 */
const DEFAULT_PUBLIC_DISCOVERY_WIZARD_BANK_IDS = [
  'a2',
  'a1',
  'a4',
  'a7',
  'd1',
  'd1b',
  'c_nosite_1',
  'c_nosite_4',
  'd2',
  'f1',
  'f9',
] as const;

/** Canonical public Discovery wizard order before policy filtering (`modes.discovery.included`). */
export const PUBLIC_DISCOVERY_WIZARD_BANK_IDS: readonly string[] =
  INTAKE_POLICY_V1.modes.discovery.publicWizardOrder?.length
    ? INTAKE_POLICY_V1.modes.discovery.publicWizardOrder
    : [...DEFAULT_PUBLIC_DISCOVERY_WIZARD_BANK_IDS];

/**
 * One wizard row: label + control metadata from bank + UI overrides (same path as Brief wizard).
 */
export function buildDiscoveryQuestionRow(
  id: string,
): DiscoveryWizardQuestionSpec & { options?: string[] } {
  const meta = getQuestionBankSchemaMeta(id);
  if (!meta) {
    throw new Error(`discovery wizard: unknown bank id "${id}"`);
  }
  const stem = buildBriefQuestionStemFromBankId(id);
  const optional = meta.priority === 'optional';
  return {
    ...stem,
    ...(optional ? { optional: true } : {}),
  };
}

/**
 * Full wizard row list before policy filter (`modes.discovery.included`).
 */
export function buildDiscoveryWizardQuestions(): Array<DiscoveryWizardQuestionSpec & { options?: string[] }> {
  const questions = PUBLIC_DISCOVERY_WIZARD_BANK_IDS.map(id => buildDiscoveryQuestionRow(id));

  if (questions.length !== PUBLIC_DISCOVERY_WIZARD_BANK_IDS.length) {
    throw new Error('discovery wizard ids drift: question count mismatch');
  }
  for (let i = 0; i < PUBLIC_DISCOVERY_WIZARD_BANK_IDS.length; i += 1) {
    if (questions[i]?.id !== PUBLIC_DISCOVERY_WIZARD_BANK_IDS[i]) {
      throw new Error(`discovery wizard ids drift: expected ${PUBLIC_DISCOVERY_WIZARD_BANK_IDS[i]} at index ${i}`);
    }
  }

  return questions;
}
