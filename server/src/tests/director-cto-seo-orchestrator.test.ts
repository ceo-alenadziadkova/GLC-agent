import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRunCto = vi.fn();
const mockRunSeo = vi.fn();

vi.mock('../agents/sub/cto/readiness.js', () => ({
  CtoReadinessAgent: class {
    runSubAgent = mockRunCto;
  },
}));

vi.mock('../agents/sub/seo/visibility-layer.js', () => ({
  SeoVisibilityLayerAgent: class {
    runSubAgent = mockRunSeo;
  },
}));

import { runCtoDirectorDeepDiveOrchestrator } from '../services/orchestration/director-cto-orchestrator.service.js';
import { runSeoDirectorDeepDiveOrchestrator } from '../services/orchestration/director-seo-orchestrator.service.js';

describe('director cto/seo orchestrators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs CTO sub-agent and materializes action', async () => {
    mockRunCto.mockResolvedValueOnce({
      readiness_summary: 'CTO readiness summary for resilient delivery and scaling.',
      architecture_focus: ['deployment safety', 'service observability'],
      delivery_risks: ['legacy coupling'],
      analysis_mode: 'researched',
    });
    const result = await runCtoDirectorDeepDiveOrchestrator({
      auditId: 'audit-1',
      domainKey: 'tech_infrastructure',
      goals: ['stabilize deploys'],
      constraints: ['small team'],
    });
    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.actions[0]?.id).toContain('sub_agent:cto.readiness');
  });

  it('falls back deterministically when SEO sub-agent fails', async () => {
    mockRunSeo.mockRejectedValueOnce(new Error('upstream failure'));
    const result = await runSeoDirectorDeepDiveOrchestrator({
      auditId: 'audit-2',
      domainKey: 'seo_digital',
      goals: ['increase organic'],
      constraints: ['low content bandwidth'],
    });
    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.actions[0]?.id).toContain('sub_agent:seo.visibility_layer');
  });
});
