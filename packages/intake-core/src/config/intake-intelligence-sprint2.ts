import type { FollowupPolicy, SignalContribution, StopCondition } from '../audit-contract.js';
import type {
  IntakeIntelligenceContract,
  IntakeIntelligenceOwnerDomain,
  IntakeIntelligenceStewardship,
} from './intake-intelligence-types.js';
import { QUESTION_BANK_V1_IDS, getQuestionBankSchemaMeta } from '../question-bank.js';

/** Tunable floor for Sprint 2+ contract completeness (ADR Info-Gain Threshold V1 aligns here). */
export const MIN_EXPECTED_INFO_GAIN_BITS_SPRINT2 = 0.3 as const;

/**
 * Sprint 2 gate: section A ∪ B ∪ {c1–c4} ∪ pilot-critical bank ids and all goal (F) ids from the bank.
 * Size is 47 at question-bank v1.3.0 — enforced by tests.
 */
export function computeIntakeIntelligenceSprint2GateIds(): string[] {
  const set = new Set<string>();
  for (const questionId of QUESTION_BANK_V1_IDS) {
    const meta = getQuestionBankSchemaMeta(questionId);
    if (meta?.section === 'A' || meta?.section === 'B') set.add(questionId);
  }
  const extra = [
    'c1',
    'c2',
    'c3',
    'c4',
    'd2',
    'd_closing_flow',
    'f1',
    'f2',
    'f3',
    'f4',
    'f5',
    'f6',
    'f7',
    'f8',
    'f9',
    'f_idea_1',
    'f_idea_2',
    'f_idea_3',
    'f_idea_4',
  ] as const;
  for (const id of extra) {
    if (QUESTION_BANK_V1_IDS.has(id)) set.add(id);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export const INTAKE_INTELLIGENCE_SPRINT2_GATE_IDS: readonly string[] = computeIntakeIntelligenceSprint2GateIds();

const sprint2GateSet = new Set(INTAKE_INTELLIGENCE_SPRINT2_GATE_IDS);

/** Bank ids not in the Sprint 2 gate — next contract-enrichment wave (product-owned). */
export function getIntakeIntelligenceBankIdsOutsideSprint2Gate(): string[] {
  return [...QUESTION_BANK_V1_IDS].filter(id => !sprint2GateSet.has(id)).sort((a, b) => a.localeCompare(b));
}

export const INTAKE_INTELLIGENCE_BANK_IDS_OUTSIDE_SPRINT2_GATE: readonly string[] =
  getIntakeIntelligenceBankIdsOutsideSprint2Gate();

export function isIntakeIntelligenceSprint2GateQuestion(questionId: string): boolean {
  return sprint2GateSet.has(questionId);
}

const DEFAULT_FOLLOWUP: FollowupPolicy = {
  deeperIf: 'Pilot signal remains ambiguous after the first structured response.',
  stopIf: 'Mapped pilot signal reaches high confidence or the respondent selects unknown.',
  followupRuleRef: 'pilot_default',
};

const DEFAULT_STOP: StopCondition = {
  when: 'pilot_signal_stable',
  reason: 'Stabilizes read model for pilot sequencing.',
};

/** Shared tail for Sprint-2-complete rows (no `todo`). */
export function buildIntakeIntelligenceSprint2Tail(args: {
  signalKey: string;
  expectedInfoGainBits: number;
  ownerDomain: IntakeIntelligenceOwnerDomain;
  ownerAlias?: string;
  reviewByIsoDate: string;
  followupPolicy?: FollowupPolicy;
  stopCondition?: StopCondition;
}): {
  signalContribution: SignalContribution[];
  followupPolicy: FollowupPolicy;
  stopCondition: StopCondition;
  stewardship: IntakeIntelligenceStewardship;
} {
  return {
    signalContribution: [
      {
        signalKey: args.signalKey,
        expectedInfoGainBits: args.expectedInfoGainBits,
        confidenceLift: 'medium',
      },
    ],
    followupPolicy: args.followupPolicy ?? DEFAULT_FOLLOWUP,
    stopCondition: args.stopCondition ?? DEFAULT_STOP,
    stewardship: {
      ownerDomain: args.ownerDomain,
      ownerAlias: args.ownerAlias,
      reviewByIsoDate: args.reviewByIsoDate,
    },
  };
}

export function isValidIntakeIntelligenceStewardship(
  s: IntakeIntelligenceStewardship | undefined,
): s is IntakeIntelligenceStewardship {
  if (!s) return false;
  if (!s.ownerDomain || !s.reviewByIsoDate) return false;
  if (s.ownerAlias !== undefined && s.ownerAlias.trim().length === 0) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(s.reviewByIsoDate);
}

/**
 * Sprint 2 "complete" contract: required_now satisfied, no deferred todo, stewardship,
 * signalContribution with info-gain floor, follow-up and stop rules.
 */
export function isIntakeIntelligenceSprint2Complete(
  contract: IntakeIntelligenceContract | undefined,
  hasRequiredNow: (c: IntakeIntelligenceContract | undefined) => boolean,
): boolean {
  if (!contract || !hasRequiredNow(contract)) return false;
  if (contract.todo) return false;
  if (!isValidIntakeIntelligenceStewardship(contract.stewardship)) return false;
  const sc = contract.signalContribution;
  if (!Array.isArray(sc) || sc.length === 0) return false;
  for (const row of sc) {
    if (!row?.signalKey) return false;
    if (
      typeof row.expectedInfoGainBits !== 'number' ||
      row.expectedInfoGainBits < MIN_EXPECTED_INFO_GAIN_BITS_SPRINT2
    ) {
      return false;
    }
  }
  const fp = contract.followupPolicy;
  if (!fp?.deeperIf?.trim() || !fp.stopIf?.trim()) return false;
  if (!contract.stopCondition?.when?.trim()) return false;
  return true;
}

export function getIntakeIntelligenceSprint2CoverageSummary(args: {
  getContract: (questionId: string) => IntakeIntelligenceContract;
  hasRequiredNow: (c: IntakeIntelligenceContract | undefined) => boolean;
}): {
  gateQuestionCount: number;
  sprint2CompleteQuestions: number;
  sprint2CompleteRatio: number;
} {
  let sprint2CompleteQuestions = 0;
  for (const id of INTAKE_INTELLIGENCE_SPRINT2_GATE_IDS) {
    if (isIntakeIntelligenceSprint2Complete(args.getContract(id), args.hasRequiredNow)) {
      sprint2CompleteQuestions += 1;
    }
  }
  const gateQuestionCount = INTAKE_INTELLIGENCE_SPRINT2_GATE_IDS.length;
  return {
    gateQuestionCount,
    sprint2CompleteQuestions,
    sprint2CompleteRatio: gateQuestionCount > 0 ? sprint2CompleteQuestions / gateQuestionCount : 0,
  };
}
