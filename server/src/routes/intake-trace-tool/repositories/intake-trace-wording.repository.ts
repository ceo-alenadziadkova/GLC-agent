import { supabase } from '../../../services/supabase.js';
import { INTAKE_TRACE_TOOL_RPC } from '../../../config/intake-trace-tool-rpc.js';
import { INTAKE_TRACE_TOOL_POLICY } from '../config/intake-trace-tool-policy.js';
import type { WordingAction } from '../domain/wording-actions.js';
import type { WordingDraftRow } from '../domain/wording-draft.types.js';

export type DraftUpsertRow = {
  user_id: string;
  question_id: string;
  draft_text: string;
  updated_at: string;
};

export async function listWordingDraftRows(userId: string): Promise<WordingDraftRow[]> {
  const { data, error } = await supabase
    .from('intake_question_wording_drafts')
    .select('question_id, draft_text, published_text')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as WordingDraftRow[];
}

export async function listWordingQuestionIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('intake_question_wording_drafts')
    .select('question_id')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map(row => row.question_id as string | null)
    .filter((questionId): questionId is string => typeof questionId === 'string');
}

export async function deleteWordingDraftsByQuestionIds(userId: string, questionIds: string[]): Promise<void> {
  if (questionIds.length === 0) return;
  const { error } = await supabase
    .from('intake_question_wording_drafts')
    .delete()
    .eq('user_id', userId)
    .in('question_id', questionIds);
  if (error) throw new Error(error.message);
}

export async function upsertWordingDrafts(rows: DraftUpsertRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase
    .from('intake_question_wording_drafts')
    .upsert(rows, { onConflict: 'user_id,question_id' });
  if (error) throw new Error(error.message);
}

export async function listWordingActionSourceRows(
  userId: string,
  action: WordingAction,
): Promise<Array<{ question_id: string | null; source_text: string | null }>> {
  const sourceColumn = action === 'publish' ? 'draft_text' : 'published_text';
  const { data, error } = await supabase
    .from('intake_question_wording_drafts')
    .select(`question_id, ${sourceColumn}`)
    .eq('user_id', userId)
    .not(sourceColumn, 'is', null);
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    question_id: (row as { question_id?: string | null }).question_id ?? null,
    source_text: (row as Record<string, unknown>)[sourceColumn] as string | null,
  }));
}

type WordingActionUpdateTarget = {
  questionId: string;
  text: string;
};

type RpcBatchSuccess = {
  status: 'ok';
  appliedIds: string[];
};

type RpcBatchFallback = {
  status: 'fallback';
  reason: string;
};

export type WordingRpcBatchResult = RpcBatchSuccess | RpcBatchFallback;

function buildWordingPatch(action: WordingAction, text: string, nowIso: string) {
  return action === 'publish'
    ? { published_text: text, published_at: nowIso, updated_at: nowIso }
    : { draft_text: text, updated_at: nowIso };
}

function isRpcFallbackError(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? '';
  const message = (error.message ?? '').toLowerCase();
  if (code === '42883') return true; // undefined_function
  if (code === '42501') return true; // insufficient_privilege
  if (code === 'PGRST202') return true; // PostgREST function not found
  if (message.includes('function') && message.includes('not found')) return true;
  if (message.includes('permission denied')) return true;
  return false;
}

export async function applyWordingActionBatchUpdates(
  userId: string,
  action: WordingAction,
  targets: WordingActionUpdateTarget[],
  nowIso: string,
): Promise<void> {
  if (targets.length === 0) return;

  const batchSize = INTAKE_TRACE_TOOL_POLICY.wordingActionUpdateBatchSize;
  for (let idx = 0; idx < targets.length; idx += batchSize) {
    const batch = targets.slice(idx, idx + batchSize);
    await Promise.all(
      batch.map(async target => {
        const { error } = await supabase
          .from('intake_question_wording_drafts')
          .update(buildWordingPatch(action, target.text, nowIso))
          .eq('user_id', userId)
          .eq('question_id', target.questionId);
        if (error) throw new Error(error.message);
      }),
    );
  }
}

export async function applyWordingActionRpcBatch(
  userId: string,
  action: WordingAction,
  questionIds: string[],
  nowIso: string,
): Promise<WordingRpcBatchResult> {
  const rpcQuestionIds = questionIds.length > 0 ? questionIds : null;
  const { data, error } = await supabase.rpc(INTAKE_TRACE_TOOL_RPC.applyWordingActionBatch, {
    p_user_id: userId,
    p_action: action,
    p_question_ids: rpcQuestionIds,
    p_now: nowIso,
  });
  if (error) {
    const rpcError = error as { code?: string; message?: string };
    if (isRpcFallbackError(rpcError)) {
      return { status: 'fallback', reason: rpcError.message ?? 'rpc_unavailable' };
    }
    throw new Error(rpcError.message ?? 'intake wording action rpc failed');
  }
  if (!Array.isArray(data)) return { status: 'ok', appliedIds: [] };
  const appliedIds = data
    .map(row => (row as { question_id?: unknown }).question_id)
    .filter((questionId): questionId is string => typeof questionId === 'string');
  return { status: 'ok', appliedIds };
}

export async function insertWordingPublicationLog(
  userId: string,
  action: WordingAction,
  questionIds: string[],
): Promise<void> {
  if (questionIds.length === 0) return;
  const { error } = await supabase.from('intake_wording_publication_log').insert({
    user_id: userId,
    action,
    question_ids: questionIds,
  });
  if (error) throw new Error(error.message);
}

