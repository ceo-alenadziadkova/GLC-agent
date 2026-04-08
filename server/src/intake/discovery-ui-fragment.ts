/**
 * Public Discovery wizard copy and order — canonical source for the SPA (fetched from
 * GET /api/discover/ui-fragment). Fallback in `src/app/lib/discovery-flow.ts` uses
 * `buildDiscoveryWizardQuestions` from `discovery-wizard-questions.ts` (single list).
 */
import { QUESTION_BANK_VERSION } from './question-bank.js';
import { INTAKE_POLICY_V1 } from './core/load-policy.js';
import { getBankQuestionUiOptions } from './bank-question-ui-overrides.js';
import { INDUSTRY_OPTIONS } from '../config/industry-options.js';
import type { BriefQuestion, IntakeVersionTuple } from '../types/audit.js';
import { buildDiscoveryWizardQuestions } from './discovery-wizard-questions.js';
import { currentIntakeVersionTuple } from './core/versions.js';

export type DiscoveryUiFragmentQuestion = {
  id: string;
  question: string;
  hint?: string;
  type: BriefQuestion['type'];
  options?: string[];
  optional?: boolean;
};

export type PublicDiscoveryUiFragment = {
  version: string;
  policyVersion: string;
  questionBankVersion: string;
  /** Full ADR version tuple used to render / correlate analytics. */
  intake_versions: IntakeVersionTuple;
  questions: DiscoveryUiFragmentQuestion[];
};

function bankOrFallback(id: string, fallback: readonly string[]): string[] {
  const o = getBankQuestionUiOptions(id);
  return o ? [...o] : [...fallback];
}

function buildWizardQuestions(): DiscoveryUiFragmentQuestion[] {
  return buildDiscoveryWizardQuestions({
    bankOrFallback,
    industryOptions: INDUSTRY_OPTIONS,
  });
}

export function buildPublicDiscoveryUiFragment(): PublicDiscoveryUiFragment {
  const included = new Set(INTAKE_POLICY_V1.modes.discovery.included);
  const questions = buildWizardQuestions().filter(q => included.has(q.id));
  return {
    version: '1',
    policyVersion: INTAKE_POLICY_V1.version,
    questionBankVersion: QUESTION_BANK_VERSION,
    intake_versions: currentIntakeVersionTuple(),
    questions,
  };
}
