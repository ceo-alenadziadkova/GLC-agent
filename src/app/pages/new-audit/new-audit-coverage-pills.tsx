import { Cursor, Globe, HardDrives, Lightning, Shield, Target } from '@phosphor-icons/react';
import type { ComponentType } from 'react';

import { NEW_AUDIT_ALL_COVERAGE_DOMAINS } from '../../config/new-audit-coverage-policy';
import type { DomainKey } from '../../data/auditTypes';

export type CoverageDomainPillIconProps = {
  className?: string;
  'aria-hidden'?: boolean;
};

export type CoverageDomainPillMeta = {
  domain: DomainKey;
  Icon: ComponentType<CoverageDomainPillIconProps>;
};

const COVERAGE_DOMAIN_PILL_ICON: Record<DomainKey, ComponentType<CoverageDomainPillIconProps>> = {
  tech_infrastructure: HardDrives,
  security_compliance: Shield,
  seo_digital: Globe,
  ux_conversion: Cursor,
  marketing_utp: Target,
  automation_processes: Lightning,
};

/** Ordered coverage domain pills (icons + keys); labels come from `NEW_AUDIT_COVERAGE_DOMAIN_LABELS`. */
export const NEW_AUDIT_COVERAGE_DOMAIN_PILLS: CoverageDomainPillMeta[] = NEW_AUDIT_ALL_COVERAGE_DOMAINS.map(
  domain => ({
    domain,
    Icon: COVERAGE_DOMAIN_PILL_ICON[domain],
  }),
);
