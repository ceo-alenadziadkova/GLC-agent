/**
 * BaseAgent — the core AI agent pattern.
 *
 * Pipeline: COLLECT (no AI) → ASSEMBLE CONTEXT → CALL CLAUDE (1 call) → FACT-CHECK → SAVE
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';

import { createAnthropicClient } from '../../config/claude-client.js';
import type { AgentVariant } from '../../config/agent-variants.js';
import { isCausalDagEnabled } from '../../config/feature-flags.js';
import { getExtendedPhaseProfile } from '../../config/phase-profiles.js';
import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';
import {
  interpolatePipelineEventMessage,
  pipelineBaseEventCopy,
} from '../../config/pipeline-events-copy.js';
import { type BaseCollector } from '../../collectors/base.js';
import { fetchAuditExecutionMode } from '../../lib/audit-execution-mode.js';
import { fetchAuditGovernanceRiskProfile } from '../../lib/audit-governance-risk-profile.js';
import type { ControlObjectV1, ExecutionMode, PhaseId } from '../../schemas/control-object/index.js';
import { confidenceDistributionFromIssues } from '../../lib/confidence-distribution.js';
import {
  fetchInvalidatedClaimIdsForPhase,
  upsertClaimGraphRows,
} from '../../services/audit-claim-graph.js';
import { ContextBuilder, type AgentContext } from '../../services/context-builder.js';
import { connectorRunner } from '../../services/connector-runner.js';
import { FactChecker } from '../../services/fact-checker.js';
import { logger } from '../../services/logger.js';
import { TokenTracker } from '../../services/token-tracker.js';
import type { BriefSnapshot } from '../../services/feasibility-layer.js';
import type { DomainKey, DomainResult } from '../../types/audit.js';
import { MIN_TOKEN_RESERVE, MODEL_MAX_TOKENS } from '../../config/model.js';

import { insertAgentPipelineEvent } from './agent-pipeline-emit.js';
import { saveCompletedDomainRow } from './audit-domain-persistence.js';
import { fetchAuditWebContext } from './audit-web-context.js';
import { briefSnapshotFromAgentContext } from './brief-snapshot-from-context.js';
import { callClaudeWithRetry as invokeClaudeWithRetry } from './claude-agent-invoke.js';

export abstract class BaseAgent {
  protected anthropic: Anthropic;
  protected contextBuilder: ContextBuilder;
  protected factChecker: FactChecker;
  protected tokenTracker: TokenTracker;
  protected auditId: string;

  abstract get phaseNumber(): number;
  abstract get domainKey(): DomainKey | 'recon' | 'strategy';
  abstract get collectors(): BaseCollector[];
  abstract get instructions(): string;
  abstract get outputSchema(): z.ZodSchema;

  lastControlObject: ControlObjectV1 | null = null;

  variantDelta: AgentVariant | null = null;

  autoLoopAdjustments: Map<number, string> | null = null;

  selectedVariantId: string | null = null;

  priorControlObjectsByPhase: Partial<Record<PhaseId, ControlObjectV1>> = {};

  lastRawDomainResult: Record<string, unknown> | null = null;

  private executionModeCache: ExecutionMode | undefined = undefined;

  constructor(auditId: string) {
    this.auditId = auditId;
    this.anthropic = createAnthropicClient();
    this.contextBuilder = new ContextBuilder();
    this.factChecker = new FactChecker();
    this.tokenTracker = new TokenTracker();
  }

  private attachConfidenceDistribution(result: DomainResult): DomainResult {
    return { ...result, confidence_distribution: confidenceDistributionFromIssues(result.issues) };
  }

  protected getEffectiveInstructions(): string {
    let effectiveInstructions = this.instructions;
    if (this.variantDelta) {
      if (this.variantDelta.delta_type === 'replace') {
        effectiveInstructions = this.variantDelta.instruction_delta;
      } else {
        effectiveInstructions = `${effectiveInstructions}\n\n${this.variantDelta.instruction_delta}`;
      }
    }

    const autoLoopPatch = this.autoLoopAdjustments?.get(this.phaseNumber)?.trim();
    if (!autoLoopPatch) {
      return effectiveInstructions;
    }
    return `${effectiveInstructions}\n\n${autoLoopPatch}`;
  }

  private async resolveExecutionMode(): Promise<ExecutionMode> {
    if (this.executionModeCache !== undefined) return this.executionModeCache;
    const mode = await fetchAuditExecutionMode(this.auditId);
    this.executionModeCache = mode;
    return mode;
  }

  async run(): Promise<DomainResult> {
    const { companyUrl, noPublicWebsite } = await this.getAuditWebContext();
    const ev = pipelineBaseEventCopy();

    await this.emit('collecting', ev.collecting);
    const collectedData: Record<string, Record<string, unknown>> = {};

    for (const collector of this.collectors) {
      try {
        const result = await collector.run(this.auditId, companyUrl, { noPublicWebsite });
        collectedData[result.collector_key] = result.data;
        await this.emit(
          PIPELINE_EVENT_TYPES.log,
          interpolatePipelineEventMessage(ev.logCollected, { key: result.collector_key }),
        );
      } catch (err) {
        await this.emit(
          PIPELINE_EVENT_TYPES.log,
          interpolatePipelineEventMessage(ev.logCollectorFailed, {
            key: collector.key,
            message: (err as Error).message,
          }),
        );
      }
    }

    await this.emit('assembling_context', ev.assemblingContext);
    const context = await this.contextBuilder.build(
      this.auditId,
      this.domainKey,
      collectedData,
      this.getEffectiveInstructions(),
    );

    await this.emit('analyzing', ev.analyzing);

    const budget = await this.tokenTracker.checkBudget(this.auditId);
    if (!budget.within_budget) {
      throw new Error(`Token budget exceeded: ${budget.tokens_used}/${budget.token_budget}`);
    }
    if (budget.remaining < MIN_TOKEN_RESERVE) {
      throw new Error(
        `Insufficient token reserve: ${budget.remaining} remaining, need at least ${MIN_TOKEN_RESERVE}`,
      );
    }
    if (budget.is_approaching_limit) {
      await this.emit(
        'warning',
        interpolatePipelineEventMessage(ev.tokenBudgetWarning, {
          pct: Math.round((budget.tokens_used / budget.token_budget) * 100),
          remaining: budget.remaining,
        }),
      );
    }

    const result = await this.callClaudeWithRetry(context);

    if (this.domainKey !== 'recon' && this.domainKey !== 'strategy') {
      this.lastRawDomainResult = JSON.parse(JSON.stringify(result)) as Record<string, unknown>;
      const verification = this.factChecker.verify(result, this.domainKey, collectedData);
      if (verification.corrections.length > 0) {
        await this.emit(
          'fact_check',
          interpolatePipelineEventMessage(ev.factCheckFlags, { count: verification.corrections.length }),
          {
            corrections: verification.corrections,
            confidence: verification.confidence,
          },
        );
      }

      try {
        const brief: BriefSnapshot = briefSnapshotFromAgentContext(context);
        const executionMode = await this.resolveExecutionMode();
        const riskProfile = await fetchAuditGovernanceRiskProfile(this.auditId);

        const phaseProfile = getExtendedPhaseProfile(this.domainKey);
        const connectorEnrichments = await connectorRunner.runAll(this.domainKey as DomainKey, {
          high_risk_fact_types: phaseProfile.high_risk_fact_types,
          company_url: companyUrl,
        });

        let invalidatedIssueClaimIds = new Set<number>();
        if (isCausalDagEnabled()) {
          invalidatedIssueClaimIds = await fetchInvalidatedClaimIdsForPhase(
            this.auditId,
            this.domainKey as DomainKey,
          );
        }

        const controlObject = this.factChecker.buildControlObject(
          verification,
          this.domainKey,
          this.auditId,
          this.phaseNumber,
          executionMode,
          brief,
          {
            riskProfile,
            selectedVariantId: this.selectedVariantId ?? undefined,
          },
          connectorEnrichments,
          this.priorControlObjectsByPhase,
          invalidatedIssueClaimIds,
        );
        this.lastControlObject = controlObject;

        if (isCausalDagEnabled()) {
          const issueCount = verification.result.issues?.length ?? 0;
          if (issueCount > 0) {
            await upsertClaimGraphRows(
              this.auditId,
              this.domainKey,
              controlObject.trace.causal_chain,
              issueCount,
            );
          }
        }
      } catch (controlErr) {
        logger.warn('agent.control_object_build_failed', {
          component: 'agent',
          audit_id: this.auditId,
          phase: this.phaseNumber,
          error: controlErr instanceof Error ? controlErr.message : String(controlErr),
        });
      }

      return this.attachConfidenceDistribution(verification.result);
    }

    return result;
  }

  protected async callClaudeWithRetry(
    context: AgentContext,
    schema: z.ZodSchema = this.outputSchema,
    maxTokens: number = MODEL_MAX_TOKENS.domain,
  ): Promise<DomainResult> {
    return invokeClaudeWithRetry(
      {
        anthropic: this.anthropic,
        auditId: this.auditId,
        phaseNumber: this.phaseNumber,
        domainKey: this.domainKey,
        contextBuilder: this.contextBuilder,
        tokenTracker: this.tokenTracker,
        emit: this.emit.bind(this),
      },
      { context, schema, maxTokens },
    );
  }

  async saveDomainResult(result: DomainResult): Promise<void> {
    if (this.domainKey === 'recon' || this.domainKey === 'strategy') return;
    await saveCompletedDomainRow({
      auditId: this.auditId,
      domainKey: this.domainKey as DomainKey,
      phaseNumber: this.phaseNumber,
      result,
    });
  }

  protected async emit(
    eventType: string,
    message: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    await insertAgentPipelineEvent({
      auditId: this.auditId,
      phase: this.phaseNumber,
      eventType,
      message,
      data,
    });
  }

  protected async getAuditWebContext(): Promise<{ companyUrl: string; noPublicWebsite: boolean }> {
    return fetchAuditWebContext(this.auditId);
  }

  protected async getCompanyUrl(): Promise<string> {
    const { companyUrl } = await this.getAuditWebContext();
    return companyUrl;
  }
}
