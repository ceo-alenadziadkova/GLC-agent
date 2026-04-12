/**
 * Consultant Intake trace tool — telemetry + wording draft persistence.
 * POST /api/intake-trace-tool/analytics-events
 * GET  /api/intake-trace-tool/wording-drafts
 * PUT  /api/intake-trace-tool/wording-drafts
 * POST /api/intake-trace-tool/wording-drafts/publish
 * POST /api/intake-trace-tool/wording-drafts/rollback
 * GET  /api/intake-trace-tool/wording-publication-log
 */
import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, attachProfile, requireRole, type AuthRequest } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rate-limit.js';
import { logger } from '../services/logger.js';
import { REQUEST_FIELD_LIMITS } from '../config/request-field-limits.js';
import {
  intakeTraceToolAnalyticsBatchSchema,
  intakeTraceToolWordingDraftsPutSchema,
  intakeTraceToolWordingPublishSchema,
  intakeTraceToolWordingRollbackSchema,
  intakeTraceToolPublicationLogQuerySchema,
} from '../schemas/intake-trace-tool.js';
import { INTAKE_TRACE_TOOL_ANALYTICS_SURFACE } from '../config/intake-trace-tool-surface.js';
import {
  API_ERROR_CODES,
  INTAKE_TRACE_ANALYTICS_ACCEPT_FAILED_MESSAGE,
  INTAKE_TRACE_ANALYTICS_PAYLOAD_INVALID_MESSAGE,
  INTAKE_TRACE_ANALYTICS_STORE_FAILED_MESSAGE,
  INTAKE_TRACE_PUBLICATION_LOG_FAILED_MESSAGE,
  INTAKE_TRACE_PUBLICATION_LOG_QUERY_INVALID_MESSAGE,
  INTAKE_TRACE_PUBLISH_FAILED_MESSAGE,
  INTAKE_TRACE_PUBLISH_PAYLOAD_INVALID_MESSAGE,
  INTAKE_TRACE_ROLLBACK_FAILED_MESSAGE,
  INTAKE_TRACE_ROLLBACK_PAYLOAD_INVALID_MESSAGE,
  INTAKE_TRACE_WORDING_LOAD_FAILED_MESSAGE,
  INTAKE_TRACE_WORDING_PAYLOAD_INVALID_MESSAGE,
  INTAKE_TRACE_WORDING_SAVE_FAILED_MESSAGE,
  INTAKE_TRACE_WORDING_UPDATE_FAILED_MESSAGE,
  apiErrorJson,
} from '../config/api-error-codes.js';

export const intakeTraceToolRouter = Router();

async function readWordingDraftsMaps(userId: string): Promise<{ drafts: Record<string, string>; published: Record<string, string> }> {
  const { data, error } = await supabase
    .from('intake_question_wording_drafts')
    .select('question_id, draft_text, published_text')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  const drafts: Record<string, string> = {};
  const published: Record<string, string> = {};
  for (const row of data ?? []) {
    const qid = row.question_id as string;
    if (typeof row.draft_text === 'string') drafts[qid] = row.draft_text;
    if (typeof row.published_text === 'string' && row.published_text.trim().length > 0) {
      published[qid] = row.published_text;
    }
  }
  return { drafts, published };
}

intakeTraceToolRouter.use(requireAuth);
intakeTraceToolRouter.use(attachProfile);
intakeTraceToolRouter.use(requireRole('consultant'));
intakeTraceToolRouter.use(generalLimiter);

