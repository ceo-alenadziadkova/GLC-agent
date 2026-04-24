import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBriefDiagnosticIntakeAnalyticsEvents } from '../useBriefDiagnosticIntakeAnalyticsEvents';
import { createBriefIntakeAnalyticsSink } from '../../lib/brief-intake-analytics';
import { api } from '../../data/apiService';
import { briefProfilePlatformApi } from '../../data/api/brief-profile-platform';

describe('useBriefDiagnosticIntakeAnalyticsEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls readiness and sequencing analytics when brief payload includes diagnostic fields', async () => {
    const postSpy = vi.spyOn(briefProfilePlatformApi, 'postBriefAnalyticsEvents').mockResolvedValue(undefined);

    vi.spyOn(api, 'getBrief').mockResolvedValue({
      questions: [],
      readiness: {
        flowReadinessStatus: 'flow_ready',
        auditReadinessStatus: 'blocked',
        trace: [{ code: 'pilot_test', questionId: 'a1' }],
      },
      critical_signals: { by_key: { industry: 'high' } },
      remediation_queue: ['f1'],
      next_recommended: ['a2', 'a3'],
    } as never);

    const sink = createBriefIntakeAnalyticsSink({
      auditId: 'audit-1',
      surface: 'consultant_interview',
      getIntakeVersions: () => null,
    });

    renderHook(() =>
      useBriefDiagnosticIntakeAnalyticsEvents({
        auditId: 'audit-1',
        enabled: true,
        responsesFingerprint: '{"a1":{"value":"x"}}',
        sink,
      }),
    );

    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(4000);
    expect(postSpy).toHaveBeenCalled();

    const body = postSpy.mock.calls[0]?.[1] as { events: { event_type: string }[] };
    const types = body.events.map(e => e.event_type);
    expect(types).toContain('readiness_blocked');
    expect(types).toContain('remediation_asked');
    expect(types).toContain('sequencing_transition_taken');

    sink.dispose();
  });
});
