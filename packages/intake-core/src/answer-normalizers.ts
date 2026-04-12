import type { IntakeResponsesMap } from './types.js';
import { getResponseString } from './unwrap.js';
import raw from './answer-normalizers.v1.json' with { type: 'json' };
import {
  firstMatchingResponseStringOutcome,
  type ResponseStringRuleRow,
} from './response-string-rules.js';

export type D4bExportReadiness = 'quick' | 'sometimes' | 'painful' | 'no' | 'unknown' | 'other';
export type D4aAiUsage = 'daily' | 'weekly_or_occasional' | 'low' | 'unknown' | 'other';
export type AutomationAttempt = 'helped' | 'abandoned' | 'not_yet' | 'not_sure' | 'other';
export type D3ManualLoad = 'low' | 'medium' | 'high' | 'unknown' | 'other';
export type StageBucket = 'launching' | 'growing' | 'other' | 'unknown';
export type TeamBucket = 'solo' | 'small' | 'other' | 'unknown';
export type GoalBucket = 'more_clients' | 'admin_overload' | 'other' | 'unknown';

type AnswerNormalizersFile = {
  version: string;
  crmToolNeedle: string;
  governanceUncertainPhrases: string[];
  a8UncertainPhrases: string[];
  onlinePresence: {
    hasNotOnlineSubstrings: string[];
    hasGoogleSearchEq: string[];
    hasGoogleBusinessSubstrings: string[];
  };
  d4bExportReadiness: { rules: ResponseStringRuleRow[] };
  d4aAiUsage: { rules: ResponseStringRuleRow[] };
  automationAttempt: { rules: ResponseStringRuleRow[] };
  d3ManualLoad: { rules: ResponseStringRuleRow[] };
  stage: { rules: ResponseStringRuleRow[] };
  teamSize: { rules: ResponseStringRuleRow[] };
  primaryGoal: { priorityOutcomes: string[]; rules: ResponseStringRuleRow[] };
};

const file = raw as AnswerNormalizersFile;

function norm(value: string): string {
  return value.trim().toLowerCase();
}

function asD4b(out: string | undefined): D4bExportReadiness {
  if (
    out === 'quick' ||
    out === 'sometimes' ||
    out === 'painful' ||
    out === 'no' ||
    out === 'unknown' ||
    out === 'other'
  ) {
    return out;
  }
  return 'unknown';
}

function asD4a(out: string | undefined): D4aAiUsage {
  if (
    out === 'daily' ||
    out === 'weekly_or_occasional' ||
    out === 'low' ||
    out === 'unknown' ||
    out === 'other'
  ) {
    return out;
  }
  return 'unknown';
}

function asAutomation(out: string | undefined): AutomationAttempt {
  if (
    out === 'helped' ||
    out === 'abandoned' ||
    out === 'not_yet' ||
    out === 'not_sure' ||
    out === 'other'
  ) {
    return out;
  }
  return 'not_sure';
}

function asD3(out: string | undefined): D3ManualLoad {
  if (
    out === 'low' ||
    out === 'medium' ||
    out === 'high' ||
    out === 'unknown' ||
    out === 'other'
  ) {
    return out;
  }
  return 'unknown';
}

function asStage(out: string | undefined): StageBucket {
  if (out === 'launching' || out === 'growing' || out === 'other' || out === 'unknown') {
    return out;
  }
  return 'unknown';
}

function asTeam(out: string | undefined): TeamBucket {
  if (out === 'solo' || out === 'small' || out === 'other' || out === 'unknown') {
    return out;
  }
  return 'unknown';
}

function asGoal(out: string | undefined): GoalBucket {
  if (out === 'more_clients' || out === 'admin_overload' || out === 'other' || out === 'unknown') {
    return out;
  }
  return 'unknown';
}

export function normalizeD4bExportReadiness(responses: IntakeResponsesMap): D4bExportReadiness {
  const s = norm(getResponseString(responses, 'd4b'));
  return asD4b(firstMatchingResponseStringOutcome(file.d4bExportReadiness.rules, s));
}

export function normalizeD4aAiUsage(responses: IntakeResponsesMap): D4aAiUsage {
  const s = norm(getResponseString(responses, 'd4a'));
  return asD4a(firstMatchingResponseStringOutcome(file.d4aAiUsage.rules, s));
}

export function normalizeAutomationAttempt(responses: IntakeResponsesMap): AutomationAttempt {
  const s = norm(getResponseString(responses, 'd_automation_attempt'));
  return asAutomation(firstMatchingResponseStringOutcome(file.automationAttempt.rules, s));
}

export function normalizeD3ManualLoad(responses: IntakeResponsesMap): D3ManualLoad {
  const s = norm(getResponseString(responses, 'd3'));
  return asD3(firstMatchingResponseStringOutcome(file.d3ManualLoad.rules, s));
}

export function isGovernanceClear(responses: IntakeResponsesMap): boolean {
  const s = norm(getResponseString(responses, 'f7'));
  if (!s) return false;
  return !file.governanceUncertainPhrases.some(p => s.includes(norm(p)));
}

export function isA8KnownScale(responses: IntakeResponsesMap): boolean {
  const s = norm(getResponseString(responses, 'a8'));
  if (!s) return false;
  return !file.a8UncertainPhrases.some(p => s.includes(norm(p)));
}

export function normalizeStage(value: unknown): StageBucket {
  const s = norm(String(value ?? ''));
  return asStage(firstMatchingResponseStringOutcome(file.stage.rules, s));
}

export function normalizeTeamSize(value: unknown): TeamBucket {
  const s = norm(String(value ?? ''));
  return asTeam(firstMatchingResponseStringOutcome(file.teamSize.rules, s));
}

export function normalizeIndustry(value: unknown): string {
  return norm(String(value ?? ''));
}

export function includesCrmTool(values: string[]): boolean {
  const needle = norm(file.crmToolNeedle);
  return values.some(v => norm(v).includes(needle));
}

/** Free-text d1b (or similar) implies CRM when it contains the same needle as `includesCrmTool`. */
export function freeTextImpliesCrmTool(text: string): boolean {
  const needle = norm(file.crmToolNeedle);
  if (!needle) return false;
  return norm(text).includes(needle);
}

export function normalizeOnlinePresence(values: string[]): {
  hasNotOnline: boolean;
  hasGoogleSearch: boolean;
  hasGoogleBusiness: boolean;
} {
  const n = values.map(v => norm(v));
  const op = file.onlinePresence;
  return {
    hasNotOnline: n.some(v => op.hasNotOnlineSubstrings.some(sub => v.includes(norm(sub)))),
    hasGoogleSearch: n.some(v => op.hasGoogleSearchEq.some(eq => v === norm(eq))),
    hasGoogleBusiness: n.some(v => op.hasGoogleBusinessSubstrings.some(sub => v.includes(norm(sub)))),
  };
}

export function normalizePrimaryGoal(value: unknown): GoalBucket {
  const priority = new Set(file.primaryGoal.priorityOutcomes);
  if (Array.isArray(value)) {
    for (const item of value) {
      const b = normalizePrimaryGoal(item);
      if (priority.has(b)) return b;
    }
    return normalizePrimaryGoal(value.join(' '));
  }
  const s = norm(String(value ?? ''));
  return asGoal(firstMatchingResponseStringOutcome(file.primaryGoal.rules, s));
}
