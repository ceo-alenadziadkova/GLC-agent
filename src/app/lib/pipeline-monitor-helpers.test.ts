import { describe, expect, it } from 'vitest';
import {
  deriveAutoWingReviewAfterPhase,
  getAuditListPillPresentation,
  getPhaseStatus,
  getPipelineMonitorHeaderPresentation,
  hasVisiblyRunningUpstreamPhase,
  isPipelineAuditActiveStatus,
} from './pipeline-monitor-helpers';

describe('getPhaseStatus', () => {
  it('treats the current phase as failed when the audit status is failed', () => {
    expect(
      getPhaseStatus(3, 3, 'failed', [], false, null),
    ).toBe('failed');
  });

  it('marks earlier phases completed when the audit failed on a later current phase', () => {
    expect(
      getPhaseStatus(2, 3, 'failed', [], false, null),
    ).toBe('completed');
  });

  it('after review approve at current phase, shows completed (not fake running) while waiting for pipeline/next', () => {
    expect(
      getPhaseStatus(0, 0, 'review', [{ after_phase: 0, status: 'approved' }], false, null),
    ).toBe('completed');
  });

  it('same for strategy phase when audit is paused at review after that phase', () => {
    expect(
      getPhaseStatus(7, 7, 'review', [{ after_phase: 7, status: 'approved' }], false, null),
    ).toBe('completed');
  });

  it('still shows running for active phase work (audit in recon, no approved gate yet)', () => {
    expect(
      getPhaseStatus(0, 0, 'recon', [{ after_phase: 0, status: 'pending' }], false, null),
    ).toBe('review');
    expect(getPhaseStatus(0, 0, 'recon', [], false, null)).toBe('running');
  });

  it('cancelled audit does not show fake running on the current phase card', () => {
    expect(
      getPhaseStatus(0, 0, 'cancelled', [{ after_phase: 0, status: 'approved' }], false, null),
    ).toBe('pending');
  });

  it('marks phases outside partial execution_plan as skipped', () => {
    const planIds = new Set([0, 1, 6]);
    expect(getPhaseStatus(5, 1, 'auto', [], false, null, planIds)).toBe('skipped');
    expect(getPhaseStatus(1, 1, 'auto', [], false, null, planIds)).toBe('running');
  });

  it('after resume from cancelled to review (mid-phase, no gate row), current phase is review so Continue is available', () => {
    expect(getPhaseStatus(3, 3, 'review', [], false, null)).toBe('review');
    expect(getPhaseStatus(1, 1, 'review', [], false, null)).toBe('review');
  });
});

describe('isPipelineAuditActiveStatus', () => {
  it('is true only for orchestrator running statuses', () => {
    expect(isPipelineAuditActiveStatus('recon')).toBe(true);
    expect(isPipelineAuditActiveStatus('strategy')).toBe(true);
    expect(isPipelineAuditActiveStatus('review')).toBe(false);
    expect(isPipelineAuditActiveStatus('failed')).toBe(false);
  });
});

describe('getPipelineMonitorHeaderPresentation', () => {
  it('uses review badge without pulse when audit is paused at a review gate', () => {
    expect(getPipelineMonitorHeaderPresentation('review')).toEqual({ status: 'review', pulse: false });
  });

  it('pulses only for active orchestrator phase statuses', () => {
    expect(getPipelineMonitorHeaderPresentation('auto')).toEqual({ status: 'running', pulse: true });
    expect(getPipelineMonitorHeaderPresentation('recon')).toEqual({ status: 'running', pulse: true });
  });

  it('maps failed audits to failed pill', () => {
    expect(getPipelineMonitorHeaderPresentation('failed')).toEqual({ status: 'failed', pulse: false });
  });
});

describe('hasVisiblyRunningUpstreamPhase', () => {
  const row = (id: number, status: 'running' | 'pending' | 'skipped' | 'completed', skipped = false) => ({
    id,
    skipped,
    status,
  });

  it('is true when a non-skipped upstream phase is running', () => {
    const phases = [row(0, 'completed'), row(1, 'running'), row(6, 'pending')];
    expect(hasVisiblyRunningUpstreamPhase(phases, 6)).toBe(true);
  });

  it('is false when upstream running phase is skipped (partial plan)', () => {
    const phases = [row(0, 'completed'), row(5, 'skipped', true), row(6, 'pending')];
    expect(hasVisiblyRunningUpstreamPhase(phases, 6)).toBe(false);
  });

  it('is false when no upstream phase is running', () => {
    const phases = [row(0, 'completed'), row(1, 'completed'), row(6, 'pending')];
    expect(hasVisiblyRunningUpstreamPhase(phases, 6)).toBe(false);
  });
});

describe('deriveAutoWingReviewAfterPhase', () => {
  it('uses the highest auto-wing review row (1–4) from the server snapshot', () => {
    expect(
      deriveAutoWingReviewAfterPhase([
        { after_phase: 0 },
        { after_phase: 1 },
        { after_phase: 7 },
      ]),
    ).toBe(1);
    expect(
      deriveAutoWingReviewAfterPhase([
        { after_phase: 0 },
        { after_phase: 4 },
      ]),
    ).toBe(4);
  });

  it('defaults to 4 when no auto-wing gate is present in the array', () => {
    expect(deriveAutoWingReviewAfterPhase([{ after_phase: 0 }, { after_phase: 7 }])).toBe(4);
  });
});

describe('getAuditListPillPresentation', () => {
  it('maps review and failed to distinct badges without running pulse', () => {
    expect(getAuditListPillPresentation('review')).toEqual({ status: 'review', pulse: false });
    expect(getAuditListPillPresentation('failed')).toEqual({ status: 'failed', pulse: false });
  });

  it('maps active orchestrator statuses to running pulse', () => {
    expect(getAuditListPillPresentation('auto')).toEqual({ status: 'running', pulse: true });
  });
});
