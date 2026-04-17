import type { EXPRESS_PRODUCT_MODE, FULL_PRODUCT_MODE } from '../types/audit.js';

export type AuditRequestProductMode = typeof EXPRESS_PRODUCT_MODE | typeof FULL_PRODUCT_MODE;

export const AUDIT_REQUEST_STATUSES = {
  draft: 'draft',
  submitted: 'submitted',
  underReview: 'under_review',
  approved: 'approved',
  rejected: 'rejected',
  running: 'running',
  delivered: 'delivered',
} as const;

export type AuditRequestStatus = (typeof AUDIT_REQUEST_STATUSES)[keyof typeof AUDIT_REQUEST_STATUSES];

export type AuditRequestRow = {
  id: string;
  client_id: string;
  audit_id: string | null;
  url: string;
  industry: string | null;
  product_mode: string;
  brief_snapshot: unknown;
  client_notes: string | null;
  consultant_note: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export type RequestActor = {
  userId: string;
  isConsultant: boolean;
};
