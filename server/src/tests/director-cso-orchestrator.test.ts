import { afterEach, describe, expect, it, vi } from 'vitest';
import { CsoCaseClassifierAgent } from '../agents/sub/cso/case-classifier.js';
import { runCsoSubAgentOrchestrator } from '../services/orchestration/director-cso-orchestrator.service.js';

describe('runCsoSubAgentOrchestrator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ordered CSO agents, QA block, and director bundle actions', async () => {
    const out = await runCsoSubAgentOrchestrator({
      auditId: 'audit-test',
      domainKey: 'security_compliance',
      goals: ['Improve vendor risk posture'],
      constraints: ['GDPR applies'],
    });
    expect(out.run_order).toEqual(['cso.case_classifier', 'cso.threat_model', 'cso.compliance_map']);
    expect(out.director_bundle.actions.length).toBeGreaterThan(0);
    expect(out.director_bundle.actions[0]?.id).toContain('sub_agent:cso');
    expect(out.qa_block.measurement.length).toBeGreaterThan(0);
  });

  it('uses deterministic fallback when sub-agent runtime fails', async () => {
    vi.spyOn(CsoCaseClassifierAgent.prototype, 'runSubAgent').mockRejectedValue(new Error('force fallback'));
    const out = await runCsoSubAgentOrchestrator({
      auditId: 'audit-test',
      domainKey: 'security_compliance',
      goals: ['Baseline hardening'],
      constraints: [],
    });
    const row = out.agent_outputs['cso.case_classifier'] as { metadata?: { analysis_mode?: string } } | undefined;
    expect(row?.metadata?.analysis_mode).toBe('deterministic_fallback');
  });

  it('expands requested CSO subset with dependency-preserving run order', async () => {
    const out = await runCsoSubAgentOrchestrator({
      auditId: 'audit-test',
      domainKey: 'security_compliance',
      goals: ['Reduce compliance exposure'],
      constraints: ['Short timeline'],
      requestedSubAgentIds: ['cso.compliance_map', 'cso.case_classifier'],
    });
    expect(out.selected_sub_agents).toEqual(['cso.case_classifier', 'cso.threat_model', 'cso.compliance_map']);
    expect(out.run_order).toEqual(['cso.case_classifier', 'cso.threat_model', 'cso.compliance_map']);
  });
});
