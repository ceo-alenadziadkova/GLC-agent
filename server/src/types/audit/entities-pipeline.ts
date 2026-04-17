export interface ReviewPoint {
  id: string;
  audit_id: string;
  after_phase: number;
  status: 'pending' | 'approved';
  consultant_notes: string | null;
  interview_notes: string | null;
  approved_at: string | null;
}

export interface PipelineEvent {
  id: number;
  audit_id: string;
  phase: number;
  event_type: string;
  message: string | null;
  data: Record<string, unknown>;
  created_at: string;
}
