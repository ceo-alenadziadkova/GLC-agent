import { PIPELINE_EVENT_TYPES } from '../../../config/pipeline-event-types.js';
import { supabase } from '../../supabase.js';

export type PendingReviewRow = {
  audit_id: string;
  after_phase: number;
  status: string;
};

export type ApprovedReviewRow = Record<string, unknown>;

export async function fetchPendingReviewAfterPhase(auditId: string, afterPhase: number): Promise<PendingReviewRow | null> {
  const { data } = await supabase
    .from('review_points')
    .select('*')
    .eq('audit_id', auditId)
    .eq('after_phase', afterPhase)
    .eq('status', 'pending')
    .single();
  return data ? (data as PendingReviewRow) : null;
}

/** Any open human gate blocks advancing or finalizing the pipeline. */
export async function fetchAnyPendingReviewForAudit(auditId: string): Promise<PendingReviewRow | null> {
  const { data } = await supabase
    .from('review_points')
    .select('audit_id, after_phase, status')
    .eq('audit_id', auditId)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();
  return data ? (data as PendingReviewRow) : null;
}

export async function fetchReviewPointsForAudit(auditId: string): Promise<unknown[]> {
  const { data } = await supabase.from('review_points').select('*').eq('audit_id', auditId).order('after_phase');
  return data ?? [];
}

type ApproveReviewRpcRow = {
  outcome: string;
  review_row: unknown;
  pipeline_event_id: number | null;
};

/** Single DB transaction: pending review → approved + `pipeline_events.review_approved` row (`service_role` RPC). */
export async function approvePendingReviewEmitApprovedEventAtomic(params: {
  auditId: string;
  afterPhase: number;
  consultantNotes: string | null;
  interviewNotes: string | null;
  message: string;
}): Promise<{ data: ApprovedReviewRow | null; error: Error | null }> {
  const { auditId, afterPhase, consultantNotes, interviewNotes, message } = params;
  const { data: raw, error } = await supabase.rpc('pipeline_approve_review_emit_approved_event_atomic', {
    p_audit_id: auditId,
    p_after_phase: afterPhase,
    p_consultant_notes: consultantNotes,
    p_interview_notes: interviewNotes,
    p_event_type: PIPELINE_EVENT_TYPES.reviewApproved,
    p_message: message,
  });

  if (error) return { data: null, error: error as Error };

  const rows: ApproveReviewRpcRow[] = Array.isArray(raw) ? raw : raw != null ? [raw as ApproveReviewRpcRow] : [];
  const row = rows[0];
  if (!row)
    return { data: null, error: new Error('pipeline_approve_review_emit_approved_event_atomic returned no row') };

  if (row.outcome === 'already_approved') {
    return { data: null, error: null };
  }

  if (row.outcome !== 'approved' || row.review_row == null || typeof row.review_row !== 'object') {
    return { data: null, error: new Error('unexpected pipeline_approve_review_emit_approved_event_atomic payload') };
  }

  return { data: row.review_row as ApprovedReviewRow, error: null };
}

export async function requestMissingDataForPendingReview(params: {
  auditId: string;
  afterPhase: number;
  consultantNotes: string | null;
  interviewNotes: string | null;
}): Promise<{ data: ApprovedReviewRow | null; error: Error | null }> {
  const { auditId, afterPhase, consultantNotes, interviewNotes } = params;
  const { data, error } = await supabase
    .from('review_points')
    .update({
      consultant_notes: consultantNotes,
      interview_notes: interviewNotes,
    })
    .eq('audit_id', auditId)
    .eq('after_phase', afterPhase)
    .eq('status', 'pending')
    .select()
    .maybeSingle();

  return { data: (data as ApprovedReviewRow | null) ?? null, error: error as Error | null };
}
