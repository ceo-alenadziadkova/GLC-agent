import type { ReactNode } from 'react';

import type { PlanBoardCardDto } from '../../data/api/audits-orchestration';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import type { RoadmapGanttProjection } from '../../lib/roadmap-gantt-mapper';

/** Optional read model for Delivery Board PATCH from Roadmap drawer (ADR cross-view §5). */
export type RoadmapGanttPlanBoardHydration =
  | undefined
  | {
      enabled: boolean;
      pending: boolean;
      fetchFailed: boolean;
      blockedNoPack: boolean;
      blockedGovernance: boolean;
      cards: readonly PlanBoardCardDto[];
      packVersionUsed: number;
      role: 'consultant' | 'client';
    };

export type RoadmapGanttViewProps = {
  auditId: string;
  projection: RoadmapGanttProjection;
  strategyHref: string;
  /** When set, task drawer links to Delivery Board (`?focus=<pack node id>`). */
  getDeliveryBoardHrefForPackNode?: (packGraphNodeId: string) => string | null | undefined;
  /** Optional pack read model — used to resolve `?focus=` (canonical key) to timeline task ids. */
  orchestrationPack?: GlcOrchestrationPackView | null;
  planBoardHydration?: RoadmapGanttPlanBoardHydration;
  /** Consultant-only controls injected into Gantt toolbar (e.g. manual card dialog). */
  toolbarLeadingSlot?: ReactNode | undefined;
};
