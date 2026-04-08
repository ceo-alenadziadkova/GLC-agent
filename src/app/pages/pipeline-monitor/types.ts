import type { ComponentType, CSSProperties } from 'react';
import type { PhSt } from '../../lib/pipeline-monitor-helpers';

export interface LogEntry {
  eventType: string;
  text: string;
}

export interface PhaseView {
  id: number;
  name: string;
  label: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  status: PhSt;
  score: number | null;
  wing: 'recon' | 'auto' | 'analytic' | 'strategy';
  log: LogEntry[];
  skipped: boolean;
}
