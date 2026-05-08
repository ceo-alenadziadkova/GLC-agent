/**
 * Operational path: finalize phase 7 using a repaired Claude tool payload without invoking the LLM.
 * Mirrors {@link PhaseDomainExecutionDeps} ordering for strategy: governance publication, then DB completion.
 */
import {
  API_ERROR_CODES,
  INTERNAL_SERVER_ERROR_MESSAGE,
  PIPELINE_ALREADY_CANCELLED_MESSAGE,
  PIPELINE_AUDIT_NOT_FOUND_MESSAGE,
  PLATFORM_STRATEGY_REPAIRED_JSON_ALREADY_COMPLETED_MESSAGE,
  PLATFORM_STRATEGY_REPAIRED_JSON_APPLY_FAILED_MESSAGE,
  PLATFORM_STRATEGY_REPAIRED_JSON_SCHEMA_INVALID_MESSAGE,
  PLATFORM_STRATEGY_REPAIRED_JSON_STRATEGY_ROW_MISSING_MESSAGE,
  apiErrorJson,
} from '../../config/api-error-codes.js';
import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';
import { PIPELINE_MAX_PHASE_INDEX } from '../../config/pipeline-phases.js';
import { pipelineStrategyEventCopy } from '../../config/pipeline-events-copy.js';
import type { ControlObjectV1 } from '../../schemas/control-object/index.js';
import { insertAgentPipelineEvent } from '../../agents/base/agent-pipeline-emit.js';
import { COALITION_STRATEGY_MISSING_DEPENDENCIES_WARNING } from '../../config/coalition-protocol-policy.js';
import { hydrateStrategyAfterParse } from './hydrate-strategy-after-parse.js';
import { loadContextSnapshot } from '../context-builder/load-context-snapshot.js';
import { logger } from '../logger.js';
import { parseStrategyToolInputWithDeterministicRepairs } from './parse-strategy-tool-input-with-repairs.js';
import type { EvaluationCapture } from '../pipeline/governance/controlObjectGovernance.js';
import { supabase } from '../supabase.js';
import { writeStrategyCompletionToDatabase } from './strategy-completion-db.js';

const STRATEGY_PHASE = PIPELINE_MAX_PHASE_INDEX;

export type StrategyRepairedApplyOrchestrationDeps = {
  publishControlObjectGovernance: (
    phase: number,
    controlObject: ControlObjectV1,
    evaluationCapture: EvaluationCapture,
  ) => Promise<void>;
};

export type StrategyRepairedApplyWorkflowResult =
  | { ok: true; overall_score: number; normalization_mutation_codes: readonly string[] }
  | { ok: false; status: number; body: ReturnType<typeof apiErrorJson> };

function err(
  status: number,
  code: Parameters<typeof apiErrorJson>[0],
  message: string,
  details?: unknown,
): StrategyRepairedApplyWorkflowResult {
  return {
    ok: false,
    status,
    body: apiErrorJson(code, message, details),
  };
}

