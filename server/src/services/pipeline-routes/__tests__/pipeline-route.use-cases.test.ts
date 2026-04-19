import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  insertReviewApprovedEvent: vi.fn(),
  approvePendingReview: vi.fn(),
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
  approvePendingReview: mocks.approvePendingReview,
  fetchReviewPointsForAudit: mocks.fetchReviewPointsForAudit,
}));

vi.mock('../repository/pipeline-event.repository.js', () => ({
  insertPipelineCancelledEvent: mocks.insertPipelineCancelledEvent,
  insertPipelineResumedFromCancelledEvent: mocks.insertPipelineResumedFromCancelledEvent,
  fetchLatestQualityGateEventReport: mocks.fetchLatestQualityGateEventReport,
  insertReviewApprovedEvent: mocks.insertReviewApprovedEvent,
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
    mocks.fetchAuditForStart.mockResolvedValue({
      id: 'a1',
      status: 'created',
      current_phase: 0,
      tokens_used: 10,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      user_id: 'u1',
      client_id: null,
      product_mode: 'full',
      execution_plan: null,
    });
    mocks.claimPipelineStart.mockResolvedValue(true);
    mocks.fetchIntakeBriefForAudit.mockResolvedValue({
      responses: {},
      collection_mode: null,
      intake_versions: null,
    });

    mocks.fetchAuditForNext.mockResolvedValue({
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
    });
    mocks.fetchPendingReviewAfterPhase.mockResolvedValue(null);
    mocks.fetchAnyPendingReviewForAudit.mockResolvedValue(null);
    mocks.claimPipelineNext.mockResolvedValue(true);
    mocks.claimPipelineFinalizeAfterLastGate.mockResolvedValue(true);

    mocks.fetchAuditForRetryById.mockResolvedValue({
      id: 'a1',
      user_id: 'u1',
      status: 'failed',
      current_phase: 2,
      tokens_used: 10,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      product_mode: 'full',
      execution_plan: null,
    });
    mocks.claimPipelineRetry.mockResolvedValue(true);
    mocks.claimPipelineResumeFromCancelled.mockResolvedValue(true);
    mocks.insertPipelineResumedFromCancelledEvent.mockResolvedValue(undefined);
    mocks.canManagePlatformSettings.mockResolvedValue(false);

    mocks.fetchAuditForStop.mockResolvedValue({
      id: 'a1',
      status: 'auto',
      current_phase: 2,
      updated_at: '2026-01-01T00:00:00.000Z',
      user_id: 'u1',
      client_id: null,
    });
    mocks.claimPipelineStop.mockResolvedValue(true);
    mocks.insertPipelineCancelledEvent.mockResolvedValue(undefined);
    mocks.fetchConsultantOwnedAudit.mockResolvedValue({ id: 'a1' });
    mocks.fetchLatestQualityGateEventReport.mockResolvedValue(null);
    mocks.approvePendingReview.mockResolvedValue({ data: { status: 'approved' }, error: null });
    mocks.insertReviewApprovedEvent.mockResolvedValue(undefined);
    mocks.sendReviewApprovedNotification.mockResolvedValue(undefined);
    mocks.fetchAuditForStatus.mockResolvedValue({
      status: 'review',
      current_phase: 2,
      tokens_used: 10,
      token_budget: 100,
      execution_plan: { coverage_package: 'full' },
    });
    mocks.fetchPipelineEventsForAudit.mockResolvedValue([{ event_type: 'started' }]);
    mocks.fetchReviewPointsForAudit.mockResolvedValue([{ after_phase: 0, status: 'approved' }]);
    mocks.fetchAuditForAnyAccess.mockResolvedValue({ id: 'a1' });
    mocks.fetchLatestQualityGateEventData.mockResolvedValue({ passed: true, flags: [] });
  });

  it('runPipelineStart returns started payload on success', async () => {
    const result = await runPipelineStart({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.status).toBe('started');
      expect(result.response.phase).toBe(0);
    }
    expect(mocks.claimPipelineStart).toHaveBeenCalledOnce();
  });

  it('runPipelineStart returns forbidden for unsupported role', async () => {
    const result = await runPipelineStart({
      auditId: 'a1',
      userId: 'u1',
      role: 'guest',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
      expect(result.error.body.code).toBe('PIPELINE_FORBIDDEN');
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

  it('runPipelineStart returns access denied for mismatched client', async () => {
    mocks.fetchAuditForStart.mockResolvedValue({
      id: 'a1',
      status: 'created',
      current_phase: 0,
      tokens_used: 10,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      user_id: 'u1',
      client_id: 'client-allowed',
      product_mode: 'full',
      execution_plan: null,
    });
    const result = await runPipelineStart({
      auditId: 'a1',
      userId: 'client-other',
      role: 'client',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
      expect(result.error.body.code).toBe('PIPELINE_ACCESS_DENIED');
    }
  });

  it('runPipelineNext returns running phase on success', async () => {
    const result = await runPipelineNext({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.outcome === 'running') {
      expect(result.response.status).toBe('running');
      expect(typeof result.nextPhase).toBe('number');
    }
  });

  it('runPipelineNext finalizes audit when plan has no further phases and no pending reviews', async () => {
    mocks.fetchAuditForNext.mockResolvedValue({
      id: 'a1',
      status: 'review',
      current_phase: 7,
      tokens_used: 10,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      user_id: 'u1',
      client_id: null,
      product_mode: 'full',
      execution_plan: null,
    });
    mocks.fetchAnyPendingReviewForAudit.mockResolvedValue(null);
    mocks.claimPipelineFinalizeAfterLastGate.mockResolvedValue(true);

    const result = await runPipelineNext({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('completed');
      expect(result.response.status).toBe('completed');
    }
    expect(mocks.claimPipelineFinalizeAfterLastGate).toHaveBeenCalledOnce();
    expect(mocks.claimPipelineNext).not.toHaveBeenCalled();
  });

  it('runPipelineNext returns forbidden for unsupported role', async () => {
    const result = await runPipelineNext({
      auditId: 'a1',
      userId: 'u1',
      role: 'guest',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_FORBIDDEN');
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

  it('runPipelineNext retries claim once after refetch when first optimistic lock fails', async () => {
    mocks.fetchAnyPendingReviewForAudit.mockResolvedValue(null);
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
      .mockResolvedValueOnce({ ...row, updated_at: '2026-01-01T00:00:01.000Z' });
    mocks.claimPipelineNext.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const result = await runPipelineNext({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });

    expect(result.ok).toBe(true);
    expect(mocks.fetchAuditForNext).toHaveBeenCalledTimes(2);
    expect(mocks.claimPipelineNext).toHaveBeenCalledTimes(2);
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

  it('runPipelineRetry returns retrying status for allowed phase', async () => {
    const result = await runPipelineRetry({
      auditId: 'a1',
      userId: 'u1',
      phase: 2,
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.status).toBe('retrying');
      expect(result.response.phase).toBe(2);
    }
    expect(mocks.claimPipelineRetry).toHaveBeenCalledWith(
      'a1',
      '2026-01-01T00:00:00.000Z',
      'auto',
      { kind: PIPELINE_RETRY_CLAIM_OWNERSHIP.owner, actorUserId: 'u1' },
    );
  });

  it('runPipelineRetry allows platform operator when not audit owner', async () => {
    mocks.fetchAuditForRetryById.mockResolvedValue({
      id: 'a1',
      user_id: 'owner-1',
      status: 'failed',
      current_phase: 2,
      tokens_used: 10,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      product_mode: 'full',
      execution_plan: null,
    });
    mocks.canManagePlatformSettings.mockResolvedValue(true);
    const result = await runPipelineRetry({
      auditId: 'a1',
      userId: 'admin-1',
      phase: 2,
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(true);
    expect(mocks.claimPipelineRetry).toHaveBeenCalledWith(
      'a1',
      '2026-01-01T00:00:00.000Z',
      'auto',
      { kind: PIPELINE_RETRY_CLAIM_OWNERSHIP.platformOperator },
    );
  });

  it('runPipelineRetry returns not found when actor is neither owner nor platform operator', async () => {
    mocks.fetchAuditForRetryById.mockResolvedValue({
      id: 'a1',
      user_id: 'owner-1',
      status: 'failed',
      current_phase: 2,
      tokens_used: 10,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      product_mode: 'full',
      execution_plan: null,
    });
    mocks.canManagePlatformSettings.mockResolvedValue(false);
    const result = await runPipelineRetry({
      auditId: 'a1',
      userId: 'other-1',
      phase: 2,
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_AUDIT_NOT_FOUND');
    }
    expect(mocks.claimPipelineRetry).not.toHaveBeenCalled();
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

  it('runPipelineStop returns cancelled and writes event', async () => {
    const result = await runPipelineStop({ auditId: 'a1', userId: 'u1', role: 'consultant' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.status).toBe('cancelled');
      expect(result.response.stopped).toBe(true);
    }
    expect(mocks.insertPipelineCancelledEvent).toHaveBeenCalledOnce();
  });

  it('runPipelineStop returns forbidden for unsupported role', async () => {
    const result = await runPipelineStop({ auditId: 'a1', userId: 'u1', role: 'guest' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
      expect(result.error.body.code).toBe('PIPELINE_FORBIDDEN');
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

  it('runPipelineResumeFromCancelled sets review and logs when platform admin', async () => {
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
    const result = await runPipelineResumeFromCancelled({ auditId: 'a1', actorUserId: 'admin-1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.status).toBe('running');
      expect(result.response.current_phase).toBe(1);
      expect(result.response.resumed).toBe(true);
      expect(result.response.execution_scheduled).toBe(true);
    }
    expect(mocks.claimPipelineResumeFromCancelled).toHaveBeenCalledWith('a1', '2026-01-01T00:00:00.000Z');
    expect(mocks.insertPipelineResumedFromCancelledEvent).toHaveBeenCalledOnce();
    expect(mocks.schedulePipelineExecution).toHaveBeenCalledWith({
      auditId: 'a1',
      action: 'next',
      phase: 1,
      disableAutoRemediate: false,
    });
  });

  it('runPipelineResumeFromCancelled does not schedule when owner pipeline/next would block (review pending)', async () => {
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
    mocks.fetchPendingReviewAfterPhase.mockResolvedValue({
      audit_id: 'a1',
      after_phase: 0,
      status: 'pending',
    });
    const result = await runPipelineResumeFromCancelled({ auditId: 'a1', actorUserId: 'admin-1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.status).toBe('review');
      expect(result.response.execution_scheduled).toBe(false);
      expect(result.response.current_phase).toBe(0);
    }
    expect(mocks.schedulePipelineExecution).not.toHaveBeenCalled();
  });

  it('runPipelineResumeFromCancelled returns forbidden when not platform admin', async () => {
    mocks.canManagePlatformSettings.mockResolvedValue(false);
    mocks.fetchAuditForRetryById.mockResolvedValue({
      id: 'a1',
      user_id: 'u1',
      status: 'cancelled',
      current_phase: 1,
      tokens_used: 10,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      product_mode: 'full',
      execution_plan: null,
    });
    const result = await runPipelineResumeFromCancelled({ auditId: 'a1', actorUserId: 'u1' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
    }
    expect(mocks.claimPipelineResumeFromCancelled).not.toHaveBeenCalled();
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

  it('runPipelineStop returns access denied for client outside audit', async () => {
    mocks.fetchAuditForStop.mockResolvedValue({
      id: 'a1',
      status: 'auto',
      current_phase: 2,
      updated_at: '2026-01-01T00:00:00.000Z',
      user_id: 'consultant-1',
      client_id: 'client-allowed',
    });
    const result = await runPipelineStop({ auditId: 'a1', userId: 'client-other', role: 'client' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
      expect(result.error.body.code).toBe('PIPELINE_ACCESS_DENIED');
    }
  });

  it('runReviewApprove returns not found when consultant has no access', async () => {
    mocks.fetchConsultantOwnedAudit.mockResolvedValue(null);
    const result = await runReviewApprove({
      auditId: 'a1',
      userId: 'u1',
      afterPhase: 4,
      consultantNotes: null,
      interviewNotes: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_AUDIT_NOT_FOUND');
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

  it('runReviewApprove returns already_approved when no pending row updated', async () => {
    mocks.approvePendingReview.mockResolvedValue({ data: null, error: null });
    const result = await runReviewApprove({
      auditId: 'a1',
      userId: 'u1',
      afterPhase: 4,
      consultantNotes: 'ok',
      interviewNotes: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.status).toBe('already_approved');
    }
  });

  it('runReviewApprove emits event and notification on success', async () => {
    const result = await runReviewApprove({
      auditId: 'a1',
      userId: 'u1',
      afterPhase: 4,
      consultantNotes: 'ok',
      interviewNotes: 'notes',
    });
    expect(result.ok).toBe(true);
    expect(mocks.insertReviewApprovedEvent).toHaveBeenCalledOnce();
    expect(mocks.sendReviewApprovedNotification).toHaveBeenCalledOnce();
  });

  it('loadPipelineStatus returns not found when audit missing', async () => {
    mocks.fetchAuditForStatus.mockResolvedValue(null);
    const result = await loadPipelineStatus({ auditId: 'a1', userId: 'u1' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.body.code).toBe('PIPELINE_AUDIT_NOT_FOUND');
    }
  });

  it('loadPipelineStatus returns payload with events and reviews', async () => {
    const result = await loadPipelineStatus({ auditId: 'a1', userId: 'u1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.payload.events)).toBe(true);
      expect(Array.isArray(result.payload.reviews)).toBe(true);
      expect(result.payload.status).toBe('review');
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

  it('loadQualityGateData returns null data when event does not exist', async () => {
    mocks.fetchLatestQualityGateEventData.mockResolvedValue(null);
    const result = await loadQualityGateData({ auditId: 'a1', userId: 'u1', phase: 4 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });

  it('loadQualityGateData returns event data when present', async () => {
    mocks.fetchLatestQualityGateEventData.mockResolvedValue({ passed: true, flags: [] });
    const result = await loadQualityGateData({ auditId: 'a1', userId: 'u1', phase: 4 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ passed: true, flags: [] });
    }
  });
});
