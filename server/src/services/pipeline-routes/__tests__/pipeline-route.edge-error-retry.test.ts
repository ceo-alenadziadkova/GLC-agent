import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  makeIntakeBrief,
  makePipelineNextAudit,
  makePipelineRetryAudit,
  makePipelineStartAudit,
  makePipelineStatusAudit,
  makePipelineStopAudit,
  makeQualityGateData,
  makeReviewPoint,
} from '../../../tests/helpers/pipeline-route-fixtures.js';

const mocks = vi.hoisted(() => ({
  fetchAuditForStart: vi.fn(),
  claimPipelineStart: vi.fn(),
  fetchIntakeBriefForAudit: vi.fn(),
  fetchAuditForNext: vi.fn(),
  fetchPendingReviewAfterPhase: vi.fn(),
  fetchAnyPendingReviewForAudit: vi.fn(),
  claimPipelineNext: vi.fn(),
  claimPipelineFinalizeAfterLastGate: vi.fn(),
  fetchAuditForRetryById: vi.fn(),
  claimPipelineRetry: vi.fn(),
  claimPipelineResumeFromCancelled: vi.fn(),
  canManagePlatformSettings: vi.fn(),
  fetchAuditForStop: vi.fn(),
  claimPipelineStop: vi.fn(),
  insertPipelineCancelledEvent: vi.fn(),
  insertPipelineResumedFromCancelledEvent: vi.fn(),
  fetchConsultantOwnedAudit: vi.fn(),
  fetchLatestQualityGateEventReport: vi.fn(),
  approvePendingReviewEmitApprovedEventAtomic: vi.fn(),
  sendReviewApprovedNotification: vi.fn(),
  fetchAuditForStatus: vi.fn(),
  fetchPipelineEventsForAudit: vi.fn(),
  fetchReviewPointsForAudit: vi.fn(),
  fetchAuditForAnyAccess: vi.fn(),
  fetchLatestQualityGateEventData: vi.fn(),
  schedulePipelineExecution: vi.fn(),
}));

vi.mock('../repository/pipeline-audit.repository.js', () => ({
  fetchAuditForStart: mocks.fetchAuditForStart,
  claimPipelineStart: mocks.claimPipelineStart,
  fetchAuditForNext: mocks.fetchAuditForNext,
  claimPipelineNext: mocks.claimPipelineNext,
  claimPipelineFinalizeAfterLastGate: mocks.claimPipelineFinalizeAfterLastGate,
  fetchAuditForRetryById: mocks.fetchAuditForRetryById,
  claimPipelineRetry: mocks.claimPipelineRetry,
  claimPipelineResumeFromCancelled: mocks.claimPipelineResumeFromCancelled,
  fetchAuditForStop: mocks.fetchAuditForStop,
  claimPipelineStop: mocks.claimPipelineStop,
  fetchConsultantOwnedAudit: mocks.fetchConsultantOwnedAudit,
  fetchAuditForStatus: mocks.fetchAuditForStatus,
  fetchAuditForAnyAccess: mocks.fetchAuditForAnyAccess,
}));

vi.mock('../repository/pipeline-brief.repository.js', () => ({
  fetchIntakeBriefForAudit: mocks.fetchIntakeBriefForAudit,
}));

vi.mock('../repository/pipeline-review.repository.js', () => ({
  fetchPendingReviewAfterPhase: mocks.fetchPendingReviewAfterPhase,
  fetchAnyPendingReviewForAudit: mocks.fetchAnyPendingReviewForAudit,
  approvePendingReviewEmitApprovedEventAtomic: mocks.approvePendingReviewEmitApprovedEventAtomic,
  fetchReviewPointsForAudit: mocks.fetchReviewPointsForAudit,
}));

vi.mock('../repository/pipeline-event.repository.js', () => ({
  insertPipelineCancelledEvent: mocks.insertPipelineCancelledEvent,
  insertPipelineResumedFromCancelledEvent: mocks.insertPipelineResumedFromCancelledEvent,
  fetchLatestQualityGateEventReport: mocks.fetchLatestQualityGateEventReport,
  fetchPipelineEventsForAudit: mocks.fetchPipelineEventsForAudit,
  fetchLatestQualityGateEventData: mocks.fetchLatestQualityGateEventData,
}));

