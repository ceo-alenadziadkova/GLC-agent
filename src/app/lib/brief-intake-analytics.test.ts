import { describe, expect, it, vi } from 'vitest';
import { createBriefIntakeAnalyticsSink } from './brief-intake-analytics';

vi.mock('../data/api/brief-profile-platform', () => ({
  briefProfilePlatformApi: {
    postBriefAnalyticsEvents: vi.fn(async () => undefined),
  },
}));

describe('createBriefIntakeAnalyticsSink', () => {
  it('detaches global listeners on dispose', () => {
    const addDocumentListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeDocumentListenerSpy = vi.spyOn(document, 'removeEventListener');
    const addWindowListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeWindowListenerSpy = vi.spyOn(window, 'removeEventListener');

    const sink = createBriefIntakeAnalyticsSink({
      auditId: 'audit-001',
      surface: 'consultant_interview',
      getIntakeVersions: () => null,
    });

    expect(addDocumentListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(addWindowListenerSpy).toHaveBeenCalledWith('pagehide', expect.any(Function));

    sink.dispose();

    expect(removeDocumentListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(removeWindowListenerSpy).toHaveBeenCalledWith('pagehide', expect.any(Function));
  });
});
