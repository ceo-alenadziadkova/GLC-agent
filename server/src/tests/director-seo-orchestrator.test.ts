import { afterEach, describe, expect, it, vi } from 'vitest';

import { SeoVisibilityBaselineAgent } from '../agents/sub/seo/visibility-baseline.js';
import { runSeoDirectorDeepDiveOrchestrator } from '../services/orchestration/director-seo-orchestrator.service.js';

describe('runSeoDirectorDeepDiveOrchestrator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('expands requested SEO subset with dependency-preserving action graph', async () => {
    const out = await runSeoDirectorDeepDiveOrchestrator({
      auditId: 'audit-test',
      domainKey: 'seo_digital',
      goals: ['Grow organic pipeline'],
      constraints: ['No content headcount increase'],
      requestedSubAgentIds: ['seo.measurement_experimentation'],
    });

    const actionIds = out.actions.map((action) => action.id);
    expect(actionIds).toContain('sub_agent:seo.measurement_experimentation:seo_digital');
    expect(actionIds).toContain('sub_agent:seo.visibility_baseline:seo_digital');
    expect(actionIds).toContain('sub_agent:seo.content_intent_coverage:seo_digital');

    const measurement = out.actions.find((action) => action.id === 'sub_agent:seo.measurement_experimentation:seo_digital');
    expect(measurement?.dependencies).toContain('sub_agent:seo.visibility_baseline:seo_digital');
    expect(measurement?.dependencies).toContain('sub_agent:seo.local_international_readiness:seo_digital');
  });

  it('marks fallback evidence when SEO sub-agent runtime fails', async () => {
    vi.spyOn(SeoVisibilityBaselineAgent.prototype, 'runSubAgent').mockRejectedValue(new Error('force fallback'));
    const out = await runSeoDirectorDeepDiveOrchestrator({
      auditId: 'audit-test',
      domainKey: 'seo_digital',
      goals: ['Increase non-brand traffic'],
      constraints: ['Limited tracking quality'],
    });

    const baseline = out.actions.find((action) => action.id === 'sub_agent:seo.visibility_baseline:seo_digital');
    expect(baseline?.evidence?.missing).toContain('analysis_mode: deterministic_fallback');
  });
});
