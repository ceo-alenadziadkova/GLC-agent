import { getTelegramApiBase } from '../config/integrations.js';
import { getTelegramBotCredentials } from '../config/telegram-credentials.js';
import { formatStructuredTelegramMessage } from '../config/telegram-notification-format.en.js';
import { supabase } from './supabase.js';
import { logger } from './logger.js';

export type NotificationKind = 'pipeline' | 'review' | 'intake';
export type NotificationPriority = 'critical' | 'medium' | 'low';
export type NotificationCategory =
  | 'pipeline'
  | 'review'
  | 'intake'
  | 'request'
  | 'snapshot'
  | 'registration'
  | 'help'
  | 'system';
export type NotificationAudience = 'user' | 'audit_participants' | 'audit_participants_except' | 'consultants';

export interface NotificationPayload {
  route?: string;
  request_id?: string;
  artifact?: 'strategy' | 'report' | 'report_pdf' | 'action_plan_csv' | string;
  failure_type?: 'phase_failed' | 'retry_started' | string;
  audit_id?: string;
  phase?: number;
  status?: string;
  event_type?: string;
  occurred_at?: string;
  actor_role?: 'consultant' | 'client' | 'system' | string;
  [key: string]: unknown;
}

export interface StructuredNotificationEvent {
  category: NotificationCategory;
  event: string;
  priority: NotificationPriority;
  audience: NotificationAudience;
  title: string;
  message: string;
  route?: string;
  userId?: string;
  auditId?: string | null;
  excludeUserIds?: string[];
  payload?: NotificationPayload;
  sendInApp?: boolean;
  sendTelegram?: boolean;
  occurredAt?: string;
}

interface NotifyInput {
  userId: string;
  auditId?: string | null;
  kind: NotificationKind;
  title: string;
  message: string;
  payload?: NotificationPayload;
}

interface AuditParticipants {
  user_id: string;
  client_id: string | null;
}

interface ConsultantProfileRow {
  id: string;
}

function mapCategoryToKind(category: NotificationCategory): NotificationKind {
  if (category === 'review') return 'review';
  if (category === 'intake' || category === 'request' || category === 'registration' || category === 'help') {
    return 'intake';
  }
  return 'pipeline';
}

async function sendTelegramMessage(text: string): Promise<void> {
  const creds = getTelegramBotCredentials();
  if (!creds) return;
  try {
    const response = await fetch(`${getTelegramApiBase()}/bot${creds.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: creds.chatId, text }),
    });
    if (!response.ok) {
      logger.warn('notifications.telegram_send_failed', { status: response.status });
    }
  } catch (err) {
    logger.warn('notifications.telegram_send_exception', {
      error: (err as Error).message,
    });
  }
}

export async function notifyUser(input: NotifyInput): Promise<void> {
  const { userId, auditId = null, kind, title, message, payload = {} } = input;
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    audit_id: auditId,
    kind,
    title,
    message,
    payload,
  });
  if (error) {
    logger.warn('notifications.notify_user_failed', {
      component: 'notifications',
      user_id: userId,
      audit_id: auditId,
      kind,
      error: error.message,
    });
  }
}

async function getAuditParticipants(auditId: string): Promise<AuditParticipants | null> {
  const { data, error } = await supabase
    .from('audits')
    .select('user_id, client_id')
    .eq('id', auditId)
    .single();
  if (error || !data) {
    logger.warn('notifications.audit_participants_failed', {
      component: 'notifications',
      audit_id: auditId,
      error: error?.message ?? 'missing',
    });
    return null;
  }
  return data as AuditParticipants;
}

export async function notifyAuditParticipants(
  auditId: string,
  kind: NotificationKind,
  title: string,
  message: string,
  payload: NotificationPayload = {},
): Promise<void> {
  const participants = await getAuditParticipants(auditId);
  if (!participants) return;

  const recipientIds = new Set<string>([participants.user_id]);
  if (participants.client_id) recipientIds.add(participants.client_id);

  await Promise.all(
    Array.from(recipientIds).map((userId) =>
      notifyUser({ userId, auditId, kind, title, message, payload }),
    ),
  );
}

export async function notifyAuditParticipantsExcept(
  auditId: string,
  kind: NotificationKind,
  title: string,
  message: string,
  excludeUserIds: string[],
  payload: NotificationPayload = {},
): Promise<void> {
  const participants = await getAuditParticipants(auditId);
  if (!participants) return;

  const excluded = new Set(excludeUserIds.filter(Boolean));
  const recipientIds = new Set<string>();
  if (!excluded.has(participants.user_id)) recipientIds.add(participants.user_id);
  if (participants.client_id && !excluded.has(participants.client_id)) recipientIds.add(participants.client_id);

  await Promise.all(
    Array.from(recipientIds).map((userId) =>
      notifyUser({ userId, auditId, kind, title, message, payload }),
    ),
  );
}

export async function notifyConsultants(
  kind: NotificationKind,
  title: string,
  message: string,
  payload: NotificationPayload = {},
): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'consultant');
  if (error) {
    logger.warn('notifications.consultants_query_failed', {
      component: 'notifications',
      error: error.message,
    });
    return;
  }

  const consultantIds = (data ?? []).map((row) => (row as ConsultantProfileRow).id);
  await Promise.all(
    consultantIds.map((userId) =>
      notifyUser({ userId, kind, title, message, payload }),
    ),
  );
}

export async function emitStructuredNotification(event: StructuredNotificationEvent): Promise<void> {
  const occurredAt = event.occurredAt ?? new Date().toISOString();
  const payload: NotificationPayload = {
    ...event.payload,
    category: event.category,
    event: event.event,
    priority: event.priority,
    route: event.route ?? event.payload?.route,
    occurred_at: occurredAt,
  };
  const kind = mapCategoryToKind(event.category);
  const sendInApp = event.sendInApp !== false;
  const sendTelegram = event.sendTelegram !== false;

  if (sendInApp) {
    if (event.audience === 'user') {
      if (!event.userId) {
        logger.warn('notifications.structured_missing_user_id', { event: event.event, category: event.category });
      } else {
        await notifyUser({
          userId: event.userId,
          auditId: event.auditId ?? null,
          kind,
          title: event.title,
          message: event.message,
          payload,
        });
      }
    } else if (event.audience === 'audit_participants') {
      if (!event.auditId) {
        logger.warn('notifications.structured_missing_audit_id', { event: event.event, category: event.category });
      } else {
        await notifyAuditParticipants(event.auditId, kind, event.title, event.message, payload);
      }
    } else if (event.audience === 'audit_participants_except') {
      if (!event.auditId) {
        logger.warn('notifications.structured_missing_audit_id', { event: event.event, category: event.category });
      } else {
        await notifyAuditParticipantsExcept(
          event.auditId,
          kind,
          event.title,
          event.message,
          event.excludeUserIds ?? [],
          payload,
        );
      }
    } else {
      await notifyConsultants(kind, event.title, event.message, payload);
    }
  }

  if (sendTelegram) {
    await sendTelegramMessage(
      formatStructuredTelegramMessage({
        priority: event.priority,
        category: event.category,
        title: event.title,
        event: event.event,
        message: event.message,
        auditId: event.auditId,
        route: event.route,
        occurredAt,
      }),
    );
  }
}
