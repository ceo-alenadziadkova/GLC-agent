import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { emitStructuredNotification } from '../services/notifications.js';

describe('emitStructuredNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
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
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { text: string };
    expect(requestBody.text).toContain('[YELLOW|MEDIUM]');
    expect(requestBody.text).toContain('[HELP]');
    expect(requestBody.text).toContain('event=brief_help_requested');
    expect(requestBody.text).toContain('route=/audit/audit-1');
  });
});

