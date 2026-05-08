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
  it('runPipelineStop returns forbidden for unsupported role', async () => {
    const result = await runPipelineStop({ auditId: 'a1', userId: 'u1', role: 'guest' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
      expect(result.error.body.code).toBe('PIPELINE_FORBIDDEN');
    }
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
});
