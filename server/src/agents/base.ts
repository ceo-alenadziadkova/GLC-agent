import type Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { supabase } from '../services/supabase.js';
import { ContextBuilder, type AgentContext } from '../services/context-builder.js';
import { FactChecker } from '../services/fact-checker.js';
import { TokenTracker } from '../services/token-tracker.js';
import { type BaseCollector } from '../collectors/base.js';
import type { DomainResult, DomainKey } from '../types/audit.js';
import type { ControlObjectV1, ExecutionMode } from '../schemas/control-object.js';
import type { AgentVariant } from '../config/agent-variants.js';
import { fetchAuditExecutionMode } from '../lib/audit-execution-mode.js';
import { fetchAuditGovernanceRiskProfile } from '../lib/audit-governance-risk-profile.js';
import { connectorRunner } from '../services/connector-runner.js';
import { getExtendedPhaseProfile } from '../config/phase-profiles.js';
import type { BriefSnapshot } from '../services/feasibility-layer.js';
import { followupQuestionsFromUnknowns } from '../lib/post-audit-followups.js';
import { confidenceDistributionFromIssues } from '../lib/confidence-distribution.js';
import { zodToJsonSchema } from '../schemas/domain-output.js';
import {
  CLAUDE_CB_THRESHOLD,
  CLAUDE_CB_TTL_SEC,
  CLAUDE_MAX_RETRIES,
  CLAUDE_RETRY_BASE_MS,
  CLAUDE_RETRY_JITTER_MS,
  CLAUDE_TIMEOUT_MS,
  claudeCircuitBreakerRedisKey,
  createAnthropicClient,
} from '../config/claude-client.js';
import { CLAUDE_MODEL, MIN_TOKEN_RESERVE, MODEL_MAX_TOKENS } from '../config/model.js';
import { logger } from '../services/logger.js';
import { getContext, updateContext } from '../services/observability-context.js';
import {
  interpolatePipelineEventMessage,
  pipelineBaseEventCopy,
} from '../config/pipeline-events-copy.js';
import type { z } from 'zod';
import { createClient } from 'redis';

let localCircuitFailures = 0;
type ClaudeCircuitRedisClient = ReturnType<typeof createClient>;
let claudeCircuitRedis: ClaudeCircuitRedisClient | null = null;

function getClaudeCircuitRedisClient(): ClaudeCircuitRedisClient | null {
  const redisUrl =
    (process.env.CLAUDE_CIRCUIT_REDIS_URL?.trim() || process.env.RATE_LIMIT_REDIS_URL?.trim()) ?? '';
  if (!redisUrl) return null;
  if (claudeCircuitRedis) return claudeCircuitRedis;
  const client = createClient({ url: redisUrl });
  client.on('error', (err) => {
    logger.warn('claude.circuit.redis_error', {
      component: 'agent',
      error: err instanceof Error ? err.message : String(err),
    });
  });
  void client.connect();
  claudeCircuitRedis = client;
  return client;
}

