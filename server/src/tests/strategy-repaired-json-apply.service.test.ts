import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlObjectV1 } from '../schemas/control-object/index.js';
import type { DomainResult } from '../types/audit.js';

const repairedApplyMocks = vi.hoisted(() => {
  const auditIdConst = 'audit-strategy-repair-001';
  let audit: { id: string; status: string } | null = { id: auditIdConst, status: 'analytic' };
  let strategyRow: { audit_id: string } | null = { audit_id: auditIdConst };

  const insertAgentPipelineEvent = vi.fn(async () => {});
  const writeStrategyCompletionToDatabase = vi.fn(async () => {});
  const hydrateStrategyAfterParse = vi.fn();
  const loadContextSnapshot = vi.fn(async () => ({ alignmentResponses: [] as Array<Record<string, unknown>> }));

  const from = vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => {
          if (table === 'audits') return { data: audit, error: null };
          return { data: strategyRow, error: null };
        }),
      })),
    })),
  }));

  return {
    auditIdConst,
    insertAgentPipelineEvent,
    writeStrategyCompletionToDatabase,
    hydrateStrategyAfterParse,
    loadContextSnapshot,
    resetAuditState: () => {
      audit = { id: auditIdConst, status: 'analytic' };
      strategyRow = { audit_id: auditIdConst };
    },
    setAudit: (row: typeof audit) => {
      audit = row;
    },
    setStrategyRow: (row: typeof strategyRow) => {
      strategyRow = row;
    },
    from,
  };
});

vi.mock('../agents/base/agent-pipeline-emit.js', () => ({
  insertAgentPipelineEvent: repairedApplyMocks.insertAgentPipelineEvent,
}));

vi.mock('../services/strategy/strategy-completion-db.js', () => ({
  writeStrategyCompletionToDatabase: repairedApplyMocks.writeStrategyCompletionToDatabase,
}));

vi.mock('../services/strategy/hydrate-strategy-after-parse.js', () => ({
  hydrateStrategyAfterParse: repairedApplyMocks.hydrateStrategyAfterParse,
}));

vi.mock('../services/context-builder/load-context-snapshot.js', () => ({
  loadContextSnapshot: repairedApplyMocks.loadContextSnapshot,
}));

vi.mock('../services/supabase.js', () => ({
  supabase: { from: repairedApplyMocks.from },
}));

import { StrategyInitiativeSchema, StrategyOutputSchema } from '../schemas/domain-output.js';
import { AGENT_OUTPUT_LIMITS } from '../config/agent-output-limits.js';
import {
  API_ERROR_CODES,
  PIPELINE_AUDIT_NOT_FOUND_MESSAGE,
} from '../config/api-error-codes.js';
import { PLATFORM_STRATEGY_REPAIRED_JSON_ALREADY_COMPLETED_MESSAGE } from '../config/api-user-messages.en.js';
import { runStrategyRepairedJsonApplyOrchestrated } from '../services/strategy/strategy-repaired-json-apply.service.js';

const AUDIT_ID = repairedApplyMocks.auditIdConst;

function makeStrategyFixture() {
  const executiveSummary = 'y'.repeat(AGENT_OUTPUT_LIMITS.strategyExecutiveSummaryMinChars);

  const initiative = (id: string, title: string) =>
    StrategyInitiativeSchema.parse({
      id,
      title,
      description: 'Desc'.repeat(4),
      domain: 'marketing_utp',
      stage: 'growth',
      priority: 'high',
      impact: 'high',
      effort: 'medium',
      confidence: 0.7,
      context: { signals: ['Low conversion on primary landing'] },
      outcome: { description: 'Lift conversion' },
      scope: { includes: ['Landing CTA'], excludes: ['Full rebrand'] },
      execution_paths: [
        { type: 'fast', description: 'No-code', time_estimate: '5d' },
        { type: 'scalable', description: 'Custom build', time_estimate: '3w' },
      ],
      decision: { why_this: ['High leverage'] },
      evidence: { sources: [{ domain_key: 'marketing_utp', signal: 'Heuristic signal' }] },
    });

  return StrategyOutputSchema.parse({
    executive_summary: executiveSummary,
    overall_score: 4,
    quick_wins: [initiative('qw-1', 'Fix CTA'), initiative('qw-2', 'Tighten copy')],
    medium_term: [initiative('mt-1', 'Improve attribution'), initiative('mt-2', 'Instrument funnel')],
    strategic: [initiative('st-1', 'Launch partner channel')],
    scorecard: [
      {
        domain_key: 'marketing_utp',
        label: 'Marketing',
        score: 3,
        weight: 1,
        weighted_score: 3,
      },
    ],
  });
}

describe('runStrategyRepairedJsonApplyOrchestrated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repairedApplyMocks.resetAuditState();
    repairedApplyMocks.loadContextSnapshot.mockResolvedValue({ alignmentResponses: [] });
  });

  it('returns 404 when audit is missing', async () => {
    repairedApplyMocks.setAudit(null);

    const out = await runStrategyRepairedJsonApplyOrchestrated({
      auditId: AUDIT_ID,
      rawToolInput: {},
      forceReplaceCompletedAudit: false,
      deps: {
        publishControlObjectGovernance: vi.fn(async () => {}),
      },
    });

    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.status).toBe(404);
      expect(out.body.code).toBe(API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND);
      expect(out.body.error).toBe(PIPELINE_AUDIT_NOT_FOUND_MESSAGE);
    }
  });

  it('returns 409 when audit already completed unless force flag is set', async () => {
    repairedApplyMocks.setAudit({ id: AUDIT_ID, status: 'completed' });

    const fixture = makeStrategyFixture();
    const blocked = await runStrategyRepairedJsonApplyOrchestrated({
      auditId: AUDIT_ID,
      rawToolInput: fixture,
      forceReplaceCompletedAudit: false,
      deps: { publishControlObjectGovernance: vi.fn(async () => {}) },
    });

    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.status).toBe(409);
      expect(blocked.body.code).toBe(API_ERROR_CODES.PLATFORM_STRATEGY_REPAIRED_JSON_PRECONDITION);
      expect(blocked.body.error).toBe(PLATFORM_STRATEGY_REPAIRED_JSON_ALREADY_COMPLETED_MESSAGE);
    }

    const publish = vi.fn(async () => {});
    repairedApplyMocks.hydrateStrategyAfterParse.mockResolvedValue({
      strategyResult: fixture,
      weightedScore: fixture.overall_score,
      quick_wins: fixture.quick_wins,
      medium_term: fixture.medium_term,
      strategic: fixture.strategic,
      lastRawDomainResult: fixture as unknown as Record<string, unknown>,
      lastControlObject: { context: {} } as ControlObjectV1,
      cleanedOutput: {} as DomainResult,
      missingCrossDomainDependencyIds: [],
    });

    const allowed = await runStrategyRepairedJsonApplyOrchestrated({
      auditId: AUDIT_ID,
      rawToolInput: fixture,
      forceReplaceCompletedAudit: true,
      deps: { publishControlObjectGovernance: publish },
    });

    expect(allowed.ok).toBe(true);
    expect(publish).toHaveBeenCalledTimes(1);
    expect(repairedApplyMocks.writeStrategyCompletionToDatabase).toHaveBeenCalledTimes(1);
    expect(repairedApplyMocks.insertAgentPipelineEvent).toHaveBeenCalled();
  });
});
