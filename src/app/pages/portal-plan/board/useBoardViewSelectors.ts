import { useCallback, useMemo } from 'react';
import type {
  AuditTimelineDto,
  PlanBoardCardDto,
  PlanBoardGetBody,
} from '../../../data/api/orchestration-types';
import type { PlanCardMetricFilters } from '../../../lib/plan-cross-nav';
import { buildPlanSurfaceHrefWithFocus } from '../../../lib/plan-cross-nav';
import { buildPlanBoardCardMetrics } from './plan-board-card-helpers';
import {
  orchestrationNodeTitleMap,
  projectRoadmapNodesFromCriticalPath,
  type OrchestrationTimelineTimeBucket,
} from '../../../lib/orchestration-timeline-projection';
import { ORCHESTRATION_PRIORITY_REASON_CODES } from '../../../config/orchestration-roadmap-ui-copy.en';
import type { OrchestrationSeasonPreset } from '../../../config/orchestration-roadmap-manifest';

type BoardCardMetrics = ReturnType<typeof buildPlanBoardCardMetrics>;
type BoardColumnDescriptor = { id: string; title: string };

export type UseBoardViewSelectorsArgs = {
  cards: readonly PlanBoardCardDto[];
  columns: readonly { id: string; title: string }[] | undefined;
  defaultColumns: readonly BoardColumnDescriptor[];
  timelineParity: PlanBoardGetBody['timeline_parity'];
  timeline: AuditTimelineDto | null | undefined;
  glcPack: { graph: { nodes: ReadonlyArray<{ id: string; analysis_depth?: string | null }> } } | null;
  pendingManifestDraftCanonicalKeys: readonly string[];
  laneFilterKeys: readonly string[];
  metricFilters: PlanCardMetricFilters;
  focusToken: string | null;
  auditId: string;
  isClient: boolean;
  seasonPreset: OrchestrationSeasonPreset;
};

export type UseBoardViewSelectorsResult = {
  operationalColumnDescriptors: readonly BoardColumnDescriptor[];
  operationalColumnIds: readonly string[];
  cardsById: ReadonlyMap<string, PlanBoardCardDto>;
  focusCardForCommands: PlanBoardCardDto | null;
  pendingManifestDraftCanonicalSet: ReadonlySet<string>;
  titles: ReadonlyMap<string, string>;
  nodeById: ReadonlyMap<string, { id: string; analysis_depth?: string | null }>;
  cardMetricsById: ReadonlyMap<string, BoardCardMetrics>;
  availableDomainFilters: ReadonlyArray<readonly [string, number]>;
  availableAssignees: readonly string[];
  prioritySets: { top7: ReadonlySet<string>; top30: ReadonlySet<string> };
  byBucket: Record<OrchestrationTimelineTimeBucket, ReturnType<typeof projectRoadmapNodesFromCriticalPath>>;
  buildCardPresentation: (dto: PlanBoardCardDto) => {
    openOnRoadmapHref: string | null;
    priorityWindow: '7d' | '30d' | null;
    priorityReasonLabel: string | null;
    analysisDepth: 'baseline' | 'deep' | null;
    domainLabel: string | null;
    quickWin: boolean;
    critical: boolean;
    assignee: string | null;
    dueDate: string | null;
    dueState: 'overdue' | 'due_soon' | 'due_later' | 'no_due';
    priorityLevel: 'low' | 'medium' | 'high' | 'urgent' | null;
  };
};