intakeTraceToolRouter.post('/analytics-events', async (req: AuthRequest, res) => {
  try {
    const parsed = intakeTraceToolAnalyticsBatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(
        apiErrorJson(
          API_ERROR_CODES.INTAKE_TRACE_ANALYTICS_PAYLOAD_INVALID,
          INTAKE_TRACE_ANALYTICS_PAYLOAD_INVALID_MESSAGE,
          parsed.error.flatten(),
        ),
      );
      return;
    }
    const body = parsed.data;
    const userId = req.userId!;

    const metaPayload = {
      ...(body.ia_v2_enabled !== undefined ? { ia_v2_enabled: body.ia_v2_enabled } : {}),
    };

    const rows = body.events.map(e => ({
      surface: INTAKE_TRACE_TOOL_ANALYTICS_SURFACE,
      event_type: e.event_type,
      client_session_id: body.client_session_id,
      user_id: userId,
      audit_id: null,
      question_id:
        typeof e.payload?.question_id === 'string'
          ? (e.payload.question_id as string).slice(0, REQUEST_FIELD_LIMITS.traceQuestionIdMax)
          : null,
      step_index: typeof e.payload?.step_index === 'number' && Number.isFinite(e.payload.step_index)
        ? Math.max(
            0,
            Math.min(REQUEST_FIELD_LIMITS.intakeAnalyticsStepIndexMax, Math.round(e.payload.step_index)),
          )
        : null,
      intake_versions: Object.keys(metaPayload).length > 0 ? metaPayload : null,
      client_ts: e.client_ts ?? null,
      payload: e.payload && Object.keys(e.payload).length > 0 ? e.payload : null,
    }));

    const { error } = await supabase.from('intake_analytics_events').insert(rows);
    if (error) {
      logger.error('intake_trace_tool.analytics_insert_failed', { error: error.message });
      res
        .status(500)
        .json(
          apiErrorJson(
            API_ERROR_CODES.INTAKE_TRACE_ANALYTICS_STORE_FAILED,
            INTAKE_TRACE_ANALYTICS_STORE_FAILED_MESSAGE,
          ),
        );
      return;
    }

    res.status(200).json({ ok: true as const, received: rows.length });
  } catch (err) {
    const e = err as Error;
    logger.error('intake_trace_tool.analytics_failed', { error: e.message, stack: e.stack });
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.INTAKE_TRACE_ANALYTICS_ACCEPT_FAILED,
          INTAKE_TRACE_ANALYTICS_ACCEPT_FAILED_MESSAGE,
        ),
      );
  }
});

intakeTraceToolRouter.get('/wording-drafts', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { data, error } = await supabase
      .from('intake_question_wording_drafts')
      .select('question_id, draft_text, published_text')
      .eq('user_id', userId);

    if (error) {
      logger.error('intake_trace_tool.wording_drafts_get_failed', { error: error.message });
      res
        .status(500)
        .json(
          apiErrorJson(
            API_ERROR_CODES.INTAKE_TRACE_WORDING_LOAD_FAILED,
            INTAKE_TRACE_WORDING_LOAD_FAILED_MESSAGE,
          ),
        );
      return;
    }

    const drafts: Record<string, string> = {};
    const published: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.question_id && typeof row.draft_text === 'string') {
        drafts[row.question_id] = row.draft_text;
      }
      if (
        row.question_id &&
        typeof row.published_text === 'string' &&
        row.published_text.trim().length > 0
      ) {
        published[row.question_id] = row.published_text;
      }
    }
    res.json({ ok: true as const, drafts, published });
  } catch (err) {
    const e = err as Error;
    logger.error('intake_trace_tool.wording_drafts_get_exception', { error: e.message });
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.INTAKE_TRACE_WORDING_LOAD_FAILED,
          INTAKE_TRACE_WORDING_LOAD_FAILED_MESSAGE,
        ),
      );
  }
});

