import { supabase } from './supabase.js';
import { logger } from './logger.js';

export type NotificationKind = 'pipeline' | 'review' | 'intake';

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
