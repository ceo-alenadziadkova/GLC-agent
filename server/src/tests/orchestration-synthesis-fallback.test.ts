import { describe, expect, it, vi, beforeEach } from 'vitest';
import { runOrchestrationSynthesisIfEnabled } from '../services/orchestration/orchestration-synthesis.service.js';

vi.mock('../services/orchestration/orchestration-pack-synthesis-claude.js', () => ({
  invokeOrchestrationPackSynthesisClaude: vi.fn().mockRejectedValue(new Error('injected_synthesis_failure')),
}));

vi.mock('../config/feature-flags.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/feature-flags.js')>();
  return {
    ...actual,
    isOrchestrationConflictSynthesisEnabled: () => true,
    getOrchestrationConflictSynthesisRolloutPercent: () => 100,
  };
});

vi.mock('../services/token-tracker.js', () => ({
  TokenTracker: class {
    checkBudget = async () => ({ within_budget: true, remaining: 1_000_000 });
  },
}));

vi.mock('../agents/base.js', () => ({
  loadPrompt: () => 'ok',
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: () => ({
      insert: async () => ({ error: null }),
    }),
  },
}));

describe('runOrchestrationSynthesisIfEnabled deterministic fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns deterministic pack when Claude synthesis throws', async () => {
    const { invokeOrchestrationPackSynthesisClaude } = await import(
      '../services/orchestration/orchestration-pack-synthesis-claude.js'
    );
    const det = {
      version: 2,
      graph: { nodes: [], edges: [] },
      lanes: {
        product_change: [],
        tech_delivery: [],
        marketing_narrative: [],
        seo: [],
        processes_automation: [],
        risk_compliance: [],
      },
      critical_path: [],
      conflicts_resolved: [],
      manifest_snapshot_id: '00000000-0000-4000-8000-000000000001',
      phase_diagnostic: { dominant_constraint: 'capacity', constraint_chain: ['capacity'] },
      routing_profile: { strategy: 'toc_dynamic_routing_v1' as const, domain_weights: {} as Record<string, never> },
    };
    const out = await runOrchestrationSynthesisIfEnabled({
      auditId: '00000000-0000-4000-8000-000000000099',
      deterministicPack: det as never,
      normalizedStrategy: {},
      domainRows: [],
    });
    expect(out).toEqual(det);
    expect(invokeOrchestrationPackSynthesisClaude).toHaveBeenCalled();
  });
});