async function getConsecutiveClaudeFailures(): Promise<number> {
  const client = getClaudeCircuitRedisClient();
  if (!client) return localCircuitFailures;
  try {
    const raw = await client.get(claudeCircuitBreakerRedisKey());
    const parsed = Number(raw ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return localCircuitFailures;
  }
}

async function recordClaudeFailure(): Promise<void> {
  localCircuitFailures += 1;
  const client = getClaudeCircuitRedisClient();
  if (!client) return;
  try {
    const key = claudeCircuitBreakerRedisKey();
    const n = await client.incr(key);
    if (n === 1) {
      await client.expire(key, CLAUDE_CB_TTL_SEC);
    }
  } catch {
    // Best-effort only; local fallback remains active.
  }
}

async function resetClaudeFailures(): Promise<void> {
  localCircuitFailures = 0;
  const client = getClaudeCircuitRedisClient();
  if (!client) return;
  try {
    await client.del(claudeCircuitBreakerRedisKey());
  } catch {
    // Best-effort only.
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '../../prompts');

/**
 * Load a prompt from server/prompts/<name>.md, stripping the version comment header.
 * Falls back to empty string if the file is missing (shouldn't happen in prod).
 */
export function loadPrompt(name: string): string {
  try {
    const raw = readFileSync(join(PROMPTS_DIR, `${name}.md`), 'utf-8');
    // Strip the HTML version comment header line if present
    return raw.replace(/^<!--.*?-->\n/, '').trimStart();
  } catch {
    logger.error('agent.load_prompt_missing', { component: 'agent', prompt: `${name}.md` });
    return '';
  }
}

/**
 * Extract the version string from a prompt file's header comment.
 * Returns e.g. "1.0" from "<!-- version: 1.0 date: 2026-03-31 -->".
 */
export function promptVersion(name: string): string {
  try {
    const raw = readFileSync(join(PROMPTS_DIR, `${name}.md`), 'utf-8');
    const match = raw.match(/<!--\s*version:\s*([\d.]+)/);
    return match?.[1] ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * BaseAgent — the core AI agent pattern.
 *
 * Pipeline: COLLECT (no AI) → ASSEMBLE CONTEXT → CALL CLAUDE (1 call) → FACT-CHECK → SAVE
 */
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

  /**
   * Populated after run() completes for domain phases (not recon/strategy).
   * Read by PipelineOrchestrator to pass to Decision Layer.
   * Advisory-only in v1 — do not gate pipeline flow on this value in Phase 1.
   */
  lastControlObject: ControlObjectV1 | null = null;

  /**
   * Optional instruction variant injected by BanditService before run().
   * When set, getEffectiveInstructions() merges or replaces the base instructions.
   * Set by PipelineService after bandit.selectVariant() — never set inside agents.
   */
  variantDelta: AgentVariant | null = null;

  /**
   * Bandit arm id selected for this run (`default` or a registered variant). Set by PipelineOrchestrator.
   */
  selectedVariantId: string | null = null;

  /**
   * Claude tool output before `FactChecker.verify()` (for `evaluation_datasets.agent_output`).
   * Null for recon/strategy or if the domain branch was not executed.
   */
  lastRawDomainResult: Record<string, unknown> | null = null;

  private executionModeCache: ExecutionMode | undefined = undefined;

  constructor(auditId: string) {
    this.auditId = auditId;
    this.anthropic = createAnthropicClient();
    this.contextBuilder = new ContextBuilder();
    this.factChecker = new FactChecker();
    this.tokenTracker = new TokenTracker();
  }

  /**
   * Computes confidence_distribution from the issues array and attaches it to the result.
   * Called after fact-check so the distribution reflects the final set of issues.
   */
  private attachConfidenceDistribution(result: DomainResult): DomainResult {
    return { ...result, confidence_distribution: confidenceDistributionFromIssues(result.issues) };
  }

  /**
   * Returns the effective instruction string for this agent run.
   *
   * When variantDelta is set (bandit selected a non-default variant):
   *   - 'append':  appends instruction_delta to the base instructions with a blank line separator.
   *   - 'replace': substitutes instruction_delta for the entire base instructions string.
   * When variantDelta is null, returns this.instructions unchanged.
   */
  protected getEffectiveInstructions(): string {
    if (!this.variantDelta) return this.instructions;
    if (this.variantDelta.delta_type === 'replace') {
      return this.variantDelta.instruction_delta;
    }
    return `${this.instructions}\n\n${this.variantDelta.instruction_delta}`;
  }

  /** Loads `audits.execution_mode` once per agent instance (one pipeline phase). */
  private async resolveExecutionMode(): Promise<ExecutionMode> {
    if (this.executionModeCache !== undefined) return this.executionModeCache;
    const mode = await fetchAuditExecutionMode(this.auditId);
    this.executionModeCache = mode;
    return mode;
  }

  /**
   * Run the full agent pipeline.
   */
  async run(): Promise<DomainResult> {
    const { companyUrl, noPublicWebsite } = await this.getAuditWebContext();
    const ev = pipelineBaseEventCopy();

    // ─── Step 1: Collect data (NO AI) ────────────────────
    await this.emit('collecting', ev.collecting);
    const collectedData: Record<string, Record<string, unknown>> = {};

    for (const collector of this.collectors) {
      try {
        const result = await collector.run(this.auditId, companyUrl, { noPublicWebsite });
        collectedData[result.collector_key] = result.data;
        await this.emit(
          'log',
          interpolatePipelineEventMessage(ev.logCollected, { key: result.collector_key }),
        );
      } catch (err) {
        await this.emit(
          'log',
          interpolatePipelineEventMessage(ev.logCollectorFailed, {
            key: collector.key,
            message: (err as Error).message,
          }),
        );
      }
    }

    // ─── Step 2: Assemble context ────────────────────────
    await this.emit('assembling_context', ev.assemblingContext);
    const context = await this.contextBuilder.build(
      this.auditId,
      this.domainKey,
      collectedData,
      this.getEffectiveInstructions()
    );

    // ─── Step 3: Single Claude call ──────────────────────
    await this.emit('analyzing', ev.analyzing);

    // [C1] Check token budget with hard reserve and warning threshold
    const budget = await this.tokenTracker.checkBudget(this.auditId);
    if (!budget.within_budget) {
      throw new Error(`Token budget exceeded: ${budget.tokens_used}/${budget.token_budget}`);
    }
    if (budget.remaining < MIN_TOKEN_RESERVE) {
      throw new Error(
        `Insufficient token reserve: ${budget.remaining} remaining, need at least ${MIN_TOKEN_RESERVE}`
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

    // ─── Step 4: Fact-check ──────────────────────────────
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

      // ─── Step 4b: Build CONTROL_OBJECT v2.2 (advisory, side effect) ──
      // Does NOT change return value or block pipeline flow.
      try {
        // v1.7: extract BriefSnapshot from context.brief_responses for feasibility assessment
        const brief: BriefSnapshot = this.extractBriefSnapshot(context);
        const executionMode = await this.resolveExecutionMode();
        const riskProfile = await fetchAuditGovernanceRiskProfile(this.auditId);

        // v2.2: Run external connectors (Phase 7+). Non-blocking — always resolves.
        // Returns [] when no connectors are registered (zero-cost default path).
        const phaseProfile = getExtendedPhaseProfile(this.domainKey);
        const connectorEnrichments = await connectorRunner.runAll(
          this.domainKey as DomainKey,
          {
            high_risk_fact_types: phaseProfile.high_risk_fact_types,
            company_url: companyUrl,
          },
        );

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
        );
        this.lastControlObject = controlObject;
        // control_object pipeline_events row is emitted by PipelineOrchestrator after DecisionLayer sets decision_hint.
      } catch (controlErr) {
        // Non-fatal: control object build failure must never break phase execution
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

  /**
   * Call Claude with retry and exponential backoff.
   */
  protected async callClaudeWithRetry(
    context: AgentContext,
    schema: z.ZodSchema = this.outputSchema,
    maxTokens: number = MODEL_MAX_TOKENS.domain
  ): Promise<DomainResult> {
    const ev = pipelineBaseEventCopy();
    const { system, prompt, truncated, truncatedKeys } = this.contextBuilder.formatPrompt(context);
    if (truncated) {
      await this.emit(
        'warning',
        interpolatePipelineEventMessage(ev.contextTruncated, { keys: truncatedKeys.join(', ') }),
      );
    }
    const jsonSchema = zodToJsonSchema(schema);

    for (let attempt = 1; attempt <= CLAUDE_MAX_RETRIES; attempt++) {
      try {
        const consecutiveFailures = await getConsecutiveClaudeFailures();
        if (consecutiveFailures >= CLAUDE_CB_THRESHOLD) {
          throw new Error(
            `Claude circuit breaker open: ${consecutiveFailures} consecutive server failures in ${CLAUDE_CB_TTL_SEC}s window`,
          );
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort('Claude API timeout'), CLAUDE_TIMEOUT_MS);
        let response: Awaited<ReturnType<Anthropic['messages']['create']>>;
        try {
          response = await this.anthropic.messages.create(
            {
              model: CLAUDE_MODEL,
              max_tokens: maxTokens,
              system,                                       // ← role instructions in system channel
              messages: [{ role: 'user', content: prompt }],
              tools: [{
                name: 'submit_analysis',
                description: ev.claudeToolDescription,
                input_schema: jsonSchema as Anthropic.Tool['input_schema'],
              }],
              tool_choice: { type: 'tool', name: 'submit_analysis' },
            },
            {
              signal: controller.signal,
            },
          );
        } finally {
          clearTimeout(timer);
        }
        await resetClaudeFailures();

        // Extract tool use response
        const toolBlock = response.content.find(b => b.type === 'tool_use');
        if (!toolBlock || toolBlock.type !== 'tool_use') {
          throw new Error('Claude did not return tool_use response');
        }

        // Track tokens
        await this.tokenTracker.log(this.auditId, this.phaseNumber, {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
          model: CLAUDE_MODEL,
        });

        // Validate with Zod
        const parsed = schema.safeParse(toolBlock.input);
        if (!parsed.success) {
          await this.emit(
            'log',
            interpolatePipelineEventMessage(ev.validationErrorAttempt, {
              attempt,
              message: parsed.error.message,
            }),
          );
          if (attempt === CLAUDE_MAX_RETRIES) {
            throw new Error(
              `Response validation failed after ${CLAUDE_MAX_RETRIES} attempts: ${parsed.error.message}`,
            );
          }
          continue;
        }

        return parsed.data as DomainResult;
      } catch (err) {
        const error = err as Error & { status?: number };

        // Retry on rate limit or server errors
        if ((error.status === 429 || error.status === 500 || error.status === 529) && attempt < CLAUDE_MAX_RETRIES) {
          if (error.status === 500 || error.status === 529) {
            await recordClaudeFailure();
          }
          const jitter = Math.floor(Math.random() * CLAUDE_RETRY_JITTER_MS);
          const delay = CLAUDE_RETRY_BASE_MS * Math.pow(2, attempt - 1) + jitter;
          await this.emit(
            'log',
            interpolatePipelineEventMessage(ev.apiErrorRetry, { status: error.status ?? 0, delay }),
          );
          await sleep(delay);
          continue;
        }
        if (error.status === 500 || error.status === 529) {
          await recordClaudeFailure();
        }

        logger.error('Claude call failed', {
          phase: this.phaseNumber,
          domain_key: this.domainKey,
          attempt,
          status: error.status ?? null,
          error: error.message,
        });
        throw err;
      }
    }

    throw new Error('All retry attempts failed');
  }

  /**
   * Save domain result to database.
   *
   * [C3] Atomic approach: a single UPDATE WHERE status='pending' claims the placeholder
   * under Postgres row-level lock — eliminates the TOCTOU race condition between
   * concurrent retries that could otherwise both write to the same row.
   */
  async saveDomainResult(result: DomainResult): Promise<void> {
    if (this.domainKey === 'recon' || this.domainKey === 'strategy') return;

    const payload = {
      status: 'completed' as const,
      score: result.score,
      label: result.label,
      summary: result.summary,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      issues: result.issues,
      quick_wins: result.quick_wins,
      recommendations: result.recommendations,
      unknown_items: result.unknown_items ?? [],
      confidence_distribution: result.confidence_distribution ?? null,
      prompt_version: promptVersion(this.domainKey),
    };

    // Atomic claim: UPDATE WHERE status='pending'.
    // Postgres serializes this with a row-level lock — only one concurrent caller
    // can match the pending placeholder; the other gets an empty result set.
    const { data: updated } = await supabase
      .from('audit_domains')
      .update(payload)
      .eq('audit_id', this.auditId)
      .eq('domain_key', this.domainKey)
      .eq('status', 'pending')
      .select('id');

    if (!(updated && updated.length > 0)) {
      // No pending placeholder — retry path: find highest existing version and insert at version + 1.
      // Guard against races by retrying on unique conflict.
      const maxInsertAttempts = 3;
      for (let attempt = 1; attempt <= maxInsertAttempts; attempt++) {
        const { data: latest } = await supabase
          .from('audit_domains')
          .select('version')
          .eq('audit_id', this.auditId)
          .eq('domain_key', this.domainKey)
          .order('version', { ascending: false })
          .limit(1)
          .single();

        const { error: insertError } = await supabase.from('audit_domains').insert({
          audit_id: this.auditId,
          domain_key: this.domainKey,
          phase_number: this.phaseNumber,
          version: (latest?.version ?? 1) + 1,
          ...payload,
        });
        if (!insertError) break;
        if (insertError.code !== '23505' || attempt === maxInsertAttempts) {
          throw insertError;
        }
      }
    }

    await this.mergePostAuditFollowups(result);
  }

  /**
   * v1.7: Extract a BriefSnapshot from AgentContext.brief_responses for FeasibilityLayer.
   * Maps canonical brief_responses keys to the typed BriefSnapshot fields.
   * Unknown/absent keys default to undefined (FeasibilityLayer handles missing fields gracefully).
   */
  private extractBriefSnapshot(context: AgentContext): BriefSnapshot {
    const r = context.brief_responses ?? {};
    const num = (key: string): number | undefined => {
      const v = r[key];
      return typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) || undefined : undefined;
    };
    const bool = (key: string): boolean | undefined => {
      const v = r[key];
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') return v === 'yes' || v === 'true';
      return undefined;
    };

    return {
      team_size: num('team_size') ?? num('company_size'),
      has_dedicated_dev_team: bool('has_dedicated_dev_team') ?? bool('dedicated_dev_team'),
      has_audit_policy: bool('has_audit_policy') ?? bool('compliance_policy'),
      has_analytics: bool('has_analytics') ?? bool('uses_analytics'),
      has_crm: bool('has_crm') ?? bool('uses_crm'),
      monthly_budget_usd: num('monthly_budget_usd') ?? num('monthly_budget') ?? num('marketing_budget'),
      integration_count: num('integration_count') ?? num('tool_count'),
      tech_maturity: num('tech_maturity'),
    };
  }

  /**
   * Append domain-specific follow-up brief questions from unknown_items (idempotent per domain+id).
   */
  private async mergePostAuditFollowups(result: DomainResult): Promise<void> {
    const dk = this.domainKey;
    if (dk === 'recon' || dk === 'strategy') return;

    const newQs = followupQuestionsFromUnknowns(dk as DomainKey, result.unknown_items ?? []);
    if (newQs.length === 0) return;

    const { data: row, error } = await supabase
      .from('intake_brief')
      .select('post_audit_questions')
      .eq('audit_id', this.auditId)
      .maybeSingle();

    if (error) return; // real DB error — skip silently, don't corrupt state

    const existing = (row?.post_audit_questions as Array<{ domain?: string; id?: string }>) ?? [];
    const existingKeys = new Set(existing.map(q => `${q.domain}:${q.id}`));
    const toAdd = newQs.filter(q => !existingKeys.has(`${q.domain}:${q.id}`));
    if (toAdd.length === 0) return;

    const merged = [...existing, ...toAdd];

    if (!row) {
      // intake_brief row doesn't exist yet — create it with just the followup questions
      await supabase
        .from('intake_brief')
        .insert({ audit_id: this.auditId, post_audit_questions: merged, responses: {} });
    } else {
      await supabase
        .from('intake_brief')
        .update({ post_audit_questions: merged })
        .eq('audit_id', this.auditId);
    }
  }

  /**
   * Persists to `pipeline_events` (product UI / timeline). Prefer strings from
   * `pipeline-events-copy.v1.json` for user-facing steps; use `eventType: 'log'` for technical lines.
   */
  protected async emit(eventType: string, message: string, data: Record<string, unknown> = {}): Promise<void> {
    updateContext({ auditId: this.auditId });
    const ctx = getContext();
    await supabase.from('pipeline_events').insert({
      audit_id: this.auditId,
      phase: this.phaseNumber,
      event_type: eventType,
      message,
      data: {
        ...data,
        trace_id: ctx?.traceId,
        operation_id: ctx?.operationId,
      },
    });
  }

  /**
   * [C2] Throws if the audit row is missing or inaccessible — prevents silent
   * empty-string company URLs from propagating into collectors and Claude prompts.
   */
  protected async getAuditWebContext(): Promise<{ companyUrl: string; noPublicWebsite: boolean }> {
    const { data, error } = await supabase
      .from('audits')
      .select('company_url, no_public_website')
      .eq('id', this.auditId)
      .single();

    if (error || !data) {
      throw new Error(`Audit not found or inaccessible: ${this.auditId}`);
    }

    return {
      companyUrl: data.company_url as string,
      noPublicWebsite: data.no_public_website === true,
    };
  }

  protected async getCompanyUrl(): Promise<string> {
    const { companyUrl } = await this.getAuditWebContext();
    return companyUrl;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
