import { SYSTEM_DEFAULTS } from '../../../config/system-defaults.js';
import { CLAUDE_MODEL, MODEL_MAX_TOKENS, getModelPricing } from '../../../config/model.js';
import { roundTokenCostUsd } from '../../../config/token-cost-rounding.js';
import { PIPELINE_EVENT_TYPES } from '../../../config/pipeline-event-types.js';
import { pipelineOrchestratorCopy } from '../../../config/pipeline-orchestrator-copy.js';
import { TOKENS_PER_MILLION } from '../../../config/pipeline-orchestrator-constants.js';
import { supabase } from '../../supabase.js';
import { logger } from '../../logger.js';
import { DEFAULT_VARIANT_ID } from '../../bandit.js';
import { findVariant } from '../../../config/agent-variants.js';
import type { BaseAgent } from '../../../agents/base.js';
import { decisionLayer } from '../../decision-layer.js';
import { applyAutoRemediation } from '../../remediation.js';
import { attachBenchmarkReferenceToControlObject } from '../../benchmark-snapshot.js';
import { recordEvaluationDatasetIfEnabled } from '../../evaluation-dataset-writer.js';
import { dynamicAdjustmentService } from '../../dynamic-adjustment.js';
import { PHASE_DOMAIN_MAP } from '../../../types/audit.js';
import type { ControlObjectV1 } from '../../../schemas/control-object/index.js';
import type { DomainKey, DomainResult } from '../../../types/audit.js';
import type { DecisionResult } from '../../decision-layer.js';

type AgentConstructor = new (auditId: string) => BaseAgent;

export async function estimateRerunCostUsd(args: {
  auditId: string;
  phase: number;
}): Promise<number> {
  const { auditId, phase } = args;

  const { data: tokenUsageEvent } = await supabase
    .from('pipeline_events')
    .select('data')
    .eq('audit_id', auditId)
    .eq('phase', phase)
    .eq('event_type', PIPELINE_EVENT_TYPES.tokenUsage)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const eventCost = (tokenUsageEvent?.data as { cost_usd?: unknown } | null)?.cost_usd;
  if (typeof eventCost === 'number' && Number.isFinite(eventCost) && eventCost > 0) {
    return roundTokenCostUsd(eventCost);
  }

  const pricing = getModelPricing(CLAUDE_MODEL);
  const conservativeFallback =
    (MODEL_MAX_TOKENS.domain / TOKENS_PER_MILLION) * pricing.input +
    (MODEL_MAX_TOKENS.domain / TOKENS_PER_MILLION) * pricing.output;
  return roundTokenCostUsd(conservativeFallback);
}

