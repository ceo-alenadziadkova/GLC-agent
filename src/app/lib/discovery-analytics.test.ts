import { describe, expect, it, vi } from 'vitest';
import { createDiscoveryAnalyticsSink } from './discovery-analytics';

vi.mock('../data/api/discover', () => ({
  discoverApi: {
    postAnalyticsEvents: vi.fn(async () => undefined),
  },
}));

describe('createDiscoveryAnalyticsSink', () => {
  it('detaches global listeners on dispose', () => {
    const addDocumentListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeDocumentListenerSpy = vi.spyOn(document, 'removeEventListener');
    const addWindowListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeWindowListenerSpy = vi.spyOn(window, 'removeEventListener');

    const sink = createDiscoveryAnalyticsSink({
      getIntakeVersions: () => null,
      getDiscoveryToken: () => null,
    });

    expect(addDocumentListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(addWindowListenerSpy).toHaveBeenCalledWith('pagehide', expect.any(Function));

    sink.dispose();

    expect(removeDocumentListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(removeWindowListenerSpy).toHaveBeenCalledWith('pagehide', expect.any(Function));
  });
});
