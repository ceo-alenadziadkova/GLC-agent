import type { FreeSnapshotPreview } from '../../../data/auditTypes';

export const PORTAL_SNAPSHOT_MIRROR_CONSTANTS = {
  techStackChipLimit: 24,
  donutPreset: {
    large: { size: 180, strokeWidth: 12 },
    compact: { size: 148, strokeWidth: 10 },
  },
  styles: {
    cardRadius: { borderRadius: 'var(--radius-xl)' },
    cardOutlined: { borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' },
    scoreEyebrow: {
      color: 'var(--text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
    pillSurface: {
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      color: 'var(--text-secondary)',
    },
    pillInset: {
      background: 'var(--bg-inset)',
      border: '1px solid var(--border-subtle)',
      color: 'var(--text-secondary)',
    },
  },
} as const;

export const PORTAL_SNAPSHOT_SEVERITY_COLOR: Record<string, string> = {
  critical: 'var(--score-1)',
  high: 'var(--score-2)',
  medium: 'var(--score-3)',
  low: 'var(--score-4)',
};

export type ProgramRecommendation = NonNullable<FreeSnapshotPreview['program_recommendations']>[number];
export type SnapshotIssue = FreeSnapshotPreview['issues'][number];
export type SnapshotQuickWin = FreeSnapshotPreview['quick_wins'][number];
