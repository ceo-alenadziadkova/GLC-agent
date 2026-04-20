/**
 * Ops Telegram message shape (English copy + HTML layout for Telegram parse_mode).
 */

export type TelegramStructuredPriority = 'critical' | 'medium' | 'low';

export const TELEGRAM_OPS_COPY_EN = {
  header: 'GLC Ops',
  severity: 'Severity',
  area: 'Area',
  summary: 'Summary',
  eventCode: 'Event code',
  audit: 'Audit',
  when: 'When',
  route: 'Route',
  details: 'Details',
  spaSectionTitle: 'SPA error screen',
  spaSupportRef: 'Support ref',
  spaPage: 'Page',
  spaUser: 'User',
  spaClientEnv: 'Client environment',
  spaTechnicalHint: 'Technical hint',
  spaKind: 'Kind',
} as const;

export function telegramStructuredPriorityLabel(priority: TelegramStructuredPriority): string {
  if (priority === 'critical') return 'Critical (RED)';
  if (priority === 'medium') return 'Medium (YELLOW)';
  return 'Low (GREEN)';
}

/** Escape dynamic text for Telegram HTML parse mode (text nodes only). */
export function escapeTelegramHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function labeledBlock(label: string, value: string): string {
  return `<b>${escapeTelegramHtml(label)}:</b> ${escapeTelegramHtml(value)}`;
}

export interface TelegramStructuredEventFields {
  priority: TelegramStructuredPriority;
  category: string;
  title: string;
  event: string;
  message: string;
  auditId?: string | null;
  route?: string;
  occurredAt: string;
}

/**
 * Readable multi-line ops alert for Telegram (HTML). Caller must send with parse_mode HTML.
 */
export function formatStructuredTelegramMessage(fields: TelegramStructuredEventFields): string {
  const lines: string[] = [
    `<b>${escapeTelegramHtml(TELEGRAM_OPS_COPY_EN.header)}</b>`,
    '',
    labeledBlock(TELEGRAM_OPS_COPY_EN.severity, telegramStructuredPriorityLabel(fields.priority)),
    labeledBlock(TELEGRAM_OPS_COPY_EN.area, fields.category.toUpperCase()),
    labeledBlock(TELEGRAM_OPS_COPY_EN.summary, fields.title),
    '',
    labeledBlock(TELEGRAM_OPS_COPY_EN.eventCode, fields.event),
    labeledBlock(TELEGRAM_OPS_COPY_EN.audit, fields.auditId ?? 'n/a'),
    labeledBlock(TELEGRAM_OPS_COPY_EN.when, fields.occurredAt),
  ];
  if (fields.route) {
    lines.push(labeledBlock(TELEGRAM_OPS_COPY_EN.route, fields.route));
  }
  lines.push('', `<b>${escapeTelegramHtml(TELEGRAM_OPS_COPY_EN.details)}</b>`, escapeTelegramHtml(fields.message));
  return lines.join('\n');
}

export interface SpaUiIncidentTelegramFields {
  supportRef: string;
  path: string;
  userId: string;
  messageKind: string;
  detail?: string;
  clientEnv?: unknown;
  timestamp: string;
}

function formatClientEnvForTelegram(clientEnv: unknown): string {
  if (clientEnv === undefined || clientEnv === null) return '—';
  if (typeof clientEnv === 'string') return clientEnv.slice(0, 1200);
  try {
    return JSON.stringify(clientEnv, null, 2).slice(0, 1200);
  } catch {
    return '—';
  }
}

/** HTML body for `source=spa_ui_incident` client log ingest. */
export function formatSpaUiIncidentTelegramMessage(fields: SpaUiIncidentTelegramFields): string {
  const envText = formatClientEnvForTelegram(fields.clientEnv);
  const lines: string[] = [
    `<b>${escapeTelegramHtml(TELEGRAM_OPS_COPY_EN.header)}</b> — <b>${escapeTelegramHtml(TELEGRAM_OPS_COPY_EN.spaSectionTitle)}</b>`,
    '',
    labeledBlock(TELEGRAM_OPS_COPY_EN.spaSupportRef, fields.supportRef),
    labeledBlock(TELEGRAM_OPS_COPY_EN.spaPage, fields.path || '—'),
    labeledBlock(TELEGRAM_OPS_COPY_EN.spaUser, fields.userId),
    labeledBlock(TELEGRAM_OPS_COPY_EN.spaKind, fields.messageKind),
    labeledBlock(TELEGRAM_OPS_COPY_EN.when, fields.timestamp),
  ];
  lines.push('', `<b>${escapeTelegramHtml(TELEGRAM_OPS_COPY_EN.spaClientEnv)}</b>`, escapeTelegramHtml(envText));
  if (fields.detail?.trim()) {
    lines.push('', `<b>${escapeTelegramHtml(TELEGRAM_OPS_COPY_EN.spaTechnicalHint)}</b>`, escapeTelegramHtml(fields.detail.trim()));
  }
  return lines.join('\n');
}
