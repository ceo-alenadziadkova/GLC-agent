import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { toast } from 'sonner';
import type { PlanTicketDetailsDraft } from '../PlanTicketDetailsPanel';
import { applyBucketDrag, cloneBuckets, moveCardIntoColumn } from './plan-board-dnd-helpers';

type BulkPatch = {
  assignee?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
};

type ColumnBuckets = Record<string, string[]>;
type PatchCardBody = { expected_pack_version: number } & Record<string, unknown>;

type UseBoardActionsArgs = {
  selectedCardColumnId: string | null;
  selectedCardIds: Set<string>;
  setSelectedCardIds: Dispatch<SetStateAction<Set<string>>>;
  columnBuckets: ColumnBuckets;
  setColumnBuckets: Dispatch<SetStateAction<ColumnBuckets>>;
  setDraggingCardId: Dispatch<SetStateAction<string | null>>;
  setDeleteCardId: Dispatch<SetStateAction<string | null>>;
  orchestrationPackVersion: number;
  expectedPackVersion: number;
  auditId: string;
  persistCardPlacement: (prev: ColumnBuckets, after: ColumnBuckets, cardId: string) => Promise<void>;
  patchCard: (args: { cardId: string; body: PatchCardBody }) => Promise<unknown>;
  deleteCard: (args: { cardId: string; body: { expected_pack_version: number } }) => Promise<unknown>;
  batchPatchCards: (args: {
    expected_pack_version: number;
    patches: Array<{ card_id: string } & BulkPatch>;
  }) => Promise<unknown>;
  invalidateAfterConflict: (auditId: string, error: unknown) => Promise<void>;
};

export function useBoardActions(args: UseBoardActionsArgs) {
  const {
    selectedCardColumnId,
    selectedCardIds,
    setSelectedCardIds,
    columnBuckets,
    setColumnBuckets,
    setDraggingCardId,
    setDeleteCardId,
    orchestrationPackVersion,
    expectedPackVersion,
    auditId,
    persistCardPlacement,
    patchCard,
    deleteCard,
    batchPatchCards,
    invalidateAfterConflict,
  } = args;

  const moveCardViaMenu = useCallback(
    async (targetCol: string, cardId: string) => {
      const prev = cloneBuckets(columnBuckets);
      const draft = moveCardIntoColumn(prev, cardId, targetCol);
      if (!draft) return;
      setColumnBuckets(draft);
      await persistCardPlacement(prev, draft, cardId);
    },
    [columnBuckets, persistCardPlacement, setColumnBuckets],
  );

  const confirmDeleteCard = useCallback(
    async (deleteCardId: string | null): Promise<void> => {
      if (!deleteCardId) return;
      const cardId = deleteCardId;
      try {
        await deleteCard({
          cardId,
          body: { expected_pack_version: orchestrationPackVersion },
        });
        setDeleteCardId(null);
      } catch (err) {
        await invalidateAfterConflict(auditId, err);
      }
    },
    [auditId, deleteCard, invalidateAfterConflict, orchestrationPackVersion, setDeleteCardId],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setDraggingCardId(String(event.active.id));
    },
    [setDraggingCardId],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setDraggingCardId(null);
      if (!over || orchestrationPackVersion <= 0) return;

      const prev = cloneBuckets(columnBuckets);
      const next = applyBucketDrag(prev, String(active.id), String(over.id));
      if (!next) return;

      setColumnBuckets(next);
      await persistCardPlacement(prev, next, String(active.id));
    },
    [columnBuckets, orchestrationPackVersion, persistCardPlacement, setColumnBuckets, setDraggingCardId],
  );

  const bulkMoveSelected = useCallback(
    async (targetCol: string): Promise<void> => {
      if (selectedCardIds.size === 0) return;
      for (const cardId of selectedCardIds) {
        // eslint-disable-next-line no-await-in-loop
        await moveCardViaMenu(targetCol, cardId);
      }
      setSelectedCardIds(new Set());
    },
    [moveCardViaMenu, selectedCardIds, setSelectedCardIds],
  );

  const bulkPatchSelected = useCallback(
    async (patch: BulkPatch) => {
      if (selectedCardIds.size === 0) return;
      try {
        await batchPatchCards({
          expected_pack_version: expectedPackVersion,
          patches: [...selectedCardIds].map((card_id) => ({
            card_id,
            ...patch,
          })),
        });
        setSelectedCardIds(new Set());
      } catch (err) {
        await invalidateAfterConflict(auditId, err);
      }
    },
    [auditId, batchPatchCards, expectedPackVersion, invalidateAfterConflict, selectedCardIds, setSelectedCardIds],
  );

  const saveTicketDetails = useCallback(
    async (cardId: string, draft: PlanTicketDetailsDraft) => {
      try {
        await patchCard({
          cardId,
          body: {
            expected_pack_version: expectedPackVersion,
            title: draft.title.trim(),
            ticket_description: draft.ticket_description.trim(),
            assignee: draft.assignee.trim(),
            assignee_user_id: draft.assignee_user_id.trim() !== '' ? draft.assignee_user_id.trim() : null,
            labels: draft.labels
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
            story_points: draft.story_points.trim() !== '' ? Number(draft.story_points) : null,
            priority: draft.priority,
            lane: draft.lane.trim() !== '' ? draft.lane.trim() : undefined,
            delivery_area: draft.delivery_area.trim(),
            start_date: draft.start_date || undefined,
            due_date: draft.due_date || undefined,
            end_date: draft.end_date || undefined,
            ...(selectedCardColumnId !== draft.to_column ? { to_column: draft.to_column } : {}),
          },
        });
        toast.success('Ticket updated');
      } catch (err) {
        await invalidateAfterConflict(auditId, err);
        toast.error('Could not update ticket');
      }
    },
    [auditId, expectedPackVersion, invalidateAfterConflict, patchCard, selectedCardColumnId],
  );

  return {
    moveCardViaMenu,
    confirmDeleteCard,
    handleDragStart,
    handleDragEnd,
    bulkMoveSelected,
    bulkPatchSelected,
    saveTicketDetails,
  };
}
