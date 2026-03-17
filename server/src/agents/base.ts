import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../services/supabase.js';
import { ContextBuilder, type AgentContext } from '../services/context-builder.js';
import { FactChecker } from '../services/fact-checker.js';
import { TokenTracker } from '../services/token-tracker.js';
import { type BaseCollector } from '../collectors/base.js';
import type { DomainResult, DomainKey } from '../types/audit.js';
import { DomainOutputSchema, zodToJsonSchema } from '../schemas/domain-output.js';
import type { z } from 'zod';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;

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

  constructor(auditId: string) {
    this.auditId = auditId;
    this.anthropic = new Anthropic();
    this.contextBuilder = new ContextBuilder();
    this.factChecker = new FactChecker();
    this.tokenTracker = new TokenTracker();
  }

  /**
   * Run the full agent pipeline.
   */
  async run(): Promise<DomainResult> {
    const companyUrl = await this.getCompanyUrl();

    // ─── Step 1: Collect data (NO AI) ────────────────────
    await this.emit('collecting', 'Collecting raw data...');
    const collectedData: Record<string, Record<string, unknown>> = {};

    for (const collector of this.collectors) {
      try {
        const result = await collector.run(this.auditId, companyUrl);
        collectedData[result.collector_key] = result.data;
        await this.emit('log', `✓ Collected: ${result.collector_key}`);
      } catch (err) {
        await this.emit('log', `⚠ Collector ${collector.key} failed: ${(err as Error).message}`);
      }
    }

    // ─── Step 2: Assemble context ────────────────────────
    await this.emit('assembling_context', 'Building analysis context...');
    const context = await this.contextBuilder.build(
      this.auditId,
      this.domainKey,
      collectedData,
      this.instructions
    );

    // ─── Step 3: Single Claude call ──────────────────────
    await this.emit('analyzing', 'Running AI analysis...');

    // Check token budget before calling
    const budget = await this.tokenTracker.checkBudget(this.auditId);
    if (!budget.within_budget) {
      throw new Error(`Token budget exceeded: ${budget.tokens_used}/${budget.token_budget}`);
    }

    const result = await this.callClaudeWithRetry(context);

    // ─── Step 4: Fact-check ──────────────────────────────
    if (this.domainKey !== 'recon' && this.domainKey !== 'strategy') {
      const verification = this.factChecker.verify(result, this.domainKey, collectedData);
      if (verification.corrections.length > 0) {
        await this.emit('fact_check', `Found ${verification.corrections.length} fact-check flag(s)`, {
          corrections: verification.corrections,
          confidence: verification.confidence,
        });
      }
      return verification.result;
    }

    return result;
  }

  /**
   * Call Claude with retry and exponential backoff.
   */
  private async callClaudeWithRetry(context: AgentContext): Promise<DomainResult> {
    const prompt = this.contextBuilder.formatPrompt(context);
    const jsonSchema = zodToJsonSchema(this.outputSchema);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.anthropic.messages.create({
          model: MODEL,
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
          tools: [{
            name: 'submit_analysis',
            description: 'Submit the structured analysis results',
            input_schema: jsonSchema as Anthropic.Tool['input_schema'],
          }],
          tool_choice: { type: 'tool', name: 'submit_analysis' },
        });

        // Extract tool use response
        const toolBlock = response.content.find(b => b.type === 'tool_use');
        if (!toolBlock || toolBlock.type !== 'tool_use') {
          throw new Error('Claude did not return tool_use response');
        }

        // Track tokens
        await this.tokenTracker.log(this.auditId, this.phaseNumber, {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
          model: MODEL,
        });

        // Validate with Zod
        const parsed = this.outputSchema.safeParse(toolBlock.input);
        if (!parsed.success) {
          await this.emit('log', `⚠ Validation error (attempt ${attempt}): ${parsed.error.message}`);
          if (attempt === MAX_RETRIES) {
            throw new Error(`Response validation failed after ${MAX_RETRIES} attempts: ${parsed.error.message}`);
          }
          continue;
        }

        return parsed.data as DomainResult;
      } catch (err) {
        const error = err as Error & { status?: number };

        // Retry on rate limit or server errors
        if ((error.status === 429 || error.status === 500 || error.status === 529) && attempt < MAX_RETRIES) {
          const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
          await this.emit('log', `⚠ API error (${error.status}), retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        throw err;
      }
    }

    throw new Error('All retry attempts failed');
  }

  /**
   * Save domain result to database.
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
    };

    // Check whether the pending placeholder exists to update in-place (first run),
    // or whether we need to insert a new versioned row (retry scenario).
    // NOTE: audit_domains has version DEFAULT 1, so placeholders always start at v1.
    // The old version-arithmetic approach was broken: existing.version=1 → version=2
    // → always took the insert branch, leaving the placeholder stale forever.
    const { data: placeholder } = await supabase
      .from('audit_domains')
      .select('id')
      .eq('audit_id', this.auditId)
      .eq('domain_key', this.domainKey)
      .eq('status', 'pending')
      .limit(1)
      .single();

    if (placeholder) {
      // First run — update the placeholder in-place
      await supabase
        .from('audit_domains')
        .update(payload)
        .eq('id', placeholder.id);
    } else {
      // Retry — find the highest existing version and insert version + 1
      const { data: latest } = await supabase
        .from('audit_domains')
        .select('version')
        .eq('audit_id', this.auditId)
        .eq('domain_key', this.domainKey)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      await supabase.from('audit_domains').insert({
        audit_id: this.auditId,
        domain_key: this.domainKey,
        phase_number: this.phaseNumber,
        version: (latest?.version ?? 1) + 1,
        ...payload,
      });
    }
  }

  protected async emit(eventType: string, message: string, data: Record<string, unknown> = {}): Promise<void> {
    await supabase.from('pipeline_events').insert({
      audit_id: this.auditId,
      phase: this.phaseNumber,
      event_type: eventType,
      message,
      data,
    });
  }

  protected async getCompanyUrl(): Promise<string> {
    const { data } = await supabase
      .from('audits')
      .select('company_url')
      .eq('id', this.auditId)
      .single();
    return data?.company_url ?? '';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
