import {
  Cursor,
  Globe,
  HardDrives,
  Lightning,
  Shield,
  Target,
} from '@phosphor-icons/react';
import type React from 'react';
import type { ConfidenceLevel, DomainKey } from '../../../data/auditTypes';

export const DOMAIN_ICONS: Record<
  DomainKey,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  tech_infrastructure: HardDrives,
  security_compliance: Shield,
  seo_digital: Globe,
  ux_conversion: Cursor,
  marketing_utp: Target,
  automation_processes: Lightning,
};

/** Tailwind class bundles for issue severity / confidence pills (design tokens via var()). */
export const SEV_ISSUE_PILL_VARIANT_CLASS: Record<string, string> = {
  critical: 'bg-[var(--score-1-bg)] text-[var(--score-1)]',
  high: 'bg-[var(--score-1-bg)] text-[var(--score-1)]',
  medium: 'bg-[var(--score-3-bg)] text-[var(--score-3)]',
  low: 'bg-[var(--bg-muted)] text-[var(--text-tertiary)]',
};

export const CONF_ISSUE_PILL_VARIANT_CLASS: Record<ConfidenceLevel, string> = {
  high: 'bg-[var(--glc-green-muted)] text-[var(--glc-green)]',
  medium: 'bg-[var(--score-3-alpha-10)] text-[var(--score-3)]',
  low: 'bg-[var(--bg-muted)] text-[var(--text-tertiary)]',
};
