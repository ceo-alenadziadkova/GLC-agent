import type { AdminQueueFilter } from './admin-request-queue/hooks/useAdminRequestQueue';

export const ADMIN_REQUEST_QUEUE_TAB_PANEL_ID = 'admin-request-queue-panel' as const;

export const ADMIN_SNAPSHOT_QUEUE_FILTER_ORDER = [
  'all',
  'running',
  'completed',
  'failed',
] as const;
export type SnapshotStatusFilter = (typeof ADMIN_SNAPSHOT_QUEUE_FILTER_ORDER)[number];
export const ADMIN_SNAPSHOT_QUEUE_TAB_PANEL_ID = 'admin-snapshot-queue-panel' as const;

export const DISCOVERY_QUEUE_FILTER_ORDER = ['all'] as const;
export type DiscoveryQueueFilter = (typeof DISCOVERY_QUEUE_FILTER_ORDER)[number];
export const DISCOVERY_QUEUE_TAB_PANEL_ID = 'discovery-queue-panel' as const;

export const QUEUE_TAB_BUTTON_BASE_CLASS =
  'glc-touch-target rounded-lg border px-3 py-2 text-xs sm:min-h-0 sm:py-1.5' as const;
export const QUEUE_TAB_BUTTON_ACTIVE_CLASS = 'border-info/50 bg-info/10 text-info' as const;
export const QUEUE_TAB_BUTTON_INACTIVE_CARD_CLASS = 'bg-card text-muted-foreground' as const;
export const QUEUE_TAB_BUTTON_INACTIVE_MUTED_CLASS = 'bg-muted text-muted-foreground' as const;

export const REQUEST_QUEUE_TAB_BUTTON_BASE_CLASS =
  'border-[length:var(--border-width-default)] border-solid font-medium transition-colors' as const;
export const REQUEST_QUEUE_TAB_BUTTON_ACTIVE_CLASS =
  'border-[var(--callout-info-border-strong)] bg-[var(--glc-blue-muted-strong)] text-[var(--glc-blue)]' as const;
export const REQUEST_QUEUE_TAB_BUTTON_INACTIVE_CLASS =
  'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]' as const;

export const QUEUE_ERROR_BANNER_CLASS =
  'bg-destructive/10 text-destructive border-destructive/40 flex items-center gap-3 rounded-lg border px-4 py-3' as const;
export const QUEUE_ERROR_BANNER_TEXT_CLASS = 'text-sm' as const;

export const QUEUE_EMPTY_STATE_CONTAINER_CLASS = 'text-muted-foreground py-16 text-center' as const;
export const QUEUE_EMPTY_STATE_ICON_CLASS = 'text-muted-foreground mx-auto mb-3 h-10 w-10' as const;
export const QUEUE_EMPTY_STATE_TEXT_CLASS = 'text-sm font-medium' as const;

export function isAwaitingAdminQueueFilter(filter: AdminQueueFilter): boolean {
  return filter === 'pending';
}
