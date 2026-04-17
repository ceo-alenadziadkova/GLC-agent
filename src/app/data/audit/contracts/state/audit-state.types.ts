import type { DomainKey } from '@glc/intake-core';

import type { AuditMeta, ReconData } from '../core/audit-meta.types';
import type { IntakeBrief } from '../intake/intake-brief.types';
import type { DomainData, StrategyRoadmap } from '../report/report-domain.types';
import type { ReviewPoint } from '../pipeline/pipeline.types';

export interface AuditState {
  meta: AuditMeta;
  report_coverage?: {
    covered_domains: DomainKey[];
    not_covered_domains: DomainKey[];
    coverage_ratio: number;
    coverage_adjusted_score: number | null;
    comparability_note: string;
  };
  recon: ReconData | null;
  domains: Record<string, DomainData | null>;
  strategy: StrategyRoadmap | null;
  reviews: ReviewPoint[];
  /** Present when `GET /api/audits/:id` loaded intake_brief (see server audits route). */
  brief: IntakeBrief | null;
}
