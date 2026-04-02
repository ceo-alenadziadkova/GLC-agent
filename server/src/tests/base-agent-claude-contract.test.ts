/**
 * Contract tests: BaseAgent.callClaudeWithRetry (AI tool_use + Zod)
 *
 * Mocks Anthropic SDK and Supabase. Exercises:
 *   - invalid tool input: retry until MAX_RETRIES, then throw
 *   - invalid then valid: succeeds on second API call
 *   - missing tool_use: immediate error (no HTTP retry path)
 *
 * Does not call real Claude.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AgentContext } from '../services/context-builder.js';
import { ContextBuilder } from '../services/context-builder.js';
import { DomainOutputSchema } from '../schemas/domain-output.js';
import { TokenTracker } from '../services/token-tracker.js';

const { mockAnthropicCreate } = vi.hoisted(() => {
  const mockAnthropicCreate = vi.fn();
  (globalThis as Record<string, unknown>).__anthropicCreate = mockAnthropicCreate;
  return { mockAnthropicCreate };
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: class AnthropicMock {
    messages = {
      create: (...args: unknown[]) =>
        ((globalThis as Record<string, unknown>).__anthropicCreate as (...a: unknown[]) => unknown)(...args),
    };
  },
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(async () => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(async () => ({ data: {}, error: null })),
      })),
      update: vi.fn(() => ({ eq: vi.fn().mockReturnThis() })),
    })),
    rpc: vi.fn(async () => ({ error: null })),
  },
}));

import { BaseAgent } from '../agents/base.js';
import type { DomainKey } from '../types/audit.js';
import type { BaseCollector } from '../collectors/base.js';
import type { z } from 'zod';

function makeAgentContext(): AgentContext {
  return {
    company_url: 'https://example.com',
    company_name: 'Example',
    industry: null,
    recon: null,
    collected_data: {},
    previous_domains: [],
    review_notes: [],
    domain_weight: 1,
    brief_responses: {},
    brief_response_sources: {},
    intake_data_quality_score: 0,
    intake_readiness_badge: 'medium',
    post_audit_questions: [],
    failed_domains: [],
    instructions: 'test',
  };
}

function makeValidToolInput(): z.infer<typeof DomainOutputSchema> {
  const pad = 'Word '.repeat(20);
  return {
    score: 3,
    label: 'Moderate',
    summary: pad,
    strengths: ['Solid stack'],
    weaknesses: ['Legacy deps'],
    issues: [
      {
        id: 'issue-1',
        severity: 'high',
        title: 'Sample issue',
        description: 'Description of the issue long enough for schema tests.',
        impact: 'High',
        confidence: 'high',
        evidence_refs: [{ type: 'stub', finding: 'collector saw X' }],
        data_source: 'auto_detected',
      },
    ],
    quick_wins: [],
    recommendations: [
      {
        id: 'rec-1',
        title: 'Fix it',
        description: 'Actionable recommendation text for the contract test case.',
        priority: 'high',
        estimated_cost: 'Low',
        estimated_time: '1 week',
        impact: 'High',
      },
    ],
    unknown_items: [],
  };
}

function makeInvalidToolInput(): Record<string, unknown> {
  const valid = makeValidToolInput();
  return { ...valid, summary: 'too short' };
}

function toolUseResponse(input: unknown) {
  return {
    content: [{ type: 'tool_use' as const, name: 'submit_analysis', input }],
    usage: { input_tokens: 10, output_tokens: 20 },
  };
}

class HarnessAgent extends BaseAgent {
  get phaseNumber() {
    return 1;
  }
  get domainKey(): DomainKey {
    return 'tech_infrastructure';
  }
  get collectors(): BaseCollector[] {
    return [];
  }
  get instructions() {
    return 'test harness';
  }
  get outputSchema() {
    return DomainOutputSchema;
  }

  exerciseCall(ctx: AgentContext) {
    return this.callClaudeWithRetry(ctx);
  }
}

describe('BaseAgent.callClaudeWithRetry — AI output contract', () => {
  let formatPromptSpy: ReturnType<typeof vi.spyOn>;
  let tokenLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    formatPromptSpy = vi.spyOn(ContextBuilder.prototype, 'formatPrompt').mockReturnValue({
      system: 'sys',
      prompt: 'user prompt',
      truncated: false,
      truncatedKeys: [],
    });
    tokenLogSpy = vi.spyOn(TokenTracker.prototype, 'log').mockResolvedValue(undefined);
  });

  afterEach(() => {
    formatPromptSpy.mockRestore();
    tokenLogSpy.mockRestore();
  });

  it('throws after MAX_RETRIES when tool input repeatedly fails Zod', async () => {
    mockAnthropicCreate.mockResolvedValue(toolUseResponse(makeInvalidToolInput()));

    const agent = new HarnessAgent('audit-contract-1');
    await expect(agent.exerciseCall(makeAgentContext())).rejects.toThrow(
      /Response validation failed after 3 attempts/i,
    );
    expect(mockAnthropicCreate).toHaveBeenCalledTimes(3);
    // Tokens are logged for each API response before Zod validation.
    expect(tokenLogSpy).toHaveBeenCalledTimes(3);
  });

  it('succeeds when a later attempt returns valid tool input', async () => {
    mockAnthropicCreate
      .mockResolvedValueOnce(toolUseResponse(makeInvalidToolInput()))
      .mockResolvedValueOnce(toolUseResponse(makeValidToolInput()));

    const agent = new HarnessAgent('audit-contract-2');
    const result = await agent.exerciseCall(makeAgentContext());

    expect(result.score).toBe(3);
    expect(result.label).toBe('Moderate');
    expect(mockAnthropicCreate).toHaveBeenCalledTimes(2);
    expect(tokenLogSpy).toHaveBeenCalledTimes(2);
  });

  it('throws when Claude returns no tool_use block', async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text' as const, text: 'plain' }],
      usage: { input_tokens: 1, output_tokens: 2 },
    });

    const agent = new HarnessAgent('audit-contract-3');
    await expect(agent.exerciseCall(makeAgentContext())).rejects.toThrow(/did not return tool_use/i);
    expect(mockAnthropicCreate).toHaveBeenCalledTimes(1);
    expect(tokenLogSpy).not.toHaveBeenCalled();
  });

  it('retries on 429 then succeeds (fake timers)', async () => {
    vi.useFakeTimers();
    try {
      const err429 = Object.assign(new Error('rate limited'), { status: 429 });
      mockAnthropicCreate
        .mockRejectedValueOnce(err429)
        .mockResolvedValueOnce(toolUseResponse(makeValidToolInput()));

      const agent = new HarnessAgent('audit-contract-4');
      const callPromise = agent.exerciseCall(makeAgentContext());

      await vi.runAllTimersAsync();

      const result = await callPromise;
      expect(result.score).toBe(3);
      expect(mockAnthropicCreate).toHaveBeenCalledTimes(2);
      // First call errored before token log; only successful response logs usage.
      expect(tokenLogSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
