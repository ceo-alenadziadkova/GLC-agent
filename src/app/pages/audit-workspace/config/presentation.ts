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

export const SEV_COLOR: Record<string, string> = {
  critical: 'var(--score-1)',
  high: 'var(--score-1)',
  medium: 'var(--score-3)',
  low: 'var(--text-tertiary)',
};

export const SEV_BG: Record<string, string> = {
  critical: 'var(--score-1-bg)',
  high: 'var(--score-1-bg)',
  medium: 'var(--score-3-bg)',
  low: 'var(--bg-muted)',
};

export const CONF_COLOR: Record<ConfidenceLevel, string> = {
  high: 'var(--glc-green)',
  medium: 'var(--score-3)',
  low: 'var(--text-tertiary)',
};

export const CONF_BG: Record<ConfidenceLevel, string> = {
  high: 'rgba(14,207,130,0.1)',
  medium: 'rgba(234,179,8,0.1)',
  low: 'var(--bg-muted)',
};
