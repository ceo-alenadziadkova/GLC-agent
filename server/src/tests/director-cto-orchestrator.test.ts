import { afterEach, describe, expect, it, vi } from 'vitest';

import { CtoReadinessBaselineAgent } from '../agents/sub/cto/readiness-baseline.js';
import { runCtoDirectorDeepDiveOrchestrator } from '../services/orchestration/director-cto-orchestrator.service.js';

describe('runCtoDirectorDeepDiveOrchestrator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('expands requested CTO subset with dependency-preserving action graph', async () => {
    const out = await runCtoDirectorDeepDiveOrchestrator({
      auditId: 'audit-test',
      domainKey: 'tech_infrastructure',
      goals: ['Reduce release risk'],
      constraints: ['Small platform team'],
      requestedSubAgentIds: ['cto.roadmap_tradeoffs'],
    });

    const actionIds = out.actions.map((action) => action.id);
    expect(actionIds).toContain('sub_agent:cto.roadmap_tradeoffs:tech_infrastructure');
    expect(actionIds).toContain('sub_agent:cto.readiness_baseline:tech_infrastructure');
    expect(actionIds).toContain('sub_agent:cto.delivery_release_safety:tech_infrastructure');

    const tradeoff = out.actions.find((action) => action.id === 'sub_agent:cto.roadmap_tradeoffs:tech_infrastructure');
    expect(tradeoff?.dependencies).toContain('sub_agent:cto.readiness_baseline:tech_infrastructure');
    expect(tradeoff?.dependencies).toContain('sub_agent:cto.data_platform_resilience:tech_infrastructure');
  });

  it('marks fallback evidence when CTO sub-agent runtime fails', async () => {
    vi.spyOn(CtoReadinessBaselineAgent.prototype, 'runSubAgent').mockRejectedValue(new Error('force fallback'));
    const out = await runCtoDirectorDeepDiveOrchestrator({
      auditId: 'audit-test',
      domainKey: 'tech_infrastructure',
      goals: ['Increase platform reliability'],
      constraints: ['Legacy infra'],
    });

    const baseline = out.actions.find((action) => action.id === 'sub_agent:cto.readiness_baseline:tech_infrastructure');
    expect(baseline?.evidence?.missing).toContain('analysis_mode: deterministic_fallback');
  });
});
