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
    expect(String(fetchMock.mock.calls[0][0])).toContain('/rest/v1/pipeline_events');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/rest/v1/audits');
    expect(notifyMock).toHaveBeenCalledOnce();
  });
});

