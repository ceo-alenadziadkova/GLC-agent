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

export interface NotificationItem {
  id: string;
  user_id: string;
  audit_id: string | null;
  kind: NotificationKind;
  title: string;
  message: string;
  payload: NotificationPayload;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
