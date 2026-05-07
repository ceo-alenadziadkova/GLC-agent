import { useMutation, useQuery, useQueryClient } from '../../lib/tanstack-react-query';

import { api } from '../apiService';
import { PLAN_BOARD_UI_COLUMNS } from '../../config/plan-board-ui-columns';
import { glcKeys } from '../../lib/glc-keys';
import { invalidatePlanWorkspaceQueries } from '../../lib/plan-workspace-queries';

import type {
  ManifestDraftRevisionPostBody,
  PlanBoardCardBatchPatchBody,
  PlanBoardCardDeleteBody,
  PlanBoardCardPatchBody,
  PlanBoardCardDto,
  PlanBoardColumnPolicyPatchBody,
  PlanTicketCommentDto,
  PlanTicketEventDto,
  PlanBoardReconcilePreviewDto,
} from './audits-orchestration';

export const planBoardQueryKeys = {
  audit: (auditId: string) => glcKeys.planWorkspace.board(auditId),
};

export function usePlanBoardQuery(args: {
  auditId: string | undefined;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: planBoardQueryKeys.audit(args.auditId ?? ''),
    queryFn: () => api.getPlanBoard(args.auditId!),
    enabled: Boolean(args.auditId) && args.enabled,
  });
}

export function usePatchPlanBoardCardMutation(args: { auditId: string | undefined }) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vars: { cardId: string; body: PlanBoardCardPatchBody }) =>
      api.patchPlanBoardCard(args.auditId!, vars.cardId, vars.body),
    onSettled: async () => {
      if (!args.auditId) return;
      await invalidatePlanWorkspaceQueries(qc, args.auditId);
    },
  });
}

export function usePatchPlanBoardCardsBatchMutation(args: { auditId: string | undefined }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PlanBoardCardBatchPatchBody) => api.patchPlanBoardCardsBatch(args.auditId!, body),
    onSettled: async () => {
      if (!args.auditId) return;
      await invalidatePlanWorkspaceQueries(qc, args.auditId);
    },
  });
}

export function usePostPlanBoardReconcileMutation(auditId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => api.postPlanBoardReconcile(auditId!),
    onSettled: async () => {
      if (!auditId) return;
      await invalidatePlanWorkspaceQueries(qc, auditId);
    },
  });
}

export function usePostPlanBoardReconcilePreviewMutation(auditId: string | undefined) {
  return useMutation({
    mutationFn: (): Promise<PlanBoardReconcilePreviewDto> => api.postPlanBoardReconcilePreview(auditId!),
  });
}

export function usePostPlanBoardManualCardMutation(auditId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vars: { title: string; lane: string; column_id?: string }) =>
      api.postPlanBoardManualCard(auditId!, vars),
    onSettled: async () => {
      if (!auditId) return;
      await invalidatePlanWorkspaceQueries(qc, auditId);
    },
  });
}

export function usePostManifestDraftRevisionMutation(auditId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: ManifestDraftRevisionPostBody) => api.postRoadmapManifestDraftRevision(auditId!, body),
    onSettled: async () => {
      if (!auditId) return;
      await invalidatePlanWorkspaceQueries(qc, auditId);
    },
  });
}

export function usePatchPlanBoardColumnPolicyMutation(args: {
  auditId: string | undefined;
}) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: PlanBoardColumnPolicyPatchBody) => api.patchPlanBoardColumnPolicy(args.auditId!, body),
    onSettled: async () => {
      if (!args.auditId) return;
      await invalidatePlanWorkspaceQueries(qc, args.auditId);
    },
  });
}

export function useDeletePlanBoardCardMutation(args: { auditId: string | undefined }) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vars: { cardId: string; body: PlanBoardCardDeleteBody }) =>
      api.deletePlanBoardCard(args.auditId!, vars.cardId, vars.body),
    onSettled: async () => {
      if (!args.auditId) return;
      await invalidatePlanWorkspaceQueries(qc, args.auditId);
    },
  });
}

export function usePlanBoardCardEventsQuery(args: {
  auditId: string | undefined;
  cardId: string | undefined;
  limit?: number;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: [...planBoardQueryKeys.audit(args.auditId ?? ''), 'ticket-events', args.cardId ?? '', args.limit ?? 100],
    queryFn: async (): Promise<PlanTicketEventDto[]> => {
      const data = await api.getPlanBoardCardEvents(args.auditId!, args.cardId!, { limit: args.limit });
      return data.events;
    },
    enabled: Boolean(args.auditId) && Boolean(args.cardId) && args.enabled,
  });
}

export function usePlanBoardCardCommentsQuery(args: {
  auditId: string | undefined;
  cardId: string | undefined;
  limit?: number;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: [...planBoardQueryKeys.audit(args.auditId ?? ''), 'ticket-comments', args.cardId ?? '', args.limit ?? 100],
    queryFn: async (): Promise<PlanTicketCommentDto[]> => {
      const data = await api.getPlanBoardCardComments(args.auditId!, args.cardId!, { limit: args.limit });
      return data.comments;
    },
    enabled: Boolean(args.auditId) && Boolean(args.cardId) && args.enabled,
  });
}

export function usePostPlanBoardCardCommentMutation(args: { auditId: string | undefined }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      cardId: string;
      body: string;
      mentions?: string[];
      source_surface?: 'board' | 'table' | 'roadmap' | 'shape' | 'api';
    }) =>
      api.postPlanBoardCardComment(args.auditId!, vars.cardId, {
        body: vars.body,
        mentions: vars.mentions,
        source_surface: vars.source_surface,
      }),
    onSuccess: async (_result, vars) => {
      if (!args.auditId) return;
      await Promise.all([
        qc.invalidateQueries({ queryKey: [...planBoardQueryKeys.audit(args.auditId), 'ticket-comments', vars.cardId] }),
        qc.invalidateQueries({ queryKey: [...planBoardQueryKeys.audit(args.auditId), 'ticket-events', vars.cardId] }),
      ]);
    },
  });
}

export function bucketPlanBoardCardsByColumn(
  cards: readonly PlanBoardCardDto[],
  columnIdsOrdered?: readonly string[],
): Record<string, string[]> {
  const orderedColumns =
    columnIdsOrdered != null && columnIdsOrdered.length > 0 ? columnIdsOrdered : [...PLAN_BOARD_UI_COLUMNS];

  const buckets: Record<string, string[]> = Object.fromEntries(orderedColumns.map((c) => [c, []]));

  const fallbackColumnId = orderedColumns[0] ?? 'backlog';
  const ordered = [...cards].sort((a, b) => a.position - b.position);
  for (const row of ordered) {
    const col = orderedColumns.includes(row.column_id) ? row.column_id : fallbackColumnId;
    buckets[col]!.push(row.id);
  }
  return buckets;
}
