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
    from: (table: string) => {
      if (table === 'pipeline_events') {
        return {
          select: () => ({
            gte: async () => ({ data: getEvents(), error: null }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: async () => ({ data: [{ id: 'consultant-1' }], error: null }),
          }),
        };
      }
      if (table === 'notifications') {
        return {
          insert: async () => ({ error: null }),
        };
      }
      return {
        select: () => ({
          gte: async () => ({ data: [], error: null }),
        }),
      };
    },
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

vi.mock('../config/alerts-config.js', () => ({
  ALERT_CHECK_INTERVAL_MS: 60_000,
  ALERT_CHECK_WINDOW_MINUTES: 15,
  ALERT_COOLDOWN_MS: 900_000,
  ALERT_FAILURE_RATE_THRESHOLD: 0.01,
  ALERT_LATENCY_P95_MS_THRESHOLD: 1,
  ALERT_LOCK_TTL_MS: 55_000,
  ALERT_TOKEN_BURN_THRESHOLD: 1,
}));

import { runAlertChecks } from '../services/alerts.js';

describe('alerts deep links', () => {
  beforeEach(() => {
    setEvents([]);
    vi.restoreAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
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
    const firstPayload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { text: string; parse_mode?: string };
    expect(firstPayload.parse_mode).toBe('HTML');
    expect(firstPayload.text).toContain('GLC Ops');
    expect(firstPayload.text).toContain('Critical (RED)');
    expect(firstPayload.text).toContain('alert_failure_rate_high');
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
    const firstPayload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { text: string; parse_mode?: string };
    expect(firstPayload.parse_mode).toBe('HTML');
    expect(firstPayload.text).toContain('Critical (RED)');
    expect(firstPayload.text).toContain('trace_id=fallback-trace');
  });
});