export function useBoardViewSelectors(args: UseBoardViewSelectorsArgs): UseBoardViewSelectorsResult {
  const {
    cards,
    columns,
    defaultColumns,
    timelineParity,
    timeline,
    glcPack,
    pendingManifestDraftCanonicalKeys,
    focusToken,
    auditId,
    isClient,
    seasonPreset,
  } = args;

  const operationalColumnDescriptors = useMemo<readonly BoardColumnDescriptor[]>(
    () => (columns && columns.length > 0 ? columns.map((c) => ({ id: c.id, title: c.title })) : defaultColumns),
    [columns, defaultColumns],
  );
  const operationalColumnIds = useMemo(
    () => operationalColumnDescriptors.map((c) => c.id),
    [operationalColumnDescriptors],
  );
  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const focusCardForCommands = useMemo(() => {
    if (!focusToken) return null;
    for (const card of cards) {
      if (card.id === focusToken || card.canonical_node_key === focusToken || card.pack_graph_node_id === focusToken) {
        return card;
      }
    }
    return null;
  }, [cards, focusToken]);
  const pendingManifestDraftCanonicalSet = useMemo(
    () => new Set(pendingManifestDraftCanonicalKeys),
    [pendingManifestDraftCanonicalKeys.join('|')],
  );

  const projections = useMemo(
    () => (glcPack ? projectRoadmapNodesFromCriticalPath({ pack: glcPack, seasonPreset }) : []),
    [glcPack, seasonPreset],
  );
  const titles = useMemo(() => (glcPack ? orchestrationNodeTitleMap(glcPack) : new Map()), [glcPack]);
  const nodeById = useMemo(
    () => (glcPack ? new Map(glcPack.graph.nodes.map((n) => [n.id, n])) : new Map()),
    [glcPack],
  );

  const top7List = timelineParity?.top_7d ?? (timeline?.status === 'ready' ? timeline.top_7d : []) ?? [];
  const top30List = timelineParity?.top_30d ?? (timeline?.status === 'ready' ? timeline.top_30d : []) ?? [];
  const prioritySets = useMemo(
    () => ({ top7: new Set(top7List), top30: new Set(top30List) }),
    [top30List, top7List],
  );
  const reasonRows =
    timelineParity?.top_priorities ?? (timeline?.status === 'ready' ? timeline.top_priorities : undefined) ?? [];
  const priorityReasonLabelByPackNodeId = useMemo(
    () =>
      new Map(
        reasonRows.map((p) => [p.action_id, ORCHESTRATION_PRIORITY_REASON_CODES[p.reason_code] ?? p.reason_code] as const),
      ),
    [reasonRows],
  );
  const reasonByPackNodeId = useMemo(
    () => new Map(reasonRows.map((p) => [p.action_id, p.reason_code] as const)),
    [reasonRows],
  );

  const cardMetricsById = useMemo(() => {
    const out = new Map<string, BoardCardMetrics>();
    for (const card of cards) {
      const packNodeId = card.pack_graph_node_id;
      const priorityWindow =
        packNodeId && prioritySets.top7.has(packNodeId)
          ? ('7d' as const)
          : packNodeId && prioritySets.top30.has(packNodeId)
            ? ('30d' as const)
            : null;
      const priorityReasonLabel = packNodeId ? priorityReasonLabelByPackNodeId.get(packNodeId) : null;
      out.set(card.id, buildPlanBoardCardMetrics({ card, priorityWindow, priorityReasonLabel }));
    }
    return out;
  }, [cards, priorityReasonLabelByPackNodeId, prioritySets]);

  const availableDomainFilters = useMemo(() => {
    const byDomain = new Map<string, number>();
    for (const card of cards) {
      const key = cardMetricsById.get(card.id)?.domainKey ?? 'other';
      byDomain.set(key, (byDomain.get(key) ?? 0) + 1);
    }
    return [...byDomain.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }));
  }, [cards, cardMetricsById]);
  const availableAssignees = useMemo(() => {
    const set = new Set<string>();
    for (const card of cards) {
      const assignee = card.assignee?.trim();
      if (assignee) set.add(assignee);
    }
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [cards]);

  const byBucket = useMemo(() => {
    const buckets: Record<OrchestrationTimelineTimeBucket, typeof projections> = {
      now: [],
      next: [],
      later: [],
    };
    for (const row of projections) {
      buckets[row.time_bucket].push(row);
    }
    return buckets;
  }, [projections]);

  const buildCardPresentation = useCallback(
    (dto: PlanBoardCardDto) => {
      const packNodeId = dto.pack_graph_node_id;
      const priorityWindow =
        packNodeId && prioritySets.top7.has(packNodeId)
          ? ('7d' as const)
          : packNodeId && prioritySets.top30.has(packNodeId)
            ? ('30d' as const)
            : null;
      const packNode = packNodeId ? nodeById.get(packNodeId) : undefined;
      const analysisDepth =
        packNode?.analysis_depth === 'baseline' || packNode?.analysis_depth === 'deep' ? packNode.analysis_depth : null;
      const priorityReasonCode = packNodeId ? reasonByPackNodeId.get(packNodeId) : undefined;
      const priorityReasonLabel =
        priorityReasonCode != null ? ORCHESTRATION_PRIORITY_REASON_CODES[priorityReasonCode] ?? priorityReasonCode : null;
      const metrics = cardMetricsById.get(dto.id);
      const focusForRoadmap = dto.canonical_node_key ?? dto.pack_graph_node_id ?? null;
      return {
        openOnRoadmapHref:
          focusForRoadmap != null
            ? buildPlanSurfaceHrefWithFocus({
                auditId,
                isClient,
                view: 'roadmap',
                focusCanonicalKey: focusForRoadmap,
              })
            : null,
        priorityWindow,
        priorityReasonLabel,
        analysisDepth,
        domainLabel: dto.delivery_area ? dto.delivery_area.replaceAll('_', ' ') : null,
        quickWin: metrics?.quickWin ?? false,
        critical: metrics?.critical ?? false,
        assignee: metrics?.assignee ?? null,
        dueDate: metrics?.dueDate ?? null,
        dueState: metrics?.dueState ?? 'no_due',
        priorityLevel: metrics?.priorityLevel ?? null,
      };
    },
    [auditId, cardMetricsById, isClient, nodeById, prioritySets, reasonByPackNodeId],
  );

  return {
    operationalColumnDescriptors,
    operationalColumnIds,
    cardsById,
    focusCardForCommands,
    pendingManifestDraftCanonicalSet,
    titles,
    nodeById,
    cardMetricsById,
    availableDomainFilters,
    availableAssignees,
    prioritySets,
    byBucket,
    buildCardPresentation,
  };
}