intakeTraceToolRouter.put('/wording-drafts', async (req: AuthRequest, res) => {
  try {
    const parsed = intakeTraceToolWordingDraftsPutSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(
        apiErrorJson(
          API_ERROR_CODES.INTAKE_TRACE_WORDING_PAYLOAD_INVALID,
          INTAKE_TRACE_WORDING_PAYLOAD_INVALID_MESSAGE,
          parsed.error.flatten(),
        ),
      );
      return;
    }
    const body = parsed.data;
    const userId = req.userId!;

    const upserts: Array<{ user_id: string; question_id: string; draft_text: string; updated_at: string }> = [];
    const deleteIds: string[] = [];

    for (const [qid, text] of Object.entries(body.drafts)) {
      if (text.trim().length === 0) {
        deleteIds.push(qid);
      } else {
        upserts.push({
          user_id: userId,
          question_id: qid,
          draft_text: text,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (deleteIds.length > 0) {
      const { error: delErr } = await supabase
        .from('intake_question_wording_drafts')
        .delete()
        .eq('user_id', userId)
        .in('question_id', deleteIds);
      if (delErr) {
        logger.error('intake_trace_tool.wording_drafts_delete_failed', { error: delErr.message });
        res
          .status(500)
          .json(
            apiErrorJson(
              API_ERROR_CODES.INTAKE_TRACE_WORDING_UPDATE_FAILED,
              INTAKE_TRACE_WORDING_UPDATE_FAILED_MESSAGE,
            ),
          );
        return;
      }
    }

    if (body.replace_all === true) {
      const keep = new Set(Object.keys(body.drafts).filter(k => body.drafts[k]!.trim().length > 0));
      const { data: existing, error: listErr } = await supabase
        .from('intake_question_wording_drafts')
        .select('question_id')
        .eq('user_id', userId);

      if (listErr) {
        logger.error('intake_trace_tool.wording_drafts_list_failed', { error: listErr.message });
        res
          .status(500)
          .json(
            apiErrorJson(
              API_ERROR_CODES.INTAKE_TRACE_WORDING_UPDATE_FAILED,
              INTAKE_TRACE_WORDING_UPDATE_FAILED_MESSAGE,
            ),
          );
        return;
      }

      const toRemove = (existing ?? [])
        .map(r => r.question_id as string)
        .filter(qid => !keep.has(qid));

      if (toRemove.length > 0) {
        const { error: bulkDelErr } = await supabase
          .from('intake_question_wording_drafts')
          .delete()
          .eq('user_id', userId)
          .in('question_id', toRemove);
        if (bulkDelErr) {
          logger.error('intake_trace_tool.wording_drafts_bulk_delete_failed', { error: bulkDelErr.message });
          res
            .status(500)
            .json(
              apiErrorJson(
                API_ERROR_CODES.INTAKE_TRACE_WORDING_UPDATE_FAILED,
                INTAKE_TRACE_WORDING_UPDATE_FAILED_MESSAGE,
              ),
            );
          return;
        }
      }
    }

    if (upserts.length > 0) {
      const { error: upErr } = await supabase
        .from('intake_question_wording_drafts')
        .upsert(upserts, { onConflict: 'user_id,question_id' });
      if (upErr) {
        logger.error('intake_trace_tool.wording_drafts_upsert_failed', { error: upErr.message });
        res
          .status(500)
          .json(
            apiErrorJson(
              API_ERROR_CODES.INTAKE_TRACE_WORDING_SAVE_FAILED,
              INTAKE_TRACE_WORDING_SAVE_FAILED_MESSAGE,
            ),
          );
        return;
      }
    }

    try {
      const { drafts, published } = await readWordingDraftsMaps(userId);
      res.json({ ok: true as const, drafts, published });
    } catch (readErr) {
      const e = readErr as Error;
      logger.error('intake_trace_tool.wording_drafts_readback_failed', { error: e.message });
      res.status(200).json({ ok: true as const, drafts: {}, published: {} });
    }
  } catch (err) {
    const e = err as Error;
    logger.error('intake_trace_tool.wording_drafts_put_exception', { error: e.message });
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.INTAKE_TRACE_WORDING_SAVE_FAILED,
          INTAKE_TRACE_WORDING_SAVE_FAILED_MESSAGE,
        ),
      );
  }
});

intakeTraceToolRouter.post('/wording-drafts/publish', async (req: AuthRequest, res) => {
  try {
    const parsed = intakeTraceToolWordingPublishSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(
        apiErrorJson(
          API_ERROR_CODES.INTAKE_TRACE_PUBLISH_PAYLOAD_INVALID,
          INTAKE_TRACE_PUBLISH_PAYLOAD_INVALID_MESSAGE,
          parsed.error.flatten(),
        ),
      );
      return;
    }
    const userId = req.userId!;
    const filterIds = parsed.data.question_ids;

    const { data: rows, error: listErr } = await supabase
      .from('intake_question_wording_drafts')
      .select('question_id, draft_text')
      .eq('user_id', userId);

    if (listErr) {
      logger.error('intake_trace_tool.wording_publish_list_failed', { error: listErr.message });
      res
        .status(500)
        .json(
          apiErrorJson(API_ERROR_CODES.INTAKE_TRACE_PUBLISH_FAILED, INTAKE_TRACE_PUBLISH_FAILED_MESSAGE),
        );
      return;
    }

    const filterSet = filterIds && filterIds.length > 0 ? new Set(filterIds) : null;
    const targets = (rows ?? [])
      .map(r => ({
        question_id: r.question_id as string,
        draft_text: typeof r.draft_text === 'string' ? r.draft_text : '',
      }))
      .filter(r => r.draft_text.trim().length > 0)
      .filter(r => !filterSet || filterSet.has(r.question_id));

    const nowIso = new Date().toISOString();
    for (const t of targets) {
      const { error: upErr } = await supabase
        .from('intake_question_wording_drafts')
        .update({ published_text: t.draft_text, published_at: nowIso, updated_at: nowIso })
        .eq('user_id', userId)
        .eq('question_id', t.question_id);
      if (upErr) {
        logger.error('intake_trace_tool.wording_publish_update_failed', { error: upErr.message });
        res
          .status(500)
          .json(
            apiErrorJson(API_ERROR_CODES.INTAKE_TRACE_PUBLISH_FAILED, INTAKE_TRACE_PUBLISH_FAILED_MESSAGE),
          );
        return;
      }
    }

    const appliedIds = targets.map(t => t.question_id);
    if (appliedIds.length > 0) {
      const { error: logErr } = await supabase.from('intake_wording_publication_log').insert({
        user_id: userId,
        action: 'publish',
        question_ids: appliedIds,
      });
      if (logErr) {
        logger.error('intake_trace_tool.wording_publish_log_failed', { error: logErr.message });
      }
    }

    const { drafts, published } = await readWordingDraftsMaps(userId);
    res.json({ ok: true as const, drafts, published, applied_to: appliedIds });
  } catch (err) {
    const e = err as Error;
    logger.error('intake_trace_tool.wording_publish_exception', { error: e.message });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.INTAKE_TRACE_PUBLISH_FAILED, INTAKE_TRACE_PUBLISH_FAILED_MESSAGE));
  }
});