vi.mock('../notifications/pipeline-route.notification.service.js', () => ({
  sendReviewApprovedNotification: mocks.sendReviewApprovedNotification,
}));

vi.mock('../../../lib/platform-admin.js', () => ({
  canManagePlatformSettings: mocks.canManagePlatformSettings,
}));

vi.mock('../../brief-validator.js', () => ({
  evaluateBriefGates: vi.fn(() => ({ intakeProgress: { progressPct: 42 } })),
  resolveIntakeSurfaceForPlan: vi.fn(() => 'consultant'),
  validationPerspectiveForBriefAccess: vi.fn(() => 'consultant'),
}));

vi.mock('../../pipeline/orchestrator/execution-plan-loader.js', () => ({
  normalizeExecutionPlanFromAuditFields: vi.fn(() => ({
    selected_domains: [
      'tech_infrastructure',
      'security_compliance',
      'seo_digital',
      'ux_conversion',
      'marketing_utp',
      'automation_processes',
    ],
    depth: 'standard',
    source: 'system_default',
    include_strategy: true,
    coverage_package: 'full',
  })),
}));

vi.mock('../../../lib/audit-coverage-bridge.js', () => ({
  intakeBriefGateModeFromExecutionPlan: vi.fn(() => 'full'),
}));

vi.mock('../orchestration/schedule-pipeline-execution.js', () => ({
  schedulePipelineExecution: mocks.schedulePipelineExecution,
}));

import * as intakeCore from '@glc/intake-core';
import * as featureFlags from '../../../config/feature-flags.js';
import { intakeBriefGateModeFromExecutionPlan } from '../../../lib/audit-coverage-bridge.js';
import * as briefValidator from '../../brief-validator.js';

import { PIPELINE_RETRY_CLAIM_OWNERSHIP } from '../../../config/pipeline-retry-claim.js';
import { runPipelineStart } from '../use-cases/start-pipeline.use-case.js';
import { runPipelineNext } from '../use-cases/next-pipeline.use-case.js';
import { runPipelineRetry } from '../use-cases/retry-pipeline.use-case.js';
import { runPipelineStop } from '../use-cases/stop-pipeline.use-case.js';
import { runPipelineResumeFromCancelled } from '../use-cases/resume-pipeline-from-cancelled.use-case.js';
import { runReviewApprove } from '../use-cases/approve-review.use-case.js';
import { loadPipelineStatus } from '../use-cases/load-pipeline-status.use-case.js';
import { loadQualityGateData } from '../use-cases/load-quality-gate.use-case.js';

