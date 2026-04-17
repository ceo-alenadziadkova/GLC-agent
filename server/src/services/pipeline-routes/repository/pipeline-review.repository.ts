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

export async function fetchReviewPointsForAudit(auditId: string): Promise<unknown[]> {
  const { data } = await supabase.from('review_points').select('*').eq('audit_id', auditId).order('after_phase');
  return data ?? [];
}

export async function approvePendingReview(params: {
  auditId: string;
  afterPhase: number;
  consultantNotes: string | null;
  interviewNotes: string | null;
}): Promise<{ data: ApprovedReviewRow | null; error: Error | null }> {
  const { auditId, afterPhase, consultantNotes, interviewNotes } = params;
  const { data, error } = await supabase
    .from('review_points')
    .update({
      status: 'approved',
      consultant_notes: consultantNotes,
      interview_notes: interviewNotes,
      approved_at: new Date().toISOString(),
    })
    .eq('audit_id', auditId)
    .eq('after_phase', afterPhase)
    .eq('status', 'pending')
    .select()
    .maybeSingle();

  return { data: (data as ApprovedReviewRow | null) ?? null, error: error as Error | null };
}