export async function runStrategyRepairedJsonApplyOrchestrated(params: {
  auditId: string;
  rawToolInput: unknown;
  forceReplaceCompletedAudit: boolean;
  deps: StrategyRepairedApplyOrchestrationDeps;
}): Promise<StrategyRepairedApplyWorkflowResult> {
  const { auditId, rawToolInput, forceReplaceCompletedAudit, deps } = params;

  const [{ data: audit, error: auditErr }, { data: strategyAnchor, error: strategyErr }] = await Promise.all([
    supabase.from('audits').select('id, status').eq('id', auditId).maybeSingle(),
    supabase.from('audit_strategy').select('audit_id').eq('audit_id', auditId).maybeSingle(),
  ]);

  if (auditErr) {
    logger.error('strategy_repaired.apply_audit_fetch_failed', { auditId, error: auditErr.message });
    return err(500, API_ERROR_CODES.INTERNAL_SERVER_ERROR, INTERNAL_SERVER_ERROR_MESSAGE);
  }
  if (strategyErr) {
    logger.error('strategy_repaired.apply_strategy_row_fetch_failed', { auditId, error: strategyErr.message });
    return err(500, API_ERROR_CODES.INTERNAL_SERVER_ERROR, INTERNAL_SERVER_ERROR_MESSAGE);
  }

  if (!audit?.id) {
    return err(404, API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE);
  }
  if (!strategyAnchor) {
    return err(
      404,
      API_ERROR_CODES.PLATFORM_STRATEGY_REPAIRED_JSON_STRATEGY_ROW_MISSING,
      PLATFORM_STRATEGY_REPAIRED_JSON_STRATEGY_ROW_MISSING_MESSAGE,
    );
  }
  if (audit.status === 'cancelled') {
    return err(400, API_ERROR_CODES.PIPELINE_ALREADY_CANCELLED, PIPELINE_ALREADY_CANCELLED_MESSAGE);
  }
  if (audit.status === 'completed' && !forceReplaceCompletedAudit) {
    return err(409, API_ERROR_CODES.PLATFORM_STRATEGY_REPAIRED_JSON_PRECONDITION, PLATFORM_STRATEGY_REPAIRED_JSON_ALREADY_COMPLETED_MESSAGE, {
      reason: 'audit_completed',
    });
  }

  const parsed = parseStrategyToolInputWithDeterministicRepairs(rawToolInput);
  if (!parsed.ok) {
    return err(400, API_ERROR_CODES.PLATFORM_STRATEGY_REPAIRED_JSON_SCHEMA_INVALID, PLATFORM_STRATEGY_REPAIRED_JSON_SCHEMA_INVALID_MESSAGE, {
      zod_message: parsed.zod_message,
      normalization_mutation_codes: parsed.normalization_mutation_codes,
    });
  }

  const snapshot = await loadContextSnapshot(auditId);
  const hydrated = await hydrateStrategyAfterParse({
    auditId,
    strategyResult: parsed.data,
    coalitionAlignmentResponses: snapshot.alignmentResponses,
  });

  const evStrategy = pipelineStrategyEventCopy();

  await insertAgentPipelineEvent({
    auditId,
    phase: STRATEGY_PHASE,
    eventType: PIPELINE_EVENT_TYPES.log,
    message: evStrategy.platformRepairedJsonApplyLog,
    data: {
      normalization_mutation_codes: parsed.normalization_mutation_codes,
      force_replace_completed_audit: forceReplaceCompletedAudit,
    },
  });

  const missingDeps = hydrated.missingCrossDomainDependencyIds;
  if (missingDeps.length > 0) {
    await insertAgentPipelineEvent({
      auditId,
      phase: STRATEGY_PHASE,
      eventType: PIPELINE_EVENT_TYPES.qualityGate,
      message: COALITION_STRATEGY_MISSING_DEPENDENCIES_WARNING,
      data: {
        gate: 'coalition_strategy_cross_domain_dependencies',
        initiative_ids: missingDeps,
      },
    });
  }

  try {
    await deps.publishControlObjectGovernance(STRATEGY_PHASE, hydrated.lastControlObject, {
      phaseId: 'strategy',
      rawAgentOutput: hydrated.lastRawDomainResult,
      cleanedOutput: hydrated.cleanedOutput,
    });

    await writeStrategyCompletionToDatabase({
      auditId,
      payload: {
        strategyResult: hydrated.strategyResult,
        weightedScore: hydrated.weightedScore,
        quick_wins: hydrated.quick_wins,
        medium_term: hydrated.medium_term,
        strategic: hydrated.strategic,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('strategy_repaired.apply_publish_or_persist_failed', { auditId, error: msg });
    return err(500, API_ERROR_CODES.PLATFORM_STRATEGY_REPAIRED_JSON_APPLY_FAILED, PLATFORM_STRATEGY_REPAIRED_JSON_APPLY_FAILED_MESSAGE, {
      detail: msg,
    });
  }

  await insertAgentPipelineEvent({
    auditId,
    phase: STRATEGY_PHASE,
    eventType: PIPELINE_EVENT_TYPES.completed,
    message: evStrategy.completed,
    data: {
      overall_score: hydrated.weightedScore,
      platform_repaired_json_apply: true,
      quick_wins_count: hydrated.strategyResult.quick_wins.length,
      medium_term_count: hydrated.strategyResult.medium_term.length,
      strategic_count: hydrated.strategyResult.strategic.length,
      normalization_mutation_codes: parsed.normalization_mutation_codes,
    },
  });

  return {
    ok: true,
    overall_score: Math.round(hydrated.weightedScore),
    normalization_mutation_codes: parsed.normalization_mutation_codes,
  };
}