intakeTraceToolRouter.post('/wording-drafts/rollback', async (req: AuthRequest, res) => {
  try {
    const parsed = intakeTraceToolWordingRollbackSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(
        apiErrorJson(
          API_ERROR_CODES.INTAKE_TRACE_ROLLBACK_PAYLOAD_INVALID,
          INTAKE_TRACE_ROLLBACK_PAYLOAD_INVALID_MESSAGE,
          parsed.error.flatten(),
        ),
      );
      return;
    }
    const userId = req.userId!;
    const filterIds = parsed.data.question_ids;

    const { data: rows, error: listErr } = await supabase
      .from('intake_question_wording_drafts')
      .select('question_id, published_text')
      .eq('user_id', userId)
      .not('published_text', 'is', null);

    if (listErr) {
      logger.error('intake_trace_tool.wording_rollback_list_failed', { error: listErr.message });
      res
        .status(500)
        .json(
          apiErrorJson(API_ERROR_CODES.INTAKE_TRACE_ROLLBACK_FAILED, INTAKE_TRACE_ROLLBACK_FAILED_MESSAGE),
        );
      return;
    }

    const filterSet = filterIds && filterIds.length > 0 ? new Set(filterIds) : null;
    const targets = (rows ?? [])
      .map(r => ({
        question_id: r.question_id as string,
        published_text: typeof r.published_text === 'string' ? r.published_text : '',
      }))
      .filter(r => r.published_text.trim().length > 0)
      .filter(r => !filterSet || filterSet.has(r.question_id));

    const nowIso = new Date().toISOString();
    for (const t of targets) {
      const { error: upErr } = await supabase
        .from('intake_question_wording_drafts')
        .update({ draft_text: t.published_text, updated_at: nowIso })
        .eq('user_id', userId)
        .eq('question_id', t.question_id);
      if (upErr) {
        logger.error('intake_trace_tool.wording_rollback_update_failed', { error: upErr.message });
        res
          .status(500)
          .json(
            apiErrorJson(API_ERROR_CODES.INTAKE_TRACE_ROLLBACK_FAILED, INTAKE_TRACE_ROLLBACK_FAILED_MESSAGE),
          );
        return;
      }
    }

    const appliedIds = targets.map(t => t.question_id);
    if (appliedIds.length > 0) {
      const { error: logErr } = await supabase.from('intake_wording_publication_log').insert({
        user_id: userId,
        action: 'rollback',
        question_ids: appliedIds,
      });
      if (logErr) {
        logger.error('intake_trace_tool.wording_rollback_log_failed', { error: logErr.message });
      }
    }

    const { drafts, published } = await readWordingDraftsMaps(userId);
    res.json({ ok: true as const, drafts, published, applied_to: appliedIds });
  } catch (err) {
    const e = err as Error;
    logger.error('intake_trace_tool.wording_rollback_exception', { error: e.message });
    res
      .status(500)
      .json(
        apiErrorJson(API_ERROR_CODES.INTAKE_TRACE_ROLLBACK_FAILED, INTAKE_TRACE_ROLLBACK_FAILED_MESSAGE),
      );
  }
});

