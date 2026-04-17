/**
 * Ops Telegram message shape for structured notifications (English, static copy layer).
 */

export type TelegramStructuredPriority = 'critical' | 'medium' | 'low';

export function telegramStructuredPriorityBadge(priority: TelegramStructuredPriority): 'RED' | 'YELLOW' | 'GREEN' {
  if (priority === 'critical') return 'RED';
  if (priority === 'medium') return 'YELLOW';
  return 'GREEN';
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

export function formatStructuredTelegramMessage(fields: TelegramStructuredEventFields): string {
  const scope = fields.auditId ? `audit=${fields.auditId}` : 'audit=n/a';
  const route = fields.route ? `\nroute=${fields.route}` : '';
  const core = [
    `[${telegramStructuredPriorityBadge(fields.priority)}|${fields.priority.toUpperCase()}]`,
    `[${fields.category.toUpperCase()}]`,
    fields.title,
  ].join(' ');
  return `${core}\nevent=${fields.event}\n${scope}\ntime=${fields.occurredAt}\n${fields.message}${route}`;
}
