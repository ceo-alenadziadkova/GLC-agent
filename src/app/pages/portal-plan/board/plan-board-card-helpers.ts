import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
import {
  ORCHESTRATION_LANE_LABELS,
  type OrchestrationLaneId,
} from '../../../config/orchestration-roadmap-ui-copy.en';
import type { PlanBoardCardDto, PlanBoardGetBody } from '../../../data/api/orchestration-types';
import type { PlanCardMetricFilters } from '../../../lib/plan-cross-nav';

export function manualCardNeedsPackAlignmentBanner(
  boardColumns: PlanBoardGetBody['columns'] | undefined,
  columnId: string,
): boolean {
  const semantic = boardColumns?.find((c) => c.id === columnId)?.semantic;
  if (semantic != null) return semantic !== 'backlog' && semantic !== 'next_up';
  return columnId !== 'backlog' && columnId !== 'next_up';
}

export function laneDisplayLabel(raw: string | null): string | null {
  if (!raw) return null;
  if ((Object.keys(ORCHESTRATION_LANE_LABELS) as string[]).includes(raw)) {
    return ORCHESTRATION_LANE_LABELS[raw as OrchestrationLaneId];
  }
  return raw.replaceAll('_', ' ');
}

export function formatLaneDensityLine(
  ids: readonly string[],
  cardsById: Map<string, PlanBoardCardDto>,
): string | null {
  const counts = new Map<string, number>();
  for (const id of ids) {
    const lane = cardsById.get(id)?.lane;
    if (!lane) continue;
    counts.set(lane, (counts.get(lane) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const parts = [...counts.entries()].map(([lane, n]) => {
    const label = laneDisplayLabel(lane);
    return `${n} ${label ?? lane}`;
  });
  return `${PLAN_BOARD_COPY.columnLaneMixLabel}: ${parts.join(', ')}`;
}

export function isBacklogOperationalColumn(
  boardColumns: PlanBoardGetBody['columns'] | undefined,
  columnId: string,
): boolean {
  const semantic = boardColumns?.find((c) => c.id === columnId)?.semantic;
  if (semantic != null) return semantic === 'backlog';
  return columnId === 'backlog';
}

export type PlanBoardCardMetrics = {
  domainKey: string;
  priorityLevel: 'low' | 'medium' | 'high' | 'urgent' | null;
  priorityBucket: '7d' | '30d' | null;
  priorityReasonLabel: string | null;
  quickWin: boolean;
  critical: boolean;
  assignee: string | null;
  dueState: 'overdue' | 'due_soon' | 'due_later' | 'no_due';
  dueDate: string | null;
};

export type PlanBoardPrimaryMarker = {
  key: 'domain_lane' | 'priority' | 'quick_win' | 'critical';
  label: string;
  active?: boolean;
};

export function normalizePlanCardDomainKey(deliveryArea: string | null | undefined): string {
  const raw = (deliveryArea ?? '').trim().toLowerCase();
  if (raw === '') return 'other';
  return raw.replaceAll(/\s+/g, '_');
}

export function buildPlanBoardCardMetrics(args: {
  card: PlanBoardCardDto;
  priorityWindow: '7d' | '30d' | null;
  priorityReasonLabel?: string | null;
}): PlanBoardCardMetrics {
  const reason = (args.priorityReasonLabel ?? '').toLowerCase();
  const title = (args.card.title ?? '').toLowerCase();
  const quickWin = reason.includes('quick') || title.includes('quick win');
  const critical = args.priorityWindow === '7d';
  const assignee = args.card.assignee?.trim() || null;
  const dueDate = args.card.due_date ?? null;
  const now = new Date().toISOString().slice(0, 10);
  const dueState: PlanBoardCardMetrics['dueState'] =
    dueDate == null ? 'no_due'
    : dueDate < now ? 'overdue'
    : dueDate <= addDaysIso(now, 7) ? 'due_soon'
    : 'due_later';
  return {
    domainKey: normalizePlanCardDomainKey(args.card.delivery_area),
    priorityLevel: args.card.priority ?? null,
    priorityBucket: args.priorityWindow,
    priorityReasonLabel: args.priorityReasonLabel ?? null,
    quickWin,
    critical,
    assignee,
    dueState,
    dueDate,
  };
}

export function matchesPlanCardMetricFilters(metrics: PlanBoardCardMetrics, filters: PlanCardMetricFilters): boolean {
  if (filters.domain !== 'all' && metrics.domainKey !== filters.domain) return false;
  if (filters.priority !== 'all' && metrics.priorityBucket !== filters.priority) return false;
  if (filters.quickOnly && !metrics.quickWin) return false;
  if (filters.criticalOnly && !metrics.critical) return false;
  if (filters.assignee !== 'all' && (metrics.assignee ?? '') !== filters.assignee) return false;
  if (filters.dueState !== 'all' && metrics.dueState !== filters.dueState) return false;
  return true;
}

/**
 * Unified primary marker set shown on Board/Table cards.
 * Required order: Domain/Lane, Priority, Quick win, Critical.
 */
export function buildPlanBoardPrimaryMarkers(args: {
  metrics: PlanBoardCardMetrics;
  laneLabel?: string | null;
  domainLabel?: string | null;
}): PlanBoardPrimaryMarker[] {
  const scope = args.domainLabel?.trim() || args.laneLabel?.trim() || 'Unassigned lane';
  const priority = args.metrics.priorityLevel ?? 'unset';
  return [
    { key: 'domain_lane', label: `Scope: ${scope}` },
    { key: 'priority', label: `Priority: ${priority}` },
    { key: 'quick_win', label: args.metrics.quickWin ? 'Quick win' : 'Not quick win', active: args.metrics.quickWin },
    { key: 'critical', label: args.metrics.critical ? 'Critical' : 'Not critical', active: args.metrics.critical },
  ];
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
