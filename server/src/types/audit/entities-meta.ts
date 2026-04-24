import type { ProductMode } from '@glc/intake-core';

import type { AuditExecutionPlan } from './execution-plan.js';
import type { AuditOrigin } from './origin.js';
import type { AuditStatus } from './phase-status.js';

export interface AuditMeta {
  id: string;
  user_id: string | null;
  company_url: string;
  /** Persisted flag; legacy rows may be false while company_url is still a sentinel URL. */
  no_public_website?: boolean;
  company_name: string | null;
  industry: string | null;
  status: AuditStatus;
  current_phase: number;
  overall_score: number | null;
  token_budget: number;
  tokens_used: number;
  product_mode: ProductMode;
  origin: AuditOrigin;
  execution_plan?: AuditExecutionPlan | null;
  snapshot_token: string | null;
  created_at: string;
  updated_at: string;
}
