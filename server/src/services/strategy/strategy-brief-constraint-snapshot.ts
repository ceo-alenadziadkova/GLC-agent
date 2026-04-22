import type { DomainKey } from '@glc/intake-core';

import {
  STRATEGY_BRIEF_SIGNAL_QUESTION_IDS,
  STRATEGY_BUSINESS_STAGE_TO_COMPANY_STAGE,
  STRATEGY_BUDGET_RANGE_ORDER,
  type StrategyCompanyStage,
  type StrategyConstraintBudgetBand,
  type StrategyConstraintTeamScale,
} from '../../config/strategy-initiative-policy.js';
import { parseStoredStrategyLabContext } from '../../config/strategy-lab-context-policy.js';
import { unwrapBriefResponse } from '../context-builder/lib/unwrap-brief-response.js';

export interface StrategyBriefConstraintSnapshot {
  company_stage: StrategyCompanyStage;
  budget_band: StrategyConstraintBudgetBand;
  team_scale: StrategyConstraintTeamScale;
  idea_validation_signal: 'strong' | 'partial' | 'weak' | 'unknown';
  idea_icp_clarity: 'clear' | 'partial' | 'broad' | 'unknown';
  idea_gtm_test_ready: boolean;
  idea_launch_constraint: string | null;
  /** Raw f5 label when present (for display / prompts). */
  budget_label: string | null;
  /** Raw a4 label when present. */
  team_label: string | null;
}

function readSingleSelect(responses: Record<string, unknown>, questionId: string): string | null {
  const raw = responses[questionId];
  if (raw === undefined || raw === null) return null;
  const parsed = unwrapBriefResponse(raw);
  const v = parsed.value;
  if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  return null;
}

function inferCompanyStageFromBrief(responses: Record<string, unknown>): StrategyCompanyStage {
  const ideaEvidence = readSingleSelect(responses, STRATEGY_BRIEF_SIGNAL_QUESTION_IDS.ideaProblemEvidence);
  if (ideaEvidence === 'Mostly my assumption for now') return 'idea';
  const label = readSingleSelect(responses, STRATEGY_BRIEF_SIGNAL_QUESTION_IDS.businessStage);
  if (label && label in STRATEGY_BUSINESS_STAGE_TO_COMPANY_STAGE) {
    return STRATEGY_BUSINESS_STAGE_TO_COMPANY_STAGE[label as keyof typeof STRATEGY_BUSINESS_STAGE_TO_COMPANY_STAGE];
  }
  return 'growth';
}

function inferIdeaValidationSignal(label: string | null): StrategyBriefConstraintSnapshot['idea_validation_signal'] {
  if (!label) return 'unknown';
  if (label === 'I have paid pilots or early customers') return 'strong';
  if (label === 'Strong interview or survey validation') return 'partial';
  if (label === 'Informal conversations only' || label === 'Mostly my assumption for now') return 'weak';
  return 'unknown';
}

function inferIdeaIcpClarity(label: string | null): StrategyBriefConstraintSnapshot['idea_icp_clarity'] {
  if (!label) return 'unknown';
  if (label.startsWith('Very clear')) return 'clear';
  if (label.startsWith('Partly clear')) return 'partial';
  if (label.startsWith('Broad audience') || label.startsWith('Not defined')) return 'broad';
  return 'unknown';
}

function inferIdeaGtmReadiness(responses: Record<string, unknown>): boolean {
  const raw = responses[STRATEGY_BRIEF_SIGNAL_QUESTION_IDS.ideaGtmTests];
  if (raw === undefined || raw === null) return false;
  const parsed = unwrapBriefResponse(raw).value;
  if (!Array.isArray(parsed)) return false;
  const options = parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  if (options.length === 0) return false;
  return !options.includes('Not ready to run tests yet');
}

