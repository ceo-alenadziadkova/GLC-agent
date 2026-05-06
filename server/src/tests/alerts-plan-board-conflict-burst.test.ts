import { beforeEach, describe, expect, it, vi } from 'vitest';

const emitStructuredNotification = vi.fn();

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
          eq: async () => ({ data: [], error: null }),
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

vi.mock('../services/notifications.js', () => ({
  emitStructuredNotification: (...args: unknown[]) => emitStructuredNotification(...args),
}));

vi.mock('../config/alerts-config.js', () => ({
  ALERT_BOARD_CONFLICT_BURST_THRESHOLD: 3,
  ALERT_CHECK_INTERVAL_MS: 60_000,
  ALERT_CHECK_WINDOW_MINUTES: 15,
  ALERT_COOLDOWN_MS: 0,
  ALERT_FAILURE_RATE_THRESHOLD: 0.99,
  ALERT_LATENCY_P95_MS_THRESHOLD: 9_999_999,
  ALERT_LOCK_TTL_MS: 55_000,
  ALERT_TOKEN_BURN_THRESHOLD: 9_999_999_999,
}));

import { runAlertChecks } from '../services/alerts.js';

describe('runAlertChecks plan board conflict burst', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEvents([]);
    process.env.SENTRY_TRACE_LINK_TEMPLATE = '';
    process.env.TRACE_LINK_TEMPLATE = '';
  });

  it('emits alert when reconcile is followed by threshold conflict 409s for same audit', async () => {
    const t0 = new Date(Date.now() - 60_000).toISOString();
    setEvents([
      { audit_id: 'audit-burst-1', phase: 0, event_type: 'plan_board_reconciled', created_at: t0, data: {} },
      {
        audit_id: 'audit-burst-1',
        phase: 0,
        event_type: 'plan_board_conflict_409',
        created_at: new Date(Date.now() - 50_000).toISOString(),
        data: {},
      },
      {
        audit_id: 'audit-burst-1',
        phase: 0,
        event_type: 'plan_board_conflict_409',
        created_at: new Date(Date.now() - 40_000).toISOString(),
        data: {},
      },
      {
        audit_id: 'audit-burst-1',
        phase: 0,
        event_type: 'plan_board_conflict_409',
        created_at: new Date(Date.now() - 30_000).toISOString(),
        data: {},
      },
    ]);

    await runAlertChecks();

    expect(emitStructuredNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'alert_plan_board_conflict_burst_post_reconcile',
        auditId: 'audit-burst-1',
        payload: expect.objectContaining({
          audit_id: 'audit-burst-1',
          conflict_count: 3,
        }),
      }),
    );
  });

  it('does not emit when conflict count is below threshold', async () => {
    const t0 = new Date(Date.now() - 60_000).toISOString();
    setEvents([
      { audit_id: 'audit-low', phase: 0, event_type: 'plan_board_reconciled', created_at: t0, data: {} },
      {
        audit_id: 'audit-low',
        phase: 0,
        event_type: 'plan_board_conflict_409',
        created_at: new Date(Date.now() - 50_000).toISOString(),
        data: {},
      },
      {
        audit_id: 'audit-low',
        phase: 0,
        event_type: 'plan_board_conflict_409',
        created_at: new Date(Date.now() - 40_000).toISOString(),
        data: {},
      },
    ]);

    await runAlertChecks();

    expect(emitStructuredNotification).not.toHaveBeenCalled();
  });

  it('does not emit when conflicts precede reconcile (no anchor)', async () => {
    const tLate = new Date(Date.now() - 10_000).toISOString();
    const tEarly = new Date(Date.now() - 70_000).toISOString();
    setEvents([
      {
        audit_id: 'audit-order',
        phase: 0,
        event_type: 'plan_board_conflict_409',
        created_at: tEarly,
        data: {},
      },
      {
        audit_id: 'audit-order',
        phase: 0,
        event_type: 'plan_board_conflict_409',
        created_at: tEarly,
        data: {},
      },
      {
        audit_id: 'audit-order',
        phase: 0,
        event_type: 'plan_board_conflict_409',
        created_at: tEarly,
        data: {},
      },
      { audit_id: 'audit-order', phase: 0, event_type: 'plan_board_reconciled', created_at: tLate, data: {} },
    ]);

    await runAlertChecks();

    expect(emitStructuredNotification).not.toHaveBeenCalled();
  });
});
