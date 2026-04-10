import { describe, expect, it, vi, beforeEach } from 'vitest';

const { supabaseFromMock, notifyMock } = vi.hoisted(() => ({
  supabaseFromMock: vi.fn(),
  notifyMock: vi.fn(async () => undefined),
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}));

vi.mock('../services/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../services/notifications.js', () => ({
  notifyAuditParticipants: notifyMock,
}));

import { emitPhaseErrorDurable } from '../services/pipeline-error.js';

describe('emitPhaseErrorDurable fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'service-key';

    supabaseFromMock.mockImplementation(() => {
      throw new Error('supabase write failed');
    });
  });

  it('writes fallback records through Supabase REST when primary write fails', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await emitPhaseErrorDurable('audit-001', 3, new Error('phase boom'));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstCall = fetchMock.mock.calls.at(0) as unknown[] | undefined;
    const secondCall = fetchMock.mock.calls.at(1) as unknown[] | undefined;
    const firstUrl = firstCall?.[0];
    const secondUrl = secondCall?.[0];
    expect(firstUrl).toBeDefined();
    expect(secondUrl).toBeDefined();
    expect(String(firstUrl)).toContain('/rest/v1/pipeline_events');
    expect(String(secondUrl)).toContain('/rest/v1/audits');
    expect(notifyMock).toHaveBeenCalledOnce();
  });
});