function inferBudgetBand(label: string | null): StrategyConstraintBudgetBand {
  if (!label) return 'unknown';
  const t = label.trim();
  if (t.includes('No clear budget') || t.includes('Prefer not to share')) return 'unknown';
  const idx = STRATEGY_BUDGET_RANGE_ORDER.indexOf(t as (typeof STRATEGY_BUDGET_RANGE_ORDER)[number]);
  if (idx === 0) return 'low';
  if (idx === 1) return 'low';
  if (idx === 2) return 'medium';
  if (idx === 3) return 'high';
  return 'unknown';
}

function inferTeamScale(label: string | null): StrategyConstraintTeamScale {
  if (!label) return 'unknown';
  const t = label.trim();
  if (t === 'Just me') return 'solo';
  if (t === '2–10 people') return 'small';
  if (t === '11–50') return 'medium';
  if (t === '51–200') return 'large';
  if (t === '200+') return 'enterprise';
  return 'unknown';
}

/**
 * Builds a normalized snapshot from `intake_brief.responses` for strategy post-processing.
 */
export function buildStrategyBriefConstraintSnapshot(
  responses: Record<string, unknown> | null | undefined,
): StrategyBriefConstraintSnapshot {
  const r = responses && typeof responses === 'object' && !Array.isArray(responses) ? responses : {};
  const budgetLabel = readSingleSelect(r, STRATEGY_BRIEF_SIGNAL_QUESTION_IDS.budgetRange);
  const teamLabel = readSingleSelect(r, STRATEGY_BRIEF_SIGNAL_QUESTION_IDS.teamSize);
  const ideaEvidenceLabel = readSingleSelect(r, STRATEGY_BRIEF_SIGNAL_QUESTION_IDS.ideaProblemEvidence);
  const ideaIcpLabel = readSingleSelect(r, STRATEGY_BRIEF_SIGNAL_QUESTION_IDS.ideaIcpClarity);
  const ideaConstraintLabel = readSingleSelect(r, STRATEGY_BRIEF_SIGNAL_QUESTION_IDS.ideaLaunchConstraint);
  return {
    company_stage: inferCompanyStageFromBrief(r),
    budget_band: inferBudgetBand(budgetLabel),
    team_scale: inferTeamScale(teamLabel),
    idea_validation_signal: inferIdeaValidationSignal(ideaEvidenceLabel),
    idea_icp_clarity: inferIdeaIcpClarity(ideaIcpLabel),
    idea_gtm_test_ready: inferIdeaGtmReadiness(r),
    idea_launch_constraint: ideaConstraintLabel,
    budget_label: budgetLabel,
    team_label: teamLabel,
  };
}

/**
 * Applies persisted Strategy Lab overrides on top of a brief-derived snapshot.
 */
export function mergeBriefSnapshotWithLabOverrides(
  base: StrategyBriefConstraintSnapshot,
  persistedRaw: unknown,
): StrategyBriefConstraintSnapshot {
  const o = parseStoredStrategyLabContext(persistedRaw);
  return {
    ...base,
    company_stage: o.company_stage ?? base.company_stage,
    budget_band: o.budget_band ?? base.budget_band,
    team_scale: o.team_scale ?? base.team_scale,
  };
}

/** Issue id sets per domain from persisted `audit_domains.issues` JSON. */
export function buildDomainIssueIdIndex(
  domainRows: Array<{ domain_key: string; issues?: unknown }>,
): Map<DomainKey, Set<string>> {
  const map = new Map<DomainKey, Set<string>>();
  for (const row of domainRows) {
    const dk = row.domain_key as DomainKey;
    const issues = row.issues;
    if (!Array.isArray(issues)) continue;
    const set = new Set<string>();
    for (const item of issues) {
      if (item && typeof item === 'object' && 'id' in item && typeof (item as { id?: unknown }).id === 'string') {
        set.add((item as { id: string }).id);
      }
    }
    if (set.size > 0) map.set(dk, set);
  }
  return map;
}