describe('pipeline route use-cases with mocked repositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(featureFlags, 'isDiagnosticIntakePilotEnabled').mockReturnValue(true);
    vi.spyOn(intakeCore, 'evaluateIntakeReadinessEnvelope').mockReturnValue({
      flowReadinessStatus: 'flow_ready',
      auditReadinessStatus: 'audit_ready',
      trace: [],
    });
    mocks.fetchAuditForStart.mockResolvedValue(makePipelineStartAudit());
    mocks.claimPipelineStart.mockResolvedValue(true);
    mocks.fetchIntakeBriefForAudit.mockResolvedValue(makeIntakeBrief());

    mocks.fetchAuditForNext.mockResolvedValue(makePipelineNextAudit());
    mocks.fetchPendingReviewAfterPhase.mockResolvedValue(null);
    mocks.fetchAnyPendingReviewForAudit.mockResolvedValue(null);
    mocks.claimPipelineNext.mockResolvedValue(true);
    mocks.claimPipelineFinalizeAfterLastGate.mockResolvedValue(true);

    mocks.fetchAuditForRetryById.mockResolvedValue(makePipelineRetryAudit());
    mocks.claimPipelineRetry.mockResolvedValue(true);
    mocks.claimPipelineResumeFromCancelled.mockResolvedValue(true);
    mocks.insertPipelineResumedFromCancelledEvent.mockResolvedValue(undefined);
    mocks.canManagePlatformSettings.mockResolvedValue(false);

    mocks.fetchAuditForStop.mockResolvedValue(makePipelineStopAudit());
    mocks.claimPipelineStop.mockResolvedValue(true);
    mocks.insertPipelineCancelledEvent.mockResolvedValue(undefined);
    mocks.fetchConsultantOwnedAudit.mockResolvedValue({ id: 'a1' });
    mocks.fetchLatestQualityGateEventReport.mockResolvedValue(null);
    mocks.approvePendingReviewEmitApprovedEventAtomic.mockResolvedValue({ data: { status: 'approved' }, error: null });
    mocks.sendReviewApprovedNotification.mockResolvedValue(undefined);
    mocks.fetchAuditForStatus.mockResolvedValue(makePipelineStatusAudit());
    mocks.fetchPipelineEventsForAudit.mockResolvedValue([{ event_type: 'started' }]);
    mocks.fetchReviewPointsForAudit.mockResolvedValue([makeReviewPoint()]);
    mocks.fetchAuditForAnyAccess.mockResolvedValue({ id: 'a1' });
    mocks.fetchLatestQualityGateEventData.mockResolvedValue(makeQualityGateData());
  });


  it('runPipelineStart returns intake readiness blocked when envelope blocks audit', async () => {
    vi.mocked(intakeCore.evaluateIntakeReadinessEnvelope).mockReturnValueOnce({
      flowReadinessStatus: 'blocked',
      auditReadinessStatus: 'blocked',
      trace: [{ code: 'test_block', semanticCause: 'Test semantic readiness block' }],
    });
    const result = await runPipelineStart({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(400);
      expect(result.error.body.code).toBe('PIPELINE_INTAKE_READINESS_BLOCKED');
      const rawBody = result.error.body as { details?: { readiness?: Record<string, unknown>; triage_blocking_trace_codes?: string[] } };
      expect(rawBody.details?.readiness).toBeDefined();
      const readiness = rawBody.details?.readiness;
      expect(['flow_ready', 'blocked']).toContain(readiness?.flowReadinessStatus);
      expect(['audit_ready', 'blocked', 'ready_with_caveats']).toContain(readiness?.auditReadinessStatus);
      expect(Array.isArray(readiness?.trace)).toBe(true);
      expect(rawBody.details?.triage_blocking_trace_codes).toContain('test_block');
      expect(typeof (result.error.body as { error?: string }).error).toBe('string');
    }
  });
  it('runPipelineStart returns claim conflict when optimistic lock fails', async () => {
    mocks.claimPipelineStart.mockResolvedValue(false);
    const result = await runPipelineStart({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(409);
      expect(result.error.body.code).toBe('PIPELINE_START_CLAIM_CONFLICT');
    }
  });
  it('runPipelineStart returns token budget exceeded when limit reached', async () => {
    mocks.fetchAuditForStart.mockResolvedValue({
      id: 'a1',
      status: 'created',
      current_phase: 0,
      tokens_used: 100,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      user_id: 'u1',
      client_id: null,
      product_mode: 'full',
      execution_plan: null,
    });
    const result = await runPipelineStart({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_TOKEN_BUDGET_EXCEEDED');
    }
  });
  it('runPipelineNext returns intake readiness blocked when envelope blocks audit', async () => {
    vi.mocked(intakeCore.evaluateIntakeReadinessEnvelope).mockReturnValueOnce({
      flowReadinessStatus: 'blocked',
      auditReadinessStatus: 'blocked',
      trace: [{ code: 'next_block', semanticCause: 'Next semantic readiness block' }],
    });
    const result = await runPipelineNext({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(400);
      expect(result.error.body.code).toBe('PIPELINE_INTAKE_READINESS_BLOCKED');
      const rawBody = result.error.body as { details?: { readiness?: Record<string, unknown>; triage_blocking_trace_codes?: string[] } };
      expect(rawBody.details?.readiness).toBeDefined();
      const readiness = rawBody.details?.readiness;
      expect(['flow_ready', 'blocked']).toContain(readiness?.flowReadinessStatus);
      expect(['audit_ready', 'blocked', 'ready_with_caveats']).toContain(readiness?.auditReadinessStatus);
      expect(Array.isArray(readiness?.trace)).toBe(true);
      expect(rawBody.details?.triage_blocking_trace_codes).toContain('next_block');
      expect(((result.error.body as { error?: string }).error ?? '').length).toBeGreaterThan(10);
    }
  });
  it('runPipelineNext returns already cancelled when audit is cancelled', async () => {
    mocks.fetchAuditForNext.mockResolvedValue({
      id: 'a1',
      status: 'cancelled',
      current_phase: 2,
      tokens_used: 10,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      user_id: 'u1',
      client_id: null,
      product_mode: 'full',
      execution_plan: null,
    });
    const result = await runPipelineNext({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_ALREADY_CANCELLED');
    }
  });
  it('runPipelineNext blocks when review point is pending', async () => {
    mocks.fetchPendingReviewAfterPhase.mockResolvedValue({ audit_id: 'a1', after_phase: 0, status: 'pending' });
    const result = await runPipelineNext({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_REVIEW_PENDING');
    }
  });
  it('runPipelineNext returns in-progress when status is active phase', async () => {
    mocks.fetchAuditForNext.mockResolvedValue({
      id: 'a1',
      status: 'recon',
      current_phase: 0,
      tokens_used: 10,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      user_id: 'u1',
      client_id: null,
      product_mode: 'full',
      execution_plan: null,
    });
    const result = await runPipelineNext({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_PHASE_IN_PROGRESS');
    }
  });
  it('runPipelineNext returns phase in progress when refetch shows another request won the claim', async () => {
    const row = {
      id: 'a1',
      status: 'review',
      current_phase: 0,
      tokens_used: 10,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      user_id: 'u1',
      client_id: null,
      product_mode: 'full',
      execution_plan: null,
    };
    mocks.fetchAuditForNext
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce({
        ...row,
        status: 'recon',
        updated_at: '2026-01-01T00:00:01.000Z',
      });
    mocks.claimPipelineNext.mockResolvedValue(false);

    const result = await runPipelineNext({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_PHASE_IN_PROGRESS');
    }
    expect(mocks.claimPipelineNext).toHaveBeenCalledTimes(1);
  });
  it('runPipelineRetry returns already cancelled when audit is cancelled', async () => {
    mocks.fetchAuditForRetryById.mockResolvedValue({
      id: 'a1',
      user_id: 'u1',
      status: 'cancelled',
      current_phase: 2,
      tokens_used: 10,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      product_mode: 'full',
      execution_plan: null,
    });
    const result = await runPipelineRetry({
      auditId: 'a1',
      userId: 'u1',
      phase: 2,
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_ALREADY_CANCELLED');
    }
  });
  it('runPipelineRetry returns claim conflict on retry lock failure', async () => {
    mocks.claimPipelineRetry.mockResolvedValue(false);
    const result = await runPipelineRetry({
      auditId: 'a1',
      userId: 'u1',
      phase: 2,
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_RETRY_CLAIM_CONFLICT');
    }
  });
  it('runPipelineRetry returns token budget exceeded when limit reached', async () => {
    mocks.fetchAuditForRetryById.mockResolvedValue({
      id: 'a1',
      user_id: 'u1',
      status: 'failed',
      current_phase: 2,
      tokens_used: 100,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      product_mode: 'full',
      execution_plan: null,
    });
    const result = await runPipelineRetry({
      auditId: 'a1',
      userId: 'u1',
      phase: 2,
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_TOKEN_BUDGET_EXCEEDED');
    }
  });
  it('runPipelineStop returns already cancelled when audit is cancelled', async () => {
    mocks.fetchAuditForStop.mockResolvedValue({
      id: 'a1',
      status: 'cancelled',
      current_phase: 2,
      updated_at: '2026-01-01T00:00:00.000Z',
      user_id: 'u1',
      client_id: null,
    });
    const result = await runPipelineStop({ auditId: 'a1', userId: 'u1', role: 'consultant' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_ALREADY_CANCELLED');
    }
  });
  it('runPipelineStop returns conflict if stop claim fails', async () => {
    mocks.claimPipelineStop.mockResolvedValue(false);
    const result = await runPipelineStop({ auditId: 'a1', userId: 'u1', role: 'consultant' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_STOP_CLAIM_CONFLICT');
    }
  });
  it('runPipelineResumeFromCancelled does not schedule when owner pipeline/next is intake-readiness blocked', async () => {
    mocks.canManagePlatformSettings.mockResolvedValue(true);
    mocks.fetchAuditForRetryById.mockResolvedValue({
      id: 'a1',
      user_id: 'owner-1',
      status: 'cancelled',
      current_phase: 0,
      tokens_used: 10,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      product_mode: 'full',
      execution_plan: null,
    });
    mocks.fetchAuditForNext.mockResolvedValue({
      id: 'a1',
      status: 'review',
      current_phase: 0,
      tokens_used: 10,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      user_id: 'owner-1',
      client_id: null,
      product_mode: 'full',
      execution_plan: null,
    });
    vi.mocked(intakeCore.evaluateIntakeReadinessEnvelope).mockReturnValueOnce({
      flowReadinessStatus: 'blocked',
      auditReadinessStatus: 'blocked',
      trace: [{ code: 'resume_next_block', semanticCause: 'Resume-to-next readiness block' }],
    });

    const result = await runPipelineResumeFromCancelled({ auditId: 'a1', actorUserId: 'admin-1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.status).toBe('review');
      expect(result.response.execution_scheduled).toBe(false);
      expect(result.response.current_phase).toBe(0);
      expect(result.response.auto_next_blocked).toBe(true);
      expect(result.response.auto_next_error_code).toBe('PIPELINE_INTAKE_READINESS_BLOCKED');
      const det = result.response.auto_next_error_details as {
        readiness?: Record<string, unknown>;
        triage_blocking_trace_codes?: string[];
      } | undefined;
      expect(det?.triage_blocking_trace_codes).toContain('resume_next_block');
    }
    expect(mocks.schedulePipelineExecution).not.toHaveBeenCalled();
  });
  it('runPipelineResumeFromCancelled returns resumeNotCancelled when audit is not cancelled', async () => {
    mocks.canManagePlatformSettings.mockResolvedValue(true);
    mocks.fetchAuditForRetryById.mockResolvedValue({
      id: 'a1',
      user_id: 'u1',
      status: 'review',
      current_phase: 0,
      tokens_used: 10,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      product_mode: 'full',
      execution_plan: null,
    });
    const result = await runPipelineResumeFromCancelled({ auditId: 'a1', actorUserId: 'admin-1' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_RESUME_NOT_CANCELLED');
    }
  });
  it('runReviewApprove returns requires-notes when quality gate demands it', async () => {
    mocks.fetchLatestQualityGateEventReport.mockResolvedValue({
      passed: false,
      flags: [{ severity: 'warning' }],
    });
    const result = await runReviewApprove({
      auditId: 'a1',
      userId: 'u1',
      afterPhase: 4,
      consultantNotes: null,
      interviewNotes: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_QUALITY_GATE_REQUIRES_NOTES');
    }
  });
  it('loadPipelineStatus returns not found when audit missing', async () => {
    mocks.fetchAuditForStatus.mockResolvedValue(null);
    const result = await loadPipelineStatus({ auditId: 'a1', userId: 'u1', viewerRole: 'consultant' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_AUDIT_NOT_FOUND');
    }
  });
  it('loadQualityGateData returns not found when audit is inaccessible', async () => {
    mocks.fetchAuditForAnyAccess.mockResolvedValue(null);
    const result = await loadQualityGateData({ auditId: 'a1', userId: 'u1', phase: 4 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_AUDIT_NOT_FOUND');
    }
  });
});