intakeTraceToolRouter.get('/wording-publication-log', async (req: AuthRequest, res) => {
  try {
    const parsed = intakeTraceToolPublicationLogQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      res.status(400).json(
        apiErrorJson(
          API_ERROR_CODES.INTAKE_TRACE_PUBLICATION_LOG_QUERY_INVALID,
          INTAKE_TRACE_PUBLICATION_LOG_QUERY_INVALID_MESSAGE,
          parsed.error.flatten(),
        ),
      );
      return;
    }
    const userId = req.userId!;
    const { limit } = parsed.data;

    const { data, error } = await supabase
      .from('intake_wording_publication_log')
      .select('id, action, question_ids, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('intake_trace_tool.wording_publication_log_failed', { error: error.message });
      res
        .status(500)
        .json(
          apiErrorJson(
            API_ERROR_CODES.INTAKE_TRACE_PUBLICATION_LOG_FAILED,
            INTAKE_TRACE_PUBLICATION_LOG_FAILED_MESSAGE,
          ),
        );
      return;
    }

    const entries = (data ?? []).map(row => ({
      id: row.id as string,
      action: row.action as 'publish' | 'rollback',
      question_ids: Array.isArray(row.question_ids) ? (row.question_ids as string[]) : [],
      created_at: row.created_at as string,
    }));

    res.json({ ok: true as const, entries });
  } catch (err) {
    const e = err as Error;
    logger.error('intake_trace_tool.wording_publication_log_exception', { error: e.message });
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.INTAKE_TRACE_PUBLICATION_LOG_FAILED,
          INTAKE_TRACE_PUBLICATION_LOG_FAILED_MESSAGE,
        ),
      );
  }
});
