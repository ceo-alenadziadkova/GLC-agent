import { describe, expect, it } from 'vitest';
import type { AuditState } from '../../../data/audit/contracts/state/audit-state.types';
import { NEW_AUDIT_ALL_COVERAGE_DOMAINS } from '../../../config/new-audit-coverage-policy';
import { BRIEF_LAYOUT_WIZARD } from '../wizard-config/wizard-constants';
import { bootstrapConsultantNewAuditWizardFromAuditState } from './consultant-resume-draft-audit.bootstrap';

function minimalCreatedAudit(patch: Partial<AuditState>): AuditState {
  return {
    meta: {
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      user_id: 'u',
      client_id: null,
      company_url: 'https://example.com',
      company_name: 'Example Co',
      industry: 'Technology',
      status: 'created',
      current_phase: 0,
      overall_score: null,
      product_mode: 'full',
      token_budget: 0,
      tokens_used: 0,
      snapshot_token: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      execution_plan: {
        selected_domains: [...NEW_AUDIT_ALL_COVERAGE_DOMAINS],
        depth: 'standard',
        source: 'user_selected',
        coverage_package: 'complete',
        include_strategy: true,
      },
      ...patch.meta,
    },
    recon: null,
    domains: {},
    strategy: null,
    reviews: [],
    brief: null,
    ...patch,
  };
}

describe('bootstrapConsultantNewAuditWizardFromAuditState', () => {
  it('maps meta and execution plan for a created audit', () => {
    const audit = minimalCreatedAudit({});
    const boot = bootstrapConsultantNewAuditWizardFromAuditState({
      audit,
      resolvedBriefLayout: BRIEF_LAYOUT_WIZARD,
    });
    expect(boot.draftAuditId).toBe(audit.meta.id);
    expect(boot.url).toBe('https://example.com');
    expect(boot.name).toBe('Example Co');
    expect(boot.industry).toBe('Technology');
    expect(boot.coveragePackage).toBe('complete');
    expect(boot.selectedDomains).toEqual([...NEW_AUDIT_ALL_COVERAGE_DOMAINS]);
  });

  it('sets interview mode when brief was collected by consultant', () => {
    const audit = minimalCreatedAudit({
      brief: {
        id: 'b1',
        audit_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        responses: {},
        status: 'draft',
        layer_completed: 0,
        collected_by: 'consultant',
        collection_mode: 'pre_brief',
        data_quality_score: 0,
        sla_met: false,
        answered_required: 0,
        answered_recommended: 0,
        answered_optional: 0,
        total_required: 1,
        total_recommended: 0,
        total_optional: 0,
        recon_prefills: {},
        recon_conflicts: [],
        post_audit_questions: [],
        progress_pct: 0,
        readiness_badge: 'low',
        next_best_action: 'complete_required',
        responses_format: 2,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });
    const boot = bootstrapConsultantNewAuditWizardFromAuditState({
      audit,
      resolvedBriefLayout: BRIEF_LAYOUT_WIZARD,
    });
    expect(boot.interviewMode).toBe(true);
  });
});
