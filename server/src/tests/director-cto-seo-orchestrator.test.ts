import { describe, expect, it } from 'vitest';

import { runCtoDirectorDeepDiveOrchestrator } from '../services/orchestration/director-cto-orchestrator.service.js';
import { runSeoDirectorDeepDiveOrchestrator } from '../services/orchestration/director-seo-orchestrator.service.js';

describe('director cto/seo orchestrators', () => {
  it('runs CTO orchestrator and materializes wave action ids', async () => {
    const result = await runCtoDirectorDeepDiveOrchestrator({
      auditId: 'audit-1',
      domainKey: 'tech_infrastructure',
      goals: ['stabilize deploys'],
      constraints: ['small team'],
    });
    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.actions[0]?.id).toContain('sub_agent:cto.readiness_baseline');
  });

  it('runs SEO orchestrator and materializes wave action ids', async () => {
    const result = await runSeoDirectorDeepDiveOrchestrator({
      auditId: 'audit-2',
      domainKey: 'seo_digital',
      goals: ['increase organic'],
      constraints: ['low content bandwidth'],
    });
    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.actions[0]?.id).toContain('sub_agent:seo.visibility_baseline');
  });
});
