import { describe, expect, it } from 'vitest';
import {
  escapeTelegramHtml,
  formatSpaUiIncidentTelegramMessage,
  formatStructuredTelegramMessage,
} from '../config/telegram-notification-format.en.js';

describe('telegram-notification-format', () => {
  it('escapes HTML-sensitive characters for Telegram HTML mode', () => {
    expect(escapeTelegramHtml('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d');
  });

  it('formats structured ops alerts with labeled sections', () => {
    const text = formatStructuredTelegramMessage({
      priority: 'medium',
      category: 'pipeline',
      title: 'Latency high',
      event: 'alert_latency_p95_high',
      message: 'Latency p95=120000ms in last 15m',
      auditId: 'audit-9',
      route: '/pipeline/x',
      occurredAt: '2026-04-20T12:00:00.000Z',
    });
    expect(text).toContain('<b>GLC Ops</b>');
    expect(text).toContain('Medium (YELLOW)');
    expect(text).toContain('PIPELINE');
    expect(text).toContain('alert_latency_p95_high');
    expect(text).toContain('audit-9');
    expect(text).toContain('/pipeline/x');
    expect(text).toContain('Latency p95=120000ms');
  });

  it('formats SPA UI incident payload with environment block', () => {
    const text = formatSpaUiIncidentTelegramMessage({
      supportRef: 'ref-1',
      path: '/reports/abc',
      userId: 'user-uuid',
      messageKind: 'spa_error_screen',
      detail: 'TypeError: x',
      clientEnv: { os_family: 'macos', browser_coarse: 'chrome' },
      timestamp: '2026-04-20T12:00:00.000Z',
    });
    expect(text).toContain('SPA error screen');
    expect(text).toContain('ref-1');
    expect(text).toContain('/reports/abc');
    expect(text).toContain('user-uuid');
    expect(text).toContain('macos');
    expect(text).toContain('TypeError: x');
  });
});
