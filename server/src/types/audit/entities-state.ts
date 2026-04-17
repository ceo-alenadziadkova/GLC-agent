import type { DomainKey } from '@glc/intake-core';

import type { IntakeBrief } from './entities-brief.js';
import type { DomainData } from './entities-domain.js';
import type { AuditMeta } from './entities-meta.js';
import type { PipelineEvent, ReviewPoint } from './entities-pipeline.js';
import type { ReconData } from './entities-recon.js';
import type { StrategyRoadmap } from './entities-strategy.js';

export interface AuditState {
  meta: AuditMeta;
  recon: ReconData | null;
  domains: Record<DomainKey, DomainData | null>;
  strategy: StrategyRoadmap | null;
  reviews: ReviewPoint[];
  events: PipelineEvent[];
  brief: IntakeBrief | null;
}
