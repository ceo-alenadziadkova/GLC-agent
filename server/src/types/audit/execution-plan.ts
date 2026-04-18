import type { DomainKey } from '@glc/intake-core';

import type { AuditCoveragePackage, AuditDepth } from './product.js';

export interface AuditExecutionPlan {
  selected_domains: DomainKey[];
  depth: AuditDepth;
  source: 'user_selected' | 'system_default';
  recommended_domains?: DomainKey[];
  coverage_package?: AuditCoveragePackage;
  include_strategy?: boolean;
}
