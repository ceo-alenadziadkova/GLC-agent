import { beforeEach, describe, expect, it, vi } from 'vitest';

const { setEvents, getEvents } = vi.hoisted(() => {
  let events: Array<Record<string, unknown>> = [];
  return {
    setEvents(next: Array<Record<string, unknown>>) {
      events = next;
    },
    getEvents() {
      return events;
    },
  };
});

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        gte: async () => ({ data: getEvents(), error: null }),
      }),
    }),
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

import { runAlertChecks } from '../services/alerts.js';

describe('alerts deep links', () => {
  beforeEach(() => {
    setEvents([]);
    vi.restoreAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    process.env.ALERT_FAILURE_RATE_THRESHOLD = '0.2';
    process.env.ALERT_LATENCY_P95_MS_THRESHOLD = '1';
    process.env.ALERT_TOKEN_BURN_15M_THRESHOLD = '1';
    process.env.SENTRY_TRACE_LINK_TEMPLATE = '';
    process.env.TRACE_LINK_TEMPLATE = '';
  });

  it('adds sentry and trace deep links when templates are configured', async () => {
    setEvents([
      {
        audit_id: 'a1',
        phase: 1,
        event_type: 'started',
        created_at: new Date(Date.now() - 1000).toISOString(),
        data: { trace_id: 'abc123' },
      },
      {
        audit_id: 'a1',
        phase: 1,
        event_type: 'error',
        created_at: new Date().toISOString(),
        data: { trace_id: 'abc123' },
      },
      {
        audit_id: 'a1',
        phase: 1,
        event_type: 'token_usage',
        created_at: new Date().toISOString(),
        data: { total_tokens: 99, trace_id: 'abc123' },
      },
    ]);
    process.env.SENTRY_TRACE_LINK_TEMPLATE = 'https://sentry.example/traces/{trace_id}';
    process.env.TRACE_LINK_TEMPLATE = 'https://trace.example/id/{trace_id}';

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await runAlertChecks();

    expect(fetchMock).toHaveBeenCalled();
    const firstPayload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { text: string };
    expect(firstPayload.text).toContain('https://sentry.example/traces/abc123');
    expect(firstPayload.text).toContain('https://trace.example/id/abc123');
  });

  it('falls back to raw trace_id when link templates are missing', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 1_000_000);
    setEvents([
      {
        audit_id: 'a1',
        phase: 2,
        event_type: 'started',
        created_at: new Date(Date.now() - 1000).toISOString(),
        data: { trace_id: 'fallback-trace' },
      },
      {
        audit_id: 'a1',
        phase: 2,
        event_type: 'error',
        created_at: new Date().toISOString(),
        data: { trace_id: 'fallback-trace' },
      },
    ]);

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await runAlertChecks();

    expect(fetchMock).toHaveBeenCalled();
    const firstPayload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { text: string };
    expect(firstPayload.text).toContain('trace_id=fallback-trace');
  });
});
