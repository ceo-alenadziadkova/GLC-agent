import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_ACCESS_DENIED_MESSAGE,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  pipelinePhaseOutOfRangeMessage,
} from '../../../config/api-error-codes.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import {
  DomainPhaseResultPatchSchema,
  StrategyPhaseResultPatchSchema,
} from '../../../schemas/pipeline-phase-result-edit.js';
import { logger } from '../../../services/logger.js';
import { mergeStrategyInitiativeArrays } from '../../../services/pipeline/merge-strategy-phase-initiative-patches.js';
import { resolveAuditPlanBoardAccess } from '../../../services/plan-board/plan-board-access.js';
import { supabase } from '../../../services/supabase.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

function parsePhaseNumber(raw: string | undefined): number | null {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 1 || parsed > 7) return null;
  return parsed;
}

export async function patchPipelinePhaseResultController(req: AuthRequest, res: Response) {
  const auditId = req.params.id as string;
  const phaseParam = req.params.phase;
  const phaseStr = Array.isArray(phaseParam) ? phaseParam[0] : phaseParam;
  const phase = parsePhaseNumber(phaseStr);

  try {
    if (phase == null) {
      sendApiError(
        res,
        400,
        API_ERROR_CODES.PIPELINE_PHASE_OUT_OF_RANGE,
        pipelinePhaseOutOfRangeMessage(1, 7),
        {
          min: 1,
          max: 7,
        },
      );
      return;
    }

    const bodyUnknown = req.body as unknown;
    if (bodyUnknown == null || typeof bodyUnknown !== 'object' || Array.isArray(bodyUnknown)) {
      sendApiError(res, 400, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID, 'invalid_body');
      return;
    }
    const rawResult = (bodyUnknown as Record<string, unknown>).result;
    if (rawResult == null || typeof rawResult !== 'object' || Array.isArray(rawResult)) {
      sendApiError(res, 400, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID, 'invalid_body');
      return;
    }

    const access = await resolveAuditPlanBoardAccess({ auditId, userId: req.userId!, userRole: req.userRole });
    if (!access.ok) {
      sendApiError(
        res,
        access.reason === 'denied' ? 403 : 404,
        API_ERROR_CODES.AUDITS_NOT_FOUND,
        AUDITS_NOT_FOUND_MESSAGE,
      );
      return;
    }
    if (access.kind === 'client') {
      sendApiError(res, 403, API_ERROR_CODES.AUDITS_ACCESS_DENIED, AUDITS_ACCESS_DENIED_MESSAGE);
      return;
    }

    if (phase === 7) {
      const strategyPatchParsed = StrategyPhaseResultPatchSchema.safeParse(rawResult);
      if (!strategyPatchParsed.success) {
        sendApiError(res, 400, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID, 'invalid_strategy_body');
        return;
      }
      const patch = strategyPatchParsed.data;
      const updatePayload: Record<string, unknown> = {};
      if (patch.executive_summary != null) updatePayload.executive_summary = patch.executive_summary;

      const needsInitiativeMerge =
        patch.quick_wins != null || patch.medium_term != null || patch.strategic != null;
      if (needsInitiativeMerge) {
        const { data: strategyRow, error: strategyFetchErr } = await supabase
          .from('audit_strategy')
          .select('quick_wins, medium_term, strategic')
          .eq('audit_id', auditId)
          .maybeSingle();
        if (strategyFetchErr || !strategyRow) {
          logger.error('route.patch_pipeline_phase_result_strategy_row_missing', {
            auditId,
            phase,
            error: strategyFetchErr?.message,
          });
          sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
          return;
        }
        const merged = mergeStrategyInitiativeArrays({
          currentQuickWins: strategyRow.quick_wins,
          currentMediumTerm: strategyRow.medium_term,
          currentStrategic: strategyRow.strategic,
          patch,
        });
        if (merged.quick_wins != null) updatePayload.quick_wins = merged.quick_wins;
        if (merged.medium_term != null) updatePayload.medium_term = merged.medium_term;
        if (merged.strategic != null) updatePayload.strategic = merged.strategic;
      }

      if (Object.keys(updatePayload).length === 0) {
        res.json({ ok: true, phase_number: phase, updated: false });
        return;
      }
      const { error } = await supabase.from('audit_strategy').update(updatePayload).eq('audit_id', auditId);
      if (error) {
        logger.error('route.patch_pipeline_phase_result_strategy_failed', { auditId, phase, error: error.message });
        sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
        return;
      }
      res.json({ ok: true, phase_number: phase, updated: true });
      return;
    }

    const domainPatchParsed = DomainPhaseResultPatchSchema.safeParse(rawResult);
    if (!domainPatchParsed.success) {
      sendApiError(res, 400, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID, 'invalid_domain_body');
      return;
    }
    const patch = domainPatchParsed.data;
    const updatePayload: Record<string, unknown> = {};
    if (patch.label != null) updatePayload.label = patch.label;
    if (patch.summary != null) updatePayload.summary = patch.summary;
    if (patch.strengths != null) updatePayload.strengths = patch.strengths;
    if (patch.weaknesses != null) updatePayload.weaknesses = patch.weaknesses;
    if (patch.issues != null) updatePayload.issues = patch.issues;
    if (patch.quick_wins != null) updatePayload.quick_wins = patch.quick_wins;
    if (patch.recommendations != null) updatePayload.recommendations = patch.recommendations;
    if (Object.keys(updatePayload).length === 0) {
      res.json({ ok: true, phase_number: phase, updated: false });
      return;
    }

    const { error } = await supabase
      .from('audit_domains')
      .update(updatePayload)
      .eq('audit_id', auditId)
      .eq('phase_number', phase);
    if (error) {
      logger.error('route.patch_pipeline_phase_result_domain_failed', { auditId, phase, error: error.message });
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
      return;
    }

    res.json({ ok: true, phase_number: phase, updated: true });
  } catch (err) {
    const error = err as Error;
    logger.error('route.patch_pipeline_phase_result_unhandled', { auditId, phase, error: error.message });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
  }
}
