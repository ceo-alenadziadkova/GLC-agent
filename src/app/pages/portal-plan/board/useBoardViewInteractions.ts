import { useCallback } from 'react';
import type { OrchestrationLaneId } from '../../../config/orchestration-roadmap-ui-copy.en';
import type { PlanCardMetricFilters } from '../../../lib/plan-cross-nav';
import { toast } from 'sonner';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';
import { ORCHESTRATION_UI_COPY } from '../../../config/orchestration-roadmap-ui-copy.en';
import { findColumn } from './plan-board-dnd-helpers';

type PlanBoardPatchCardBody = {
  expected_pack_version: number;
  title?: string;
  lane?: OrchestrationLaneId;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  to_column?: string;
  position?: number;
};

type ColumnBuckets = Record<string, string[]>;

export type UseBoardViewInteractionsArgs = {
  auditId: string;
  pathname: string;
  currentSearch: string;
  orchestrationPackVersion: number;
  packVersionUsed: number | null;
  showConsultantPlanTools: boolean;
  cardsById: ReadonlyMap<string, { canonical_node_key: string | null }>;
  patchCard: (args: { cardId: string; body: PlanBoardPatchCardBody }) => Promise<unknown>;
  queueManifestDraftRevision: (args: {
    canonical_node_key: string;
    expected_pack_version: number;
    lane: OrchestrationLaneId;
    owner_hint?: string;
  }) => Promise<unknown>;
  invalidateAfterConflict: (auditId: string, err: unknown) => Promise<void>;
  mergeClearLaneFiltersLocation: (args: { pathname: string; currentSearch: string }) => string;
  mergeMetricFiltersLocation: (args: {
    pathname: string;
    currentSearch: string;
    patch: Partial<PlanCardMetricFilters>;
  }) => string;
  navigate: (href: string) => void;
  bulkMoveSelected: (columnId: string) => Promise<void>;
  bulkPatchSelected: (patch: { assignee?: string; priority?: 'low' | 'medium' | 'high' | 'urgent'; due_date?: string }) => Promise<void>;
  setSelectedCardIds: (next: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setDeleteCardId: (cardId: string | null) => void;
  setTicketDetailsCardId: (cardId: string | null) => void;
};

export function useBoardViewInteractions(args: UseBoardViewInteractionsArgs) {
  const {
    auditId,
    pathname,
    currentSearch,
    orchestrationPackVersion,
    packVersionUsed,
    showConsultantPlanTools,
    cardsById,
    patchCard,
    queueManifestDraftRevision,
    invalidateAfterConflict,
    mergeClearLaneFiltersLocation,
    mergeMetricFiltersLocation,
    navigate,
    bulkMoveSelected,
    bulkPatchSelected,
    setSelectedCardIds,
    setDeleteCardId,
    setTicketDetailsCardId,
  } = args;

  const commitCardTitleInline = useCallback(
    async (cardId: string, title: string) => {
      try {
        await patchCard({
          cardId,
          body: { expected_pack_version: orchestrationPackVersion, title: title.trim() },
        });
      } catch (err) {
        await runInvalidateAfterConflict({ auditId, err, invalidateAfterConflict });
        throw err;
      }
    },
    [auditId, invalidateAfterConflict, orchestrationPackVersion, patchCard],
  );

  const commitCardLaneInline = useCallback(
    async (cardId: string, lane: OrchestrationLaneId, ownerHint?: string) => {
      const card = cardsById.get(cardId);
      try {
        if (APP_FEATURE_FLAGS.manifestDraftRevisionsFromBoard && showConsultantPlanTools) {
          const ck = card?.canonical_node_key;
          if (ck) {
            await queueManifestDraftRevision({
              canonical_node_key: ck,
              expected_pack_version: orchestrationPackVersion,
              lane,
              ...(ownerHint != null && ownerHint !== '' ? { owner_hint: ownerHint } : {}),
            });
            toast.success(ORCHESTRATION_UI_COPY.manifestDraftLaneQueuedToast);
            return;
          }
        }
        await patchCard({
          cardId,
          body: { expected_pack_version: orchestrationPackVersion, lane },
        });
      } catch (err) {
        await runInvalidateAfterConflict({ auditId, err, invalidateAfterConflict });
        throw err;
      }
    },
    [auditId, cardsById, invalidateAfterConflict, orchestrationPackVersion, patchCard, queueManifestDraftRevision, showConsultantPlanTools],
  );

  const commitCardPriorityInline = useCallback(
    async (cardId: string, priority: 'low' | 'medium' | 'high' | 'urgent') => {
      try {
        await patchCard({
          cardId,
          body: { expected_pack_version: orchestrationPackVersion, priority },
        });
      } catch (err) {
        await runInvalidateAfterConflict({ auditId, err, invalidateAfterConflict });
        throw err;
      }
    },
    [auditId, invalidateAfterConflict, orchestrationPackVersion, patchCard],
  );

  const commitCardDueDateInline = useCallback(
    async (cardId: string, dueDateIso: string) => {
      try {
        await patchCard({
          cardId,
          body: { expected_pack_version: orchestrationPackVersion, due_date: dueDateIso || undefined },
        });
      } catch (err) {
        await runInvalidateAfterConflict({ auditId, err, invalidateAfterConflict });
        throw err;
      }
    },
    [auditId, invalidateAfterConflict, orchestrationPackVersion, patchCard],
  );

  const persistCardPlacement = useCallback(
    async (prev: ColumnBuckets, after: ColumnBuckets, cardId: string) => {
      const prevColumn = findColumn(prev, cardId);
      const nextColumn = findColumn(after, cardId);
      if (!prevColumn || !nextColumn) return;
      const body: PlanBoardPatchCardBody = {
        expected_pack_version: packVersionUsed ?? orchestrationPackVersion,
        position: (after[nextColumn] ?? []).indexOf(cardId),
      };
      if (prevColumn !== nextColumn) body.to_column = nextColumn;
      try {
        await patchCard({ cardId, body });
      } catch (err) {
        await runInvalidateAfterConflict({ auditId, err, invalidateAfterConflict });
      }
    },
    [auditId, invalidateAfterConflict, orchestrationPackVersion, packVersionUsed, patchCard],
  );

  const onClearLaneFilters = useCallback(() => {
    navigate(mergeClearLaneFiltersLocation({ pathname, currentSearch }));
  }, [currentSearch, mergeClearLaneFiltersLocation, navigate, pathname]);

  const onPatchFilters = useCallback(
    (patch: Partial<PlanCardMetricFilters>) => {
      navigate(mergeMetricFiltersLocation({ pathname, currentSearch, patch }));
    },
    [currentSearch, mergeMetricFiltersLocation, navigate, pathname],
  );

  const onMoveAll = useCallback(
    (columnId: string) => {
      void bulkMoveSelected(columnId);
    },
    [bulkMoveSelected],
  );
  const onApplyPriority = useCallback(
    (priority: 'low' | 'medium' | 'high' | 'urgent') => {
      void bulkPatchSelected({ priority });
    },
    [bulkPatchSelected],
  );
  const onApplyAssignee = useCallback(
    (assignee: string) => {
      void bulkPatchSelected({ assignee: assignee.trim() });
    },
    [bulkPatchSelected],
  );
  const onApplyDueDate = useCallback(
    (dueDate: string) => {
      void bulkPatchSelected({ due_date: dueDate });
    },
    [bulkPatchSelected],
  );
  const onClearSelected = useCallback(() => {
    setSelectedCardIds(new Set());
  }, [setSelectedCardIds]);
  const onToggleSelect = useCallback(
    (cardId: string) => {
      setSelectedCardIds((prev) => {
        const next = new Set(prev);
        if (next.has(cardId)) next.delete(cardId);
        else next.add(cardId);
        return next;
      });
    },
    [setSelectedCardIds],
  );
  const onDeleteCard = useCallback(
    async (cardId: string) => {
      setDeleteCardId(cardId);
    },
    [setDeleteCardId],
  );
  const onOpenTicketDetails = useCallback(
    (cardId: string) => {
      setTicketDetailsCardId(cardId);
    },
    [setTicketDetailsCardId],
  );

  return {
    commitCardTitleInline,
    commitCardLaneInline,
    commitCardPriorityInline,
    commitCardDueDateInline,
    persistCardPlacement,
    onClearLaneFilters,
    onPatchFilters,
    onMoveAll,
    onApplyPriority,
    onApplyAssignee,
    onApplyDueDate,
    onClearSelected,
    onToggleSelect,
    onDeleteCard,
    onOpenTicketDetails,
  };
}

async function runInvalidateAfterConflict(args: {
  auditId: string;
  err: unknown;
  invalidateAfterConflict: (auditId: string, err: unknown) => Promise<void>;
}) {
  const { auditId, err, invalidateAfterConflict } = args;
  await invalidateAfterConflict(auditId, err);
}
