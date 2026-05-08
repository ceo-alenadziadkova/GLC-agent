import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import {
  isManifestDraftRevisionsFromBoardEnabled,
  isOrchestrationPackApiEnabled,
  isPlanBoardCustomColumnsFeatureEnabled,
} from '../../../config/feature-flags.js';
import { isPlanBoardOperationalReadOnlyPack } from '../../../config/plan-board-operational-policy.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { fetchPersistedGlcOrchestrationPackForUser } from '../../../services/orchestration/orchestration-read.service.js';
import { buildPlanBoardTimelineParity } from '../../../services/orchestration/orchestrator-timeline-read.service.js';
import { resolveAuditPlanBoardAccess } from '../../../services/plan-board/plan-board-access.js';
import { filterPlanBoardCardsForClientView } from '../../../services/plan-board/plan-board-client-view.js';
import {
  digestManifestDraftRevisions,
  listManifestDraftRevisionsForAudit,
} from '../../../services/orchestration/manifest-draft-revision.service.js';
import { listPlanBoardCardsForAudit } from '../../../services/plan-board/plan-board-cards.service.js';
import {
  buildDefaultResolvedPlanBoardPolicy,
  resolvePlanBoardPolicyForAuditId,
} from '../../../services/plan-board/plan-board-column-policy.service.js';
import { logger } from '../../../services/logger.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function getPlanBoardController(req: AuthRequest, res: Response) {
  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }

    const auditId = req.params.id as string;
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

    const persisted = await fetchPersistedGlcOrchestrationPackForUser({
      auditId,
      userId: req.userId!,
    });
    if (persisted.status !== 'ok') {
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
      return;
    }

    const featureCustomColumns = isPlanBoardCustomColumnsFeatureEnabled();
    const policyCtx = await resolvePlanBoardPolicyForAuditId({
      auditId,
      featureEnabled: featureCustomColumns,
    });
    const boardColumnPolicy = policyCtx?.resolved ?? buildDefaultResolvedPlanBoardPolicy();
    const columnsPayload = boardColumnPolicy.columns.map((c) => ({
      id: c.id,
      title: c.title,
      semantic: c.semantic,
      visible_to_client: c.visible_to_client,
    }));

    const columnPolicyCapabilities =
      access.kind === 'consultant_owner' || access.kind === 'platform_admin' ?
        {
          column_policy_editable:
            featureCustomColumns &&
            ((policyCtx?.ownerPlanBoardCustomColumnsEntitled ?? false) || access.kind === 'platform_admin'),
        }
      : undefined;

    if (!persisted.pack) {
      res.json({
        pack_version_used: persisted.orchestration_pack_version,
        cards: [],
        issues: [{ code: 'no_pack' as const }],
        columns: columnsPayload,
        ...(columnPolicyCapabilities != null ? columnPolicyCapabilities : {}),
      });
      return;
    }

    const metaByNode = new Map(
      persisted.pack.graph.nodes.map((n) => [
        n.id,
        { title: n.title, lane: n.lane as string },
      ]),
    );

    const { cards: rows, error } = await listPlanBoardCardsForAudit({ auditId });
    if (error) {
      logger.error('route.plan_board_list_failed', { auditId, error: error.message });
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
      return;
    }

    const visibleRows =
      access.kind === 'client'
        ? filterPlanBoardCardsForClientView(rows, boardColumnPolicy.clientVisibleColumnIds)
        : rows;

    const cards = visibleRows.map((r) => {
      const nodeId = r.pack_graph_node_id;
      const meta = nodeId ? metaByNode.get(nodeId) : undefined;
      return {
        id: r.id,
        source: r.source,
        column_id: r.column_id,
        position: r.position,
        pinned: r.pinned,
        delivery_area: r.delivery_area,
        canonical_node_key: r.canonical_node_key,
        pack_graph_node_id: r.pack_graph_node_id,
        orphaned_reason: r.orphaned_reason,
        title: r.manual_title ?? meta?.title ?? null,
        lane: r.pack_lane_snapshot ?? meta?.lane ?? null,
        ticket_description: r.ticket_description,
        assignee: r.assignee,
        assignee_user_id: r.assignee_user_id,
        labels: r.labels ?? [],
        story_points: r.story_points,
        priority: r.priority,
        start_date: r.start_date,
        due_date: r.due_date,
        end_date: r.end_date,
        updated_by_user_id: r.updated_by_user_id,
      };
    });

    const governanceBlocked = isPlanBoardOperationalReadOnlyPack(persisted.pack);
    const issues: Array<{ code: 'governance_blocked' }> = governanceBlocked ? [{ code: 'governance_blocked' }] : [];

    let manifest_draft_revision_digest: string | undefined;
    let manifest_draft_revision_pending_canonical_keys: string[] | undefined;
    if (
      isManifestDraftRevisionsFromBoardEnabled()
      && (access.kind === 'consultant_owner' || access.kind === 'platform_admin')
    ) {
      const { rows: draftRows, error: draftErr } = await listManifestDraftRevisionsForAudit({ auditId });
      if (draftErr) {
        logger.warn('route.plan_board_draft_revision_list_failed', {
          auditId,
          error: draftErr.message,
        });
      } else {
        manifest_draft_revision_digest =
          draftRows.length > 0 ? digestManifestDraftRevisions(draftRows) : '';
        manifest_draft_revision_pending_canonical_keys = draftRows.map(r => r.canonical_node_key);
      }
    }

    const parityResult = await buildPlanBoardTimelineParity({
      auditId,
      pack: persisted.pack,
    });
    const timelineParityPayload = 'error' in parityResult ? undefined : parityResult;
    if ('error' in parityResult) {
      logger.warn('route.plan_board_timeline_parity_failed', { auditId, error: parityResult.error.message });
    }

    res.json({
      pack_version_used: persisted.orchestration_pack_version,
      cards,
      issues,
      columns: columnsPayload,
      ...(timelineParityPayload != null ? { timeline_parity: timelineParityPayload } : {}),
      ...(manifest_draft_revision_digest !== undefined
        ? {
            manifest_draft_revision_digest,
            manifest_draft_revision_pending_canonical_keys: manifest_draft_revision_pending_canonical_keys ?? [],
          }
        : {}),
      ...(columnPolicyCapabilities != null ? columnPolicyCapabilities : {}),
    });
  } catch (err) {
    const error = err as Error;
    logger.error('route.plan_board_get_unhandled', { error: error.message });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
  }
}
