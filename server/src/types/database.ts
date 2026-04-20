// Supabase Database type definitions (generated-style)
// These match the SQL schema exactly

export interface Database {
  public: {
    Tables: {
      audits: {
        Row: {
          id: string;
          user_id: string;
          company_url: string;
          company_name: string | null;
          industry: string | null;
          status: string;
          current_phase: number;
          overall_score: number | null;
          token_budget: number;
          tokens_used: number;
          /** `normal` | `safe` — governance execution mode (see migration 051). */
          execution_mode: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_url: string;
          company_name?: string | null;
          industry?: string | null;
          status?: string;
          current_phase?: number;
          overall_score?: number | null;
          token_budget?: number;
          tokens_used?: number;
          execution_mode?: string;
        };
        Update: Partial<Database['public']['Tables']['audits']['Insert']>;
      };
      audit_recon: {
        Row: {
          id: string;
          audit_id: string;
          status: string;
          company_name: string | null;
          industry: string | null;
          location: string | null;
          languages: string[];
          tech_stack: Record<string, string[]>;
          social_profiles: Record<string, string>;
          contact_info: Record<string, string[]>;
          pages_crawled: Record<string, unknown>[];
          brief: string | null;
          interview_answers: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          audit_id: string;
          status?: string;
          company_name?: string | null;
          industry?: string | null;
          location?: string | null;
          languages?: string[];
          tech_stack?: Record<string, string[]>;
          social_profiles?: Record<string, string>;
          contact_info?: Record<string, string[]>;
          pages_crawled?: Record<string, unknown>[];
          brief?: string | null;
          interview_answers?: string | null;
        };
        Update: Partial<Database['public']['Tables']['audit_recon']['Insert']>;
      };
      audit_domains: {
        Row: {
          id: string;
          audit_id: string;
          domain_key: string;
          phase_number: number;
          status: string;
          score: number | null;
          label: string | null;
          version: number;
          summary: string | null;
          strengths: string[];
          weaknesses: string[];
          issues: Record<string, unknown>[];
          quick_wins: Record<string, unknown>[];
          recommendations: Record<string, unknown>[];
          raw_data: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          audit_id: string;
          domain_key: string;
          phase_number: number;
          status?: string;
          score?: number | null;
          label?: string | null;
          version?: number;
          summary?: string | null;
          strengths?: string[];
          weaknesses?: string[];
          issues?: Record<string, unknown>[];
          quick_wins?: Record<string, unknown>[];
          recommendations?: Record<string, unknown>[];
          raw_data?: Record<string, unknown>;
        };
        Update: Partial<Database['public']['Tables']['audit_domains']['Insert']>;
      };
      audit_strategy: {
        Row: {
          id: string;
          audit_id: string;
          status: string;
          executive_summary: string | null;
          overall_score: number | null;
          quick_wins: Record<string, unknown>[];
          medium_term: Record<string, unknown>[];
          strategic: Record<string, unknown>[];
          scorecard: Record<string, unknown>[];
          schema_version: number;
          strategy_lab_context: Record<string, unknown>;
          glc_orchestration_pack: Record<string, unknown> | null;
          orchestration_pack_version: number;
          glc_orchestration_last_revision_diff: Record<string, unknown> | null;
          glc_orchestration_revision_history: Record<string, unknown>[];
          created_at: string;
        };
        Insert: {
          id?: string;
          audit_id: string;
          status?: string;
          executive_summary?: string | null;
          overall_score?: number | null;
          quick_wins?: Record<string, unknown>[];
          medium_term?: Record<string, unknown>[];
          strategic?: Record<string, unknown>[];
          scorecard?: Record<string, unknown>[];
          schema_version?: number;
          strategy_lab_context?: Record<string, unknown>;
          glc_orchestration_pack?: Record<string, unknown> | null;
          orchestration_pack_version?: number;
          glc_orchestration_last_revision_diff?: Record<string, unknown> | null;
          glc_orchestration_revision_history?: Record<string, unknown>[];
        };
        Update: Partial<Database['public']['Tables']['audit_strategy']['Insert']>;
      };
      audit_roadmap_manifest_snapshots: {
        Row: {
          id: string;
          audit_id: string;
          created_by_user_id: string;
          payload: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          audit_id: string;
          created_by_user_id: string;
          payload: Record<string, unknown>;
        };
        Update: Partial<Database['public']['Tables']['audit_roadmap_manifest_snapshots']['Insert']>;
      };
      audit_strategy_execution_packs: {
        Row: {
          id: string;
          audit_id: string;
          created_by_user_id: string;
          initiative_ids: string[];
          selected_path_type: string | null;
          payload: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          audit_id: string;
          created_by_user_id: string;
          initiative_ids: string[];
          selected_path_type?: string | null;
          payload?: Record<string, unknown>;
        };
        Update: Partial<Database['public']['Tables']['audit_strategy_execution_packs']['Insert']>;
      };
      pipeline_events: {
        Row: {
          id: number;
          audit_id: string;
          phase: number;
          event_type: string;
          message: string | null;
          data: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          audit_id: string;
          phase: number;
          event_type: string;
          message?: string | null;
          data?: Record<string, unknown>;
        };
        Update: Partial<Database['public']['Tables']['pipeline_events']['Insert']>;
      };
      collected_data: {
        Row: {
          id: string;
          audit_id: string;
          collector_key: string;
          phase: number;
          data: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          audit_id: string;
          collector_key: string;
          phase: number;
          data: Record<string, unknown>;
        };
        Update: Partial<Database['public']['Tables']['collected_data']['Insert']>;
      };
      review_points: {
        Row: {
          id: string;
          audit_id: string;
          after_phase: number;
          status: string;
          consultant_notes: string | null;
          interview_notes: string | null;
          approved_at: string | null;
        };
        Insert: {
          id?: string;
          audit_id: string;
          after_phase: number;
          status?: string;
          consultant_notes?: string | null;
          interview_notes?: string | null;
        };
        Update: Partial<Database['public']['Tables']['review_points']['Insert']>;
      };
      consultant_email_allowlist: {
        Row: {
          email_normalized: string;
          created_at: string;
        };
        Insert: {
          email_normalized: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['consultant_email_allowlist']['Insert']>;
      };
      legal_consent_events: {
        Row: {
          id: string;
          user_id: string;
          consent_key: string;
          accepted: boolean;
          document_bundle_version: string;
          tos_version: string | null;
          privacy_version: string | null;
          dpa_version: string | null;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          consent_key: string;
          accepted: boolean;
          document_bundle_version: string;
          tos_version?: string | null;
          privacy_version?: string | null;
          dpa_version?: string | null;
          source?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['legal_consent_events']['Insert']>;
      };
      evaluation_datasets: {
        Row: {
          id: string;
          audit_id: string;
          phase_id: string;
          run_number: number;
          control_object: Record<string, unknown>;
          agent_output: Record<string, unknown>;
          cleaned_output: Record<string, unknown>;
          human_feedback: Record<string, unknown> | null;
          decision_applied: string | null;
          agent_variant_id: string | null;
          retention_policy: string;
          pii_sanitized: boolean;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          audit_id: string;
          phase_id: string;
          run_number: number;
          control_object: Record<string, unknown>;
          agent_output: Record<string, unknown>;
          cleaned_output: Record<string, unknown>;
          human_feedback?: Record<string, unknown> | null;
          decision_applied?: string | null;
          agent_variant_id?: string | null;
          retention_policy?: string;
          pii_sanitized?: boolean;
          created_at?: string;
          expires_at?: string;
        };
        Update: Partial<Database['public']['Tables']['evaluation_datasets']['Insert']>;
      };
      agent_performance_aggregate: {
        Row: {
          id: string;
          phase_id: string;
          agent_number: number;
          evaluation_count: number;
          avg_score: number | null;
          avg_hallucination_rate: number | null;
          avg_risky_promise_rate: number | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phase_id: string;
          agent_number: number;
          evaluation_count?: number;
          avg_score?: number | null;
          avg_hallucination_rate?: number | null;
          avg_risky_promise_rate?: number | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['agent_performance_aggregate']['Insert']>;
      };
      audit_claim_graph: {
        Row: {
          id: string;
          audit_id: string;
          phase_id: string;
          claim_id: number;
          depends_on_refs: unknown;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          audit_id: string;
          phase_id: string;
          claim_id: number;
          depends_on_refs?: unknown;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_claim_graph']['Insert']>;
      };
      audit_remediations: {
        Row: {
          id: string;
          audit_id: string;
          phase_id: string;
          error_type: string;
          remediation_type: string;
          original_excerpt: string;
          applied_fix: string;
          preconditions_snapshot: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          audit_id: string;
          phase_id: string;
          error_type: string;
          remediation_type: string;
          original_excerpt: string;
          applied_fix: string;
          preconditions_snapshot?: unknown;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_remediations']['Insert']>;
      };
      domain_benchmark_snapshot: {
        Row: {
          id: string;
          computed_at: string;
          phase_id: string;
          industry: string;
          period: string;
          sample_count: number;
          p25: number;
          p50: number;
          p75: number;
          p90: number;
          avg_score: number;
          hallucination_rate_p50: number | null;
          risky_promise_rate_p50: number | null;
          unverified_rate_p50: number | null;
          top_error_types: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          computed_at: string;
          phase_id: string;
          industry: string;
          period: string;
          sample_count: number;
          p25: number;
          p50: number;
          p75: number;
          p90: number;
          avg_score: number;
          hallucination_rate_p50?: number | null;
          risky_promise_rate_p50?: number | null;
          unverified_rate_p50?: number | null;
          top_error_types?: string[] | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['domain_benchmark_snapshot']['Insert']>;
      };
    };
  };
}
