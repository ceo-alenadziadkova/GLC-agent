export type DashboardPriority = 'high' | 'medium' | 'low';

export interface DashboardKpis {
  total_audits: number;
  active_audits: number;
  avg_score: number | null;
  awaiting_review: number;
}

export interface DashboardReviewGateItem {
  id: string;
  company_name: string | null;
  company_url: string;
  status: string;
  updated_at: string;
  priority: DashboardPriority;
  urgency_rank: number;
}

export interface DashboardSlaRiskItem {
  id: string;
  company_name: string | null;
  company_url: string;
  created_at: string;
  days_open: number;
  priority: DashboardPriority;
  urgency_rank: number;
}

export interface DashboardFailureItem {
  id: string;
  company_name: string | null;
  company_url: string;
  updated_at: string;
  priority: DashboardPriority;
  urgency_rank: number;
}

export interface DashboardPendingRequestItem {
  id: string;
  url: string;
  industry: string | null;
  created_at: string;
  priority: DashboardPriority;
  urgency_rank: number;
}

export interface DashboardActionItems {
  review_gates: DashboardReviewGateItem[];
  sla_risks: DashboardSlaRiskItem[];
  recent_failures: DashboardFailureItem[];
  pending_requests: DashboardPendingRequestItem[];
}

export interface DashboardActivityEvent {
  id: number;
  audit_id: string;
  phase: number;
  event_type: string;
  message: string | null;
  created_at: string;
  company_name: string | null;
  company_url: string;
}

export interface DashboardScoreDistribution {
  band_1: number; // 1.0–1.9
  band_2: number; // 2.0–2.9
  band_3: number; // 3.0–3.9
  band_4: number; // 4.0–5.0
  total_scored: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  action_items: DashboardActionItems;
  activity_feed: DashboardActivityEvent[];
  score_distribution: DashboardScoreDistribution;
  meta: {
    degraded_sections: Array<'kpis' | 'action_items' | 'activity_feed' | 'score_distribution'>;
    generated_at: string;
  };
}