export async function attemptAutoLoop(args: {
  auditId: string;
  phase: number;
  originalControlObject: ControlObjectV1;
  activeErrorTypes: string[];
  disableAutoRemediate: boolean;
  agentClassForPhase: (phase: number) => AgentConstructor | undefined;
  attachPriorControlObjects: (agent: BaseAgent, domainKey: DomainKey) => Promise<void>;
  recordBanditArmAsync: (controlObject: ControlObjectV1) => void;
  emitEvent: (phase: number, eventType: string, message: string, data?: Record<string, unknown>) => Promise<void>;
}): Promise<boolean> {
  const {
    auditId,
    phase,
    originalControlObject,
    activeErrorTypes,
    disableAutoRemediate,
    agentClassForPhase,
    attachPriorControlObjects,
    recordBanditArmAsync,
    emitEvent,
  } = args;

  const cfg = SYSTEM_DEFAULTS.autoLoop;
  const AgentClass = agentClassForPhase(phase);
  if (!AgentClass) return false;

  const domainKey = PHASE_DOMAIN_MAP[phase];
  if (domainKey === 'recon' || domainKey === 'strategy') return false;

  const originalConfidence = originalControlObject.confidence.overall;

  // Generate instruction patches
  const { adjustments, matched_error_types } = dynamicAdjustmentService.generateAdjustments(originalControlObject);

  if (adjustments.size === 0) {
    logger.info('pipeline.auto_loop_no_adjustments', {
      component: 'pipeline',
      audit_id: auditId,
      phase,
      active_error_types: activeErrorTypes,
    });
    return false;
  }

  logger.info('pipeline.auto_loop_start', {
    component: 'pipeline',
    audit_id: auditId,
    phase,
    domain: domainKey,
    matched_error_types,
    agent_count: adjustments.size,
  });

  let currentControlObject = originalControlObject;

  for (let iteration = 1; iteration <= cfg.maxIterations; iteration++) {
    // Cost guardrail: estimate and check before rerun
    const estimatedRerunCostUsd = await estimateRerunCostUsd({ auditId, phase });
    const rerunCostSoFar = (currentControlObject.cost_control?.total_rerun_cost_usd ?? 0);
    const projectedTotal = rerunCostSoFar + estimatedRerunCostUsd;

    if (
      projectedTotal > cfg.costGuardrailThresholdUsd &&
      (currentControlObject.confidence.overall - originalConfidence) < cfg.minConfidenceGain
    ) {
      logger.info('pipeline.auto_loop_cost_guardrail', {
        component: 'pipeline',
        audit_id: auditId,
        phase,
        iteration,
        projected_cost_usd: projectedTotal,
        confidence_gain: currentControlObject.confidence.overall - originalConfidence,
      });

      // Update cost_control to record the block
      if (currentControlObject.cost_control) {
        currentControlObject.cost_control.cost_guardrail_triggered = true;
      }
      break;
    }

    try {
      await emitEvent(
        phase,
        PIPELINE_EVENT_TYPES.log,
        `Auto-loop iteration ${iteration}/${cfg.maxIterations} — applying ${matched_error_types.length} correction(s).`,
      );

      const agent = new AgentClass(auditId);

      // Inject the same bandit variant as used in the original control object.
      // Auto-loop rerun is meant to validate deterministic improvements, not re-explore variants.
      {
        const originalVariantId = originalControlObject.context.selected_variant_id ?? DEFAULT_VARIANT_ID;
        agent.selectedVariantId = originalVariantId;
        if (originalVariantId !== DEFAULT_VARIANT_ID) {
          const variant = findVariant(domainKey as DomainKey, originalVariantId);
          if (variant) agent.variantDelta = variant;
        }
      }

      await attachPriorControlObjects(agent, domainKey as DomainKey);

      // Inject instruction patches via agent property (BaseAgent reads this in getEffectiveInstructions)
      if ('autoLoopAdjustments' in agent) {
        (agent as BaseAgent & { autoLoopAdjustments?: Map<number, string> }).autoLoopAdjustments = adjustments;
      }

      const rerunResult = await agent.run();
      const rerunControlObject = agent.lastControlObject;

      if (!rerunControlObject) break;

      // Populate cost_control for the rerun
      rerunControlObject.cost_control = {
        estimated_cost_usd: estimatedRerunCostUsd,
        total_rerun_cost_usd: projectedTotal,
        rerun_count: iteration,
        cost_guardrail_triggered: false,
      };

      // Re-run Decision Layer on the new output
      const rerunDecision = decisionLayer.decide(rerunControlObject);
      rerunControlObject.decision_hint = rerunDecision.hint;

      const remediated = await applyAutoRemediation({
        auditId,
        controlObject: rerunControlObject,
        cleanedOutput: rerunResult,
        phaseNumber: phase,
        disableAutoRemediate,
      });

      if (remediated > 0) {
        try {
          const postRem = decisionLayer.decide(rerunControlObject);
          rerunControlObject.decision_hint = postRem.hint;
        } catch (reDecideErr) {
          logger.warn('pipeline.remediation_redecide_failed', {
            component: 'pipeline',
            audit_id: auditId,
            phase,
            error: reDecideErr instanceof Error ? reDecideErr.message : String(reDecideErr),
          });
        }
        await emitEvent(
          phase,
          PIPELINE_EVENT_TYPES.log,
          `Auto-remediation: corrected ${remediated} issue(s).`,
          { auto_remediation_count: remediated },
        );
      }

      await attachBenchmarkReferenceToControlObject(auditId, rerunControlObject);

      // Record evaluation dataset for the rerun
      await recordEvaluationDatasetIfEnabled({
        auditId,
        phaseId: domainKey as DomainKey,
        controlObject: rerunControlObject,
        rawAgentOutput: agent.lastRawDomainResult,
        cleanedOutput: rerunResult,
      });

      void recordBanditArmAsync(rerunControlObject);

      await emitEvent(phase, PIPELINE_EVENT_TYPES.controlObject, '', { control_object: rerunControlObject });

      const confidenceGain = rerunControlObject.confidence.overall - originalConfidence;

      logger.info('pipeline.auto_loop_iteration_result', {
        component: 'pipeline',
        audit_id: auditId,
        phase,
        iteration,
        original_confidence: originalConfidence,
        new_confidence: rerunControlObject.confidence.overall,
        confidence_gain: confidenceGain,
        new_decision: rerunDecision.hint,
      });

      currentControlObject = rerunControlObject;

      // Accept if decision improved or minimum gain achieved
      if (rerunDecision.hint !== 'refine') {
        await agent.saveDomainResult(rerunResult);
        await emitEvent(
          phase,
          PIPELINE_EVENT_TYPES.log,
          `Auto-loop: ${rerunDecision.hint} after ${iteration} iteration(s). Confidence +${confidenceGain} pts.`,
        );
        return true;
      }

      // Stop if gain below minimum — further reruns unlikely to help
      if (confidenceGain < cfg.minConfidenceGain) {
        logger.info('pipeline.auto_loop_insufficient_gain', {
          component: 'pipeline',
          audit_id: auditId,
          phase,
          iteration,
          confidence_gain: confidenceGain,
          min_required: cfg.minConfidenceGain,
        });
        break;
      }
    } catch (loopErr) {
      logger.warn('pipeline.auto_loop_iteration_failed', {
        component: 'pipeline',
        audit_id: auditId,
        phase,
        iteration,
        error: loopErr instanceof Error ? loopErr.message : String(loopErr),
      });
      break;
    }
  }

  // Auto-loop exhausted without reaching accept — emit refine_recommended
  const oc = pipelineOrchestratorCopy();
  await emitEvent(
    phase,
    PIPELINE_EVENT_TYPES.refineRecommended,
    oc.phase.refineRecommendedMessage,
    {
      decision_hint: 'refine',
      reasoning: `Auto-loop ran ${cfg.maxIterations} iteration(s) without reaching accept threshold.`,
      active_error_types: activeErrorTypes,
      control_object: currentControlObject,
    },
  );

  return true; // handled the refine path (via auto-loop + final emission)
}

