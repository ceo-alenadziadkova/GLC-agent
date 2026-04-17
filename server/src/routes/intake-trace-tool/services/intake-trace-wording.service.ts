import { mapDraftRowsToMaps, mapRowsToWordingActionTargets } from '../mappers/intake-trace-db.mapper.js';
import { WORDING_ACTIONS, type WordingAction } from '../domain/wording-actions.js';
import { logger } from '../../../services/logger.js';
import {
  applyWordingActionBatchUpdates,
  applyWordingActionRpcBatch,
  deleteWordingDraftsByQuestionIds,
  insertWordingPublicationLog,
  listWordingActionSourceRows,
  listWordingDraftRows,
  listWordingQuestionIds,
  upsertWordingDrafts,
} from '../repositories/intake-trace-wording.repository.js';

type SaveDraftInput = {
  userId: string;
  drafts: Record<string, string>;
  replaceAll?: boolean;
};

export async function loadWordingDraftMaps(userId: string): Promise<{
  drafts: Record<string, string>;
  published: Record<string, string>;
}> {
  const rows = await listWordingDraftRows(userId);
  return mapDraftRowsToMaps(rows);
}

export async function saveWordingDrafts(input: SaveDraftInput): Promise<{
  drafts: Record<string, string>;
  published: Record<string, string>;
}> {
  const { userId, drafts, replaceAll } = input;
  const upserts: Array<{ user_id: string; question_id: string; draft_text: string; updated_at: string }> = [];
  const deleteIds: string[] = [];

  for (const [questionId, text] of Object.entries(drafts)) {
    if (text.trim().length === 0) {
      deleteIds.push(questionId);
    } else {
      upserts.push({
        user_id: userId,
        question_id: questionId,
        draft_text: text,
        updated_at: new Date().toISOString(),
      });
    }
  }

  await deleteWordingDraftsByQuestionIds(userId, deleteIds);

  if (replaceAll === true) {
    const keep = new Set(Object.entries(drafts).filter(([, text]) => text.trim().length > 0).map(([questionId]) => questionId));
    const existingIds = await listWordingQuestionIds(userId);
    const toRemove = existingIds.filter(questionId => !keep.has(questionId));
    await deleteWordingDraftsByQuestionIds(userId, toRemove);
  }

  await upsertWordingDrafts(upserts);
  return loadWordingDraftMaps(userId);
}

export async function applyWordingAction(input: {
  userId: string;
  action: WordingAction;
  questionIds?: string[];
}): Promise<{
  drafts: Record<string, string>;
  published: Record<string, string>;
  applied_to: string[];
}> {
  const { userId, action, questionIds } = input;
  const sourceRows = await listWordingActionSourceRows(userId, action);
  const filterSet = questionIds && questionIds.length > 0 ? new Set(questionIds) : null;
  const targets = mapRowsToWordingActionTargets(sourceRows).filter(row => !filterSet || filterSet.has(row.questionId));

  const nowIso = new Date().toISOString();
  const targetIds = targets.map(target => target.questionId);
  const rpcResult = await applyWordingActionRpcBatch(userId, action, targetIds, nowIso);
  let appliedIds: string[];
  if (rpcResult.status === 'fallback') {
    logger.warn('intake_trace_tool.wording_action_rpc_fallback', {
      user_id: userId,
      action,
      reason: rpcResult.reason,
    });
    await applyWordingActionBatchUpdates(userId, action, targets, nowIso);
    appliedIds = targetIds;
    await insertWordingPublicationLog(userId, action, appliedIds);
  } else {
    appliedIds = rpcResult.appliedIds;
  }

  const { drafts, published } = await loadWordingDraftMaps(userId);
  return { drafts, published, applied_to: appliedIds };
}

export async function publishWordingDrafts(input: {
  userId: string;
  questionIds?: string[];
}): Promise<{ drafts: Record<string, string>; published: Record<string, string>; applied_to: string[] }> {
  return applyWordingAction({ ...input, action: WORDING_ACTIONS.publish });
}

export async function rollbackWordingDrafts(input: {
  userId: string;
  questionIds?: string[];
}): Promise<{ drafts: Record<string, string>; published: Record<string, string>; applied_to: string[] }> {
  return applyWordingAction({ ...input, action: WORDING_ACTIONS.rollback });
}
