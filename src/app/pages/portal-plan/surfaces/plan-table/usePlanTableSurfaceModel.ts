import { useMemo } from 'react';

import type { PlanBoardCardDto } from '../../../../data/api/orchestration-types';
import { ORCHESTRATION_LANE_LABELS, type OrchestrationLaneId } from '../../../../config/orchestration-roadmap-ui-copy.en';
import { PLAN_BOARD_COLUMN_HEADINGS_EN, PLAN_BOARD_UI_COLUMNS } from '../../../../config/plan-board-ui-columns';
import {
  buildPlanBoardCardMetrics,
  isBacklogOperationalColumn,
  matchesPlanCardMetricFilters,
  normalizePlanCardDomainKey,
  type PlanBoardCardMetrics,
} from '../../board/plan-board-card-helpers';
import type { PlanCardMetricFilters } from '../../../../lib/plan-cross-nav';

const ORCHESTRATION_LANE_IDS_ORDERED = Object.keys(ORCHESTRATION_LANE_LABELS) as OrchestrationLaneId[];

export type PlanTableGroupRow = {
  laneKey: string;
  laneLabel: string;
  columnId: string;
  columnLabel: string;
  cards: PlanBoardCardDto[];
};

type UsePlanTableSurfaceModelArgs = {
  cards: readonly PlanBoardCardDto[];
  columns: readonly { id: string; title: string }[] | undefined;
  laneFilterKeys: readonly string[];
  metricFilters: PlanCardMetricFilters;
  backlogOnly: boolean;
  top7Set: ReadonlySet<string>;
  top30Set: ReadonlySet<string>;
  reasonLabelByNodeId: ReadonlyMap<string, string>;
};

export function usePlanTableSurfaceModel(args: UsePlanTableSurfaceModelArgs) {
  const columnTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const col of args.columns ?? []) m.set(col.id, col.title);
    for (const id of PLAN_BOARD_UI_COLUMNS) {
      if (!m.has(id)) m.set(id, PLAN_BOARD_COLUMN_HEADINGS_EN[id]);
    }
    return m;
  }, [args.columns]);

  const metricsByCardId = useMemo(() => {
    const metrics = new Map<string, PlanBoardCardMetrics>();
    for (const card of args.cards) {
      const packNodeId = card.pack_graph_node_id;
      const priorityWindow =
        packNodeId && args.top7Set.has(packNodeId) ? ('7d' as const)
        : packNodeId && args.top30Set.has(packNodeId) ? ('30d' as const)
        : null;
      const reasonLabel = packNodeId ? args.reasonLabelByNodeId.get(packNodeId) : null;
      metrics.set(
        card.id,
        buildPlanBoardCardMetrics({
          card,
          priorityWindow,
          priorityReasonLabel: reasonLabel ?? null,
        }),
      );
    }
    return metrics;
  }, [args.cards, args.reasonLabelByNodeId, args.top30Set, args.top7Set]);

  const groupedRows = useMemo(() => {
    const laneOrder = [...ORCHESTRATION_LANE_IDS_ORDERED, '_other'] as const;
    const laneColBuckets = new Map<string, PlanBoardCardDto[]>();
    const laneSet = new Set(args.laneFilterKeys);

    const laneKeyFor = (c: PlanBoardCardDto): string => {
      const raw = c.lane?.trim() ?? '';
      if (raw && (ORCHESTRATION_LANE_IDS_ORDERED as readonly string[]).includes(raw)) return raw;
      return '_other';
    };

    for (const card of args.cards) {
      const laneKey = laneKeyFor(card);
      if (laneSet.size > 0 && !laneSet.has(laneKey)) continue;
      if (args.backlogOnly && !isBacklogOperationalColumn(args.columns ? [...args.columns] : undefined, card.column_id)) continue;
      const metrics = metricsByCardId.get(card.id);
      if (metrics && !matchesPlanCardMetricFilters(metrics, args.metricFilters)) continue;
      const key = `${laneKey}|${card.column_id}`;
      const list = laneColBuckets.get(key) ?? [];
      list.push(card);
      laneColBuckets.set(key, list);
    }

    const rows: PlanTableGroupRow[] = [];
    for (const laneKey of laneOrder) {
      for (const columnId of PLAN_BOARD_UI_COLUMNS) {
        const key = `${laneKey}|${columnId}`;
        const cards = laneColBuckets.get(key);
        if (!cards || cards.length === 0) continue;
        const sorted = cards.slice().sort((a, b) => {
          const da = (a.delivery_area ?? '').localeCompare(b.delivery_area ?? '');
          if (da !== 0) return da;
          return (a.title ?? a.id).localeCompare(b.title ?? b.id);
        });
        rows.push({
          laneKey,
          laneLabel: laneKey === '_other' ? 'Other lanes' : ORCHESTRATION_LANE_LABELS[laneKey as OrchestrationLaneId],
          columnId,
          columnLabel: columnTitleById.get(columnId) ?? columnId,
          cards: sorted,
        });
      }
    }
    return rows;
  }, [args.backlogOnly, args.cards, args.columns, args.laneFilterKeys, args.metricFilters, columnTitleById, metricsByCardId]);

  const availableDomainFilters = useMemo(() => {
    const m = new Map<string, number>();
    for (const card of args.cards) {
      const key = normalizePlanCardDomainKey(card.delivery_area);
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }));
  }, [args.cards]);

  const availableAssignees = useMemo(() => {
    const set = new Set<string>();
    for (const card of args.cards) {
      const assignee = card.assignee?.trim();
      if (assignee) set.add(assignee);
    }
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [args.cards]);

  return { groupedRows, metricsByCardId, availableDomainFilters, availableAssignees };
}
