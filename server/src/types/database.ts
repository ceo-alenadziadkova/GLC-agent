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
        };
        Update: Partial<Database['public']['Tables']['audit_strategy']['Insert']>;
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
    };
  };
}
