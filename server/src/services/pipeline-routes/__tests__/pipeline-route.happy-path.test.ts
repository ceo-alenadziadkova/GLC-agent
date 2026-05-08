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


  it('runPipelineStart does not apply intake readiness block when diagnostic pilot flag is disabled', async () => {
    vi.spyOn(featureFlags, 'isDiagnosticIntakePilotEnabled').mockReturnValueOnce(false);
    const result = await runPipelineStart({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(true);
  });
  it('runPipelineStart passes slaProductMode from intakeBriefGateModeFromExecutionPlan into readiness envelope', async () => {
    vi.mocked(intakeBriefGateModeFromExecutionPlan).mockReturnValueOnce('express');
    const envSpy = vi.spyOn(intakeCore, 'evaluateIntakeReadinessEnvelope').mockImplementation(input => {
      expect(input.slaProductMode).toBe('express');
      expect(input.enforcementPoint).toBe('pipeline_start');
      return {
        flowReadinessStatus: 'flow_ready',
        auditReadinessStatus: 'audit_ready',
        trace: [],
      };
    });
    const result = await runPipelineStart({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(true);
    expect(envSpy).toHaveBeenCalled();
  });
  it('runPipelineStart passes admin_presale executionContext for consultant role', async () => {
    const envSpy = vi.spyOn(intakeCore, 'evaluateIntakeReadinessEnvelope').mockImplementation(input => {
      expect(input.executionContext).toBe('admin_presale');
      return {
        flowReadinessStatus: 'flow_ready',
        auditReadinessStatus: 'audit_ready',
        trace: [],
      };
    });
    const result = await runPipelineStart({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(true);
    expect(envSpy).toHaveBeenCalled();
  });
  it('runPipelineStart keeps default executionContext for client role', async () => {
    mocks.fetchAuditForStart.mockResolvedValueOnce({
      id: 'a1',
      status: 'created',
      current_phase: 0,
      tokens_used: 10,
      token_budget: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
      user_id: 'owner-1',
      client_id: 'client-1',
      product_mode: 'full',
      execution_plan: null,
    });
    const envSpy = vi.spyOn(intakeCore, 'evaluateIntakeReadinessEnvelope').mockImplementation(input => {
      expect(input.executionContext).toBe('default');
      return {
        flowReadinessStatus: 'flow_ready',
        auditReadinessStatus: 'audit_ready',
        trace: [],
      };
    });
    const result = await runPipelineStart({
      auditId: 'a1',
      userId: 'client-1',
      role: 'client',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(true);
    expect(envSpy).toHaveBeenCalled();
  });
  it('runPipelineStart sets applyExecutionPlanCoverageScope when pilot and execution-plan coverage flag are both enabled', async () => {
    vi.spyOn(featureFlags, 'isExecutionPlanCoverageScopeEnabled').mockReturnValue(true);
    const envSpy = vi.spyOn(intakeCore, 'evaluateIntakeReadinessEnvelope').mockImplementation(input => {
      expect(input.applyExecutionPlanCoverageScope).toBe(true);
      expect(input.executionIncludeStrategy).toBe(true);
      expect(input.executionSelectedDomains).toEqual([
        'tech_infrastructure',
        'security_compliance',
        'seo_digital',
        'ux_conversion',
        'marketing_utp',
        'automation_processes',
      ]);
      return {
        flowReadinessStatus: 'flow_ready',
        auditReadinessStatus: 'audit_ready',
        trace: [],
      };
    });
    const result = await runPipelineStart({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(true);
    expect(envSpy).toHaveBeenCalled();
  });
  it('runPipelineStart keeps applyExecutionPlanCoverageScope false when execution-plan coverage flag is disabled', async () => {
    vi.spyOn(featureFlags, 'isExecutionPlanCoverageScopeEnabled').mockReturnValue(false);
    const envSpy = vi.spyOn(intakeCore, 'evaluateIntakeReadinessEnvelope').mockImplementation(input => {
      expect(input.applyExecutionPlanCoverageScope).toBe(false);
      return {
        flowReadinessStatus: 'flow_ready',
        auditReadinessStatus: 'audit_ready',
        trace: [],
      };
    });
    const result = await runPipelineStart({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(true);
    expect(envSpy).toHaveBeenCalled();
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
  it('runPipelineStart keeps discovery collection mode for idea-only audits', async () => {
    mocks.fetchIntakeBriefForAudit.mockResolvedValueOnce({
      responses: { a5: { value: 'No website yet', source: 'client' } },
      collection_mode: 'discovery',
      intake_versions: null,
    });
    const surfaceSpy = vi.spyOn(briefValidator, 'resolveIntakeSurfaceForPlan');
    const result = await runPipelineStart({
      auditId: 'a1',
      userId: 'u1',
      role: 'consultant',
      disableAutoRemediate: false,
    });
    expect(result.ok).toBe(true);
    expect(surfaceSpy).toHaveBeenCalledWith('discovery', 'consultant');
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
  it('runPipelineStop returns cancelled and writes event', async () => {
    const result = await runPipelineStop({ auditId: 'a1', userId: 'u1', role: 'consultant' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.status).toBe('cancelled');
      expect(result.response.stopped).toBe(true);
    }
    expect(mocks.insertPipelineCancelledEvent).toHaveBeenCalledOnce();
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
      expect(result.response.auto_next_blocked).toBe(true);
      expect(result.response.auto_next_error_code).toBe('PIPELINE_REVIEW_PENDING');
    }
    expect(mocks.schedulePipelineExecution).not.toHaveBeenCalled();
  });
  it('runReviewApprove returns already_approved when no pending row updated', async () => {
    mocks.approvePendingReviewEmitApprovedEventAtomic.mockResolvedValue({ data: null, error: null });
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
    expect(mocks.approvePendingReviewEmitApprovedEventAtomic).toHaveBeenCalledOnce();
    expect(mocks.sendReviewApprovedNotification).toHaveBeenCalledOnce();
  });
  it('loadPipelineStatus returns payload with events and reviews', async () => {
    const result = await loadPipelineStatus({ auditId: 'a1', userId: 'u1', viewerRole: 'consultant' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.payload.events)).toBe(true);
      expect(Array.isArray(result.payload.reviews)).toBe(true);
      expect(result.payload.status).toBe('review');
    }
  });
  it('loadPipelineStatus redacts review notes for client viewers', async () => {
    mocks.fetchPipelineEventsForAudit.mockResolvedValue([
      {
        event_type: 'review_approved',
        phase: 0,
        message: 'ok',
        data: { consultant_notes: 'secret', interview_notes: 'also secret' },
      },
    ]);
    mocks.fetchReviewPointsForAudit.mockResolvedValue([
      { after_phase: 0, status: 'approved', consultant_notes: 'c', interview_notes: 'i' },
    ]);
    const result = await loadPipelineStatus({ auditId: 'a1', userId: 'u1', viewerRole: 'client' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const rev = result.payload.reviews as Array<{ consultant_notes: string | null; interview_notes: string | null }>;
      expect(rev[0].consultant_notes).toBeNull();
      expect(rev[0].interview_notes).toBeNull();
      const ev = result.payload.events as Array<{ data: Record<string, unknown> }>;
      expect(ev[0].data.consultant_notes).toBeNull();
      expect(ev[0].data.interview_notes).toBeNull();
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
    mocks.fetchLatestQualityGateEventData.mockResolvedValue(makeQualityGateData());
    const result = await loadQualityGateData({ auditId: 'a1', userId: 'u1', phase: 4 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ passed: true, flags: [] });
    }
  });
});
