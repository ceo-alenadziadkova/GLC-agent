/**
 * Phase-7 deterministic path shared by {@link StrategyAgent} and operational “repaired JSON” apply:
 * weighted score + initiative post-processing + narrow control object.
 */
import { calculateWeightedScore } from '../../config/industry-weights.js';
import type { StrategyOutput } from '../../schemas/domain-output.js';
import type { ControlObjectV1 } from '../../schemas/control-object/index.js';
import { supabase } from '../supabase.js';
import {
  buildDomainIssueIdIndex,
  buildStrategyBriefConstraintSnapshot,
  mergeBriefSnapshotWithLabOverrides,
} from './strategy-brief-constraint-snapshot.js';
import {
  collectMissingCrossDomainDependencyIds,
  postProcessStrategyInitiatives,
} from './strategy-initiative-post-process.js';
import type { DomainKey, DomainResult } from '../../types/audit.js';
import { fetchAuditGovernanceRiskProfile } from '../../lib/audit-governance-risk-profile.js';
import { fetchAuditExecutionMode } from '../../lib/audit-execution-mode.js';
import { buildStrategyNarrowControlObject } from '../governance/narrow/build-strategy-narrow-control-object.js';

export type StrategyHydratedPersistPayload = {
  strategyResult: StrategyOutput;
  weightedScore: number;
  quick_wins: StrategyOutput['quick_wins'];
  medium_term: StrategyOutput['medium_term'];
  strategic: StrategyOutput['strategic'];
};

export type HydrateStrategyAfterParseResult = StrategyHydratedPersistPayload & {
  lastRawDomainResult: Record<string, unknown>;
  lastControlObject: ControlObjectV1;
  cleanedOutput: DomainResult;
  missingCrossDomainDependencyIds: string[];
};

function coalitionAlignmentsIndicateDependencies(rows: Array<Record<string, unknown>> | undefined): boolean {
  return (rows ?? []).some((row) => {
    const alignment = row.alignment;
    if (!alignment || typeof alignment !== 'object') return false;
    const reactions = (alignment as { cross_domain_reactions?: unknown }).cross_domain_reactions;
    return (
      Array.isArray(reactions)
      && reactions.some((reaction) => (
        Boolean(reaction)
        && typeof reaction === 'object'
        && (reaction as { relation?: unknown }).relation === 'depends_on'
      ))
    );
  });
}

/**
 * Mirrors post-parse hydration in StrategyAgent.run (weighted score / post-process / control object).
 */
export async function hydrateStrategyAfterParse(params: {
  auditId: string;
  strategyResult: StrategyOutput;
  coalitionAlignmentResponses: Array<Record<string, unknown>> | undefined;
}): Promise<HydrateStrategyAfterParseResult> {
  const { auditId, strategyResult, coalitionAlignmentResponses } = params;

  const { data: domains } = await supabase
    .from('audit_domains')
    .select('domain_key, score')
    .eq('audit_id', auditId)
    .eq('status', 'completed');

  const { data: audit } = await supabase
    .from('audits')
    .select('industry')
    .eq('id', auditId)
    .single();

  const domainScores = (domains ?? [])
    .filter(d => d.score != null)
    .map(d => ({ domain_key: d.domain_key as DomainKey, score: d.score! }));

  const weightedScore = domainScores.length > 0
    ? calculateWeightedScore(domainScores, audit?.industry ?? null)
    : strategyResult.overall_score;

  const { data: domainIssueRows } = await supabase
    .from('audit_domains')
    .select('domain_key, issues')
    .eq('audit_id', auditId)
    .eq('status', 'completed');

  const [{ data: briefRow }, { data: labRow }] = await Promise.all([
    supabase.from('intake_brief').select('responses').eq('audit_id', auditId).maybeSingle(),
    supabase.from('audit_strategy').select('strategy_lab_context').eq('audit_id', auditId).maybeSingle(),
  ]);

  const briefResponses =
    briefRow?.responses && typeof briefRow.responses === 'object' && !Array.isArray(briefRow.responses)
      ? (briefRow.responses as Record<string, unknown>)
      : undefined;
  const briefSnapshot = mergeBriefSnapshotWithLabOverrides(
    buildStrategyBriefConstraintSnapshot(briefResponses),
    labRow?.strategy_lab_context,
  );
  const issueIndex = buildDomainIssueIdIndex(domainIssueRows ?? []);
  const requireCrossDomainDependencies = coalitionAlignmentsIndicateDependencies(coalitionAlignmentResponses);

  const quick_wins = postProcessStrategyInitiatives(
    strategyResult.quick_wins,
    briefSnapshot,
    issueIndex,
    { requireCrossDomainDependencies },
  );
  const medium_term = postProcessStrategyInitiatives(
    strategyResult.medium_term,
    briefSnapshot,
    issueIndex,
    { requireCrossDomainDependencies },
  );
  const strategic = postProcessStrategyInitiatives(
    strategyResult.strategic,
    briefSnapshot,
    issueIndex,
    { requireCrossDomainDependencies },
  );

  const missingCrossDomainDependencyIds = collectMissingCrossDomainDependencyIds(
    [...quick_wins, ...medium_term, ...strategic],
    requireCrossDomainDependencies,
  );

  const executionMode = await fetchAuditExecutionMode(auditId);
  const riskProfile = await fetchAuditGovernanceRiskProfile(auditId);

  const lastControlObject = buildStrategyNarrowControlObject({
    auditId,
    executionMode,
    riskProfile,
    strategyResult,
    weightedOverallScore: weightedScore,
    completedDomainCount: domainScores.length,
  });

  const persistPayload = {
    strategyResult,
    weightedScore,
    quick_wins,
    medium_term,
    strategic,
  };

  const cleanedOutput: DomainResult = {
    score: Math.round(weightedScore),
    label: 'Strategy',
    summary: strategyResult.executive_summary,
    strengths: [],
    weaknesses: [],
    issues: [],
    quick_wins: [],
    recommendations: [],
    unknown_items: [],
  };

  return {
    ...persistPayload,
    lastRawDomainResult: { ...strategyResult } as unknown as Record<string, unknown>,
    lastControlObject,
    cleanedOutput,
    missingCrossDomainDependencyIds,
  };
}
