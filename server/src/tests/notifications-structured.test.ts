import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';

const { insertMock, consultantsEqMock } = vi.hoisted(() => ({
  insertMock: vi.fn(async () => ({ error: null })),
  consultantsEqMock: vi.fn(async () => ({ data: [{ id: 'c1' }], error: null })),
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: consultantsEqMock,
          }),
        };
      }
      return {
        insert: insertMock,
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

import { logger } from '../services/logger.js';
import { emitStructuredNotification, resetStructuredNotificationDedupForTests } from '../services/notifications.js';

describe('emitStructuredNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStructuredNotificationDedupForTests();
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends structured tg message with priority badge', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await emitStructuredNotification({
      category: 'help',
      event: 'brief_help_requested',
      priority: 'medium',
      audience: 'consultants',
      title: 'Client requested help',
      message: 'Need help with intake question.',
      auditId: 'audit-1',
      route: '/audit/audit-1',
    });

    expect(insertMock).toHaveBeenCalled();
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      text: string;
      parse_mode?: string;
    };
    expect(requestBody.parse_mode).toBe('HTML');
    expect(requestBody.text).toContain('GLC Ops');
    expect(requestBody.text).toContain('Medium (YELLOW)');
    expect(requestBody.text).toContain('HELP');
    expect(requestBody.text).toContain('brief_help_requested');
    expect(requestBody.text).toContain('/audit/audit-1');
  });

  it('dedupes identical consultant notifications within the cooldown window', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const nowSpy = vi.spyOn(Date, 'now');
    let t = 1_700_000_000_000;
    nowSpy.mockImplementation(() => t);

    const payload = {
      category: 'help' as const,
      event: 'brief_help_requested',
      priority: 'medium' as const,
      audience: 'consultants' as const,
      title: 'Client requested help',
      message: 'Need help with intake question.',
      auditId: 'audit-dedup-1',
      route: '/audit/audit-dedup-1',
    };

    await emitStructuredNotification(payload);
    await emitStructuredNotification(payload);

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      'notifications.structured_notification_deduped',
      expect.objectContaining({
        notification_event: 'brief_help_requested',
        audit_id: 'audit-dedup-1',
      }),
    );

    t += SYSTEM_DEFAULTS.notifications.structuredNotificationDedupCooldownMs + 1;
    await emitStructuredNotification(payload);
    expect(insertMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not dedupe the same event for different audits', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const base = {
      category: 'help' as const,
      event: 'brief_help_requested',
      priority: 'medium' as const,
      audience: 'consultants' as const,
      title: 'Client requested help',
      message: 'Need help.',
    };
    await emitStructuredNotification({ ...base, auditId: 'a1', route: '/audit/a1' });
    await emitStructuredNotification({ ...base, auditId: 'a2', route: '/audit/a2' });
    expect(insertMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(vi.mocked(logger.info)).not.toHaveBeenCalled();
  });
});

