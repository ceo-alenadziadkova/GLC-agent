import { Router } from 'express';
import {
  attachProfile,
  rejectGuestFromPortal,
  requireAuth,
  requireRole,
} from '../../middleware/auth.js';
import { createAuditLimiter, generalLimiter } from '../../middleware/rate-limit.js';
import { createAuditController } from './controllers/create-audit.controller.js';
import { listAuditsController } from './controllers/list-audits.controller.js';
import { tokenUsageSummaryController } from './controllers/token-usage-summary.controller.js';
import { patchAuditTokenBudgetController } from './controllers/patch-audit-token-budget.controller.js';
import { getStrategyExecutionPacksController } from './controllers/get-strategy-execution-packs.controller.js';
import { patchStrategyLabContextController } from './controllers/patch-strategy-lab-context.controller.js';
import { postStrategyExecutionPackController } from './controllers/post-strategy-execution-pack.controller.js';
import { postRoadmapManifestSnapshotController } from './controllers/post-roadmap-manifest-snapshot.controller.js';
import { getRoadmapManifestSnapshotsController } from './controllers/get-roadmap-manifest-snapshots.controller.js';
import { getRoadmapManifestSnapshotLatestController } from './controllers/get-roadmap-manifest-snapshot-latest.controller.js';
import { postRoadmapManifestPreviewController } from './controllers/post-roadmap-manifest-preview.controller.js';
import { postOrchestrationPackController } from './controllers/post-orchestration-pack.controller.js';
import { postOrchestrationPackRegenerateController } from './controllers/post-orchestration-pack-regenerate.controller.js';
import { getOrchestrationPackController } from './controllers/get-orchestration-pack.controller.js';
import { getOrchestrationPackDiffController } from './controllers/get-orchestration-pack-diff.controller.js';
import { getOrchestrationPackDiffHistoryController } from './controllers/get-orchestration-pack-diff-history.controller.js';
import { getOrchestrationSprintExportController } from './controllers/get-orchestration-sprint-export.controller.js';
import { postOrchestrationCommercialOfferController } from './controllers/post-orchestration-commercial-offer.controller.js';
import { postOrchestratorPreviewController } from './controllers/post-orchestrator-preview.controller.js';
import { postOrchestratorRunController } from './controllers/post-orchestrator-run.controller.js';
import { getOrchestratorLatestController } from './controllers/get-orchestrator-latest.controller.js';
import { getAuditTimelineController } from './controllers/get-audit-timeline.controller.js';
import { getPlanBoardController } from './controllers/get-plan-board.controller.js';
import { patchPlanBoardCardController } from './controllers/patch-plan-board-card.controller.js';
import { deletePlanBoardCardController } from './controllers/delete-plan-board-card.controller.js';
import { postPlanBoardManualCardController } from './controllers/post-plan-board-manual-card.controller.js';
import { postPlanBoardReconcileController } from './controllers/post-plan-board-reconcile.controller.js';
import { postPlanBoardViewOpenedController } from './controllers/post-plan-board-view-opened.controller.js';
import { patchPipelinePhaseResultController } from './controllers/patch-pipeline-phase-result.controller.js';
import { postDirectorDeepDiveController } from './controllers/post-director-deep-dive.controller.js';
import { getDirectorDeepDiveStatusController } from './controllers/get-director-deep-dive-status.controller.js';
import { getDirectorDeepDiveQuotaController } from './controllers/get-director-deep-dive-quota.controller.js';
import { postSelectedInitiativeController } from './controllers/post-selected-initiative.controller.js';
import { getAuditController } from './controllers/get-audit.controller.js';
import { upgradeFromSnapshotController } from './controllers/upgrade-snapshot.controller.js';
import { deleteAuditController } from './controllers/delete-audit.controller.js';
import { getBriefSchemaController } from './controllers/brief/get-brief-schema.controller.js';
import { postBriefAnalyticsController } from './controllers/brief/post-brief-analytics.controller.js';
import { getBriefController } from './controllers/brief/get-brief.controller.js';
import { postBriefHelpRequestController } from './controllers/brief/post-brief-help-request.controller.js';
import { postBriefCloneFromController } from './controllers/brief/post-brief-clone-from.controller.js';
import { putBriefController } from './controllers/brief/put-brief.controller.js';
import { postBriefIntelligenceSnapshotController } from './controllers/brief/post-brief-intelligence-snapshot.controller.js';
import { postBriefIntelligenceWordingController } from './controllers/brief/post-brief-intelligence-wording.controller.js';
import { getClientProjectContextController } from './controllers/get-client-project-context.controller.js';
import { getIntakeFollowupSuggestionsController } from './controllers/get-intake-followup-suggestions.controller.js';

export const auditsRouter = Router();

auditsRouter.use(requireAuth);
auditsRouter.use(generalLimiter);

const consultantGuard = [attachProfile, requireRole('consultant')] as const;

auditsRouter.post('/', attachProfile, createAuditLimiter, createAuditController);
auditsRouter.get('/', attachProfile, rejectGuestFromPortal, listAuditsController);
auditsRouter.get(
  '/token-usage-summary',
  ...consultantGuard,
  rejectGuestFromPortal,
  tokenUsageSummaryController,
);
auditsRouter.patch(
  '/:id/token-budget',
  ...consultantGuard,
  rejectGuestFromPortal,
  patchAuditTokenBudgetController,
);
auditsRouter.post(
  '/:id/strategy/execution-pack',
  attachProfile,
  rejectGuestFromPortal,
  postStrategyExecutionPackController,
);
auditsRouter.get(
  '/:id/strategy/execution-packs',
  attachProfile,
  rejectGuestFromPortal,
  getStrategyExecutionPacksController,
);
auditsRouter.patch(
  '/:id/strategy/lab-context',
  attachProfile,
  rejectGuestFromPortal,
  patchStrategyLabContextController,
);
auditsRouter.post(
  '/:id/roadmap/manifest-preview',
  attachProfile,
  rejectGuestFromPortal,
  postRoadmapManifestPreviewController,
);
auditsRouter.post(
  '/:id/roadmap/manifest-snapshots',
  attachProfile,
  rejectGuestFromPortal,
  postRoadmapManifestSnapshotController,
);
auditsRouter.get(
  '/:id/roadmap/manifest-snapshots',
  attachProfile,
  rejectGuestFromPortal,
  getRoadmapManifestSnapshotsController,
);
auditsRouter.get(
  '/:id/roadmap/manifest-snapshots/latest',
  attachProfile,
  rejectGuestFromPortal,
  getRoadmapManifestSnapshotLatestController,
);
auditsRouter.post(
  '/:id/orchestration/pack',
  attachProfile,
  rejectGuestFromPortal,
  postOrchestrationPackController,
);
auditsRouter.post(
  '/:id/orchestration/pack/regenerate',
  attachProfile,
  rejectGuestFromPortal,
  postOrchestrationPackRegenerateController,
);
auditsRouter.get(
  '/:id/orchestration/pack',
  attachProfile,
  rejectGuestFromPortal,
  getOrchestrationPackController,
);
auditsRouter.get(
  '/:id/orchestration/pack-diff',
  attachProfile,
  rejectGuestFromPortal,
  getOrchestrationPackDiffController,
);
auditsRouter.get(
  '/:id/orchestration/pack-diff-history',
  attachProfile,
  rejectGuestFromPortal,
  getOrchestrationPackDiffHistoryController,
);
auditsRouter.get(
  '/:id/orchestration/sprint-export',
  attachProfile,
  rejectGuestFromPortal,
  getOrchestrationSprintExportController,
);
auditsRouter.post(
  '/:id/orchestrator/preview',
  attachProfile,
  rejectGuestFromPortal,
  postOrchestratorPreviewController,
);
auditsRouter.post(
  '/:id/orchestrator/run',
  attachProfile,
  rejectGuestFromPortal,
  postOrchestratorRunController,
);
auditsRouter.get(
  '/:id/orchestrator/latest',
  attachProfile,
  rejectGuestFromPortal,
  getOrchestratorLatestController,
);
auditsRouter.get(
  '/:id/timeline',
  attachProfile,
  rejectGuestFromPortal,
  getAuditTimelineController,
);
auditsRouter.get(
  '/:id/plan/board',
  attachProfile,
  rejectGuestFromPortal,
  getPlanBoardController,
);
auditsRouter.patch(
  '/:id/plan/board/cards/:cardId',
  attachProfile,
  rejectGuestFromPortal,
  patchPlanBoardCardController,
);
auditsRouter.delete(
  '/:id/plan/board/cards/:cardId',
  attachProfile,
  rejectGuestFromPortal,
  deletePlanBoardCardController,
);
auditsRouter.patch(
  '/:id/pipeline/phases/:phase/result',
  attachProfile,
  rejectGuestFromPortal,
  patchPipelinePhaseResultController,
);
auditsRouter.post(
  '/:id/plan/board/cards',
  attachProfile,
  rejectGuestFromPortal,
  postPlanBoardManualCardController,
);
auditsRouter.post(
  '/:id/plan/board/reconcile',
  attachProfile,
  rejectGuestFromPortal,
  postPlanBoardReconcileController,
);
auditsRouter.post(
  '/:id/plan/board/telemetry/view-opened',
  attachProfile,
  rejectGuestFromPortal,
  postPlanBoardViewOpenedController,
);
auditsRouter.get(
  '/:id/directors/:domain/deep-dive/quota',
  attachProfile,
  rejectGuestFromPortal,
  getDirectorDeepDiveQuotaController,
);
auditsRouter.post(
  '/:id/directors/:domain/deep-dive',
  attachProfile,
  rejectGuestFromPortal,
  postDirectorDeepDiveController,
);
auditsRouter.get(
  '/:id/directors/:domain/deep-dive/:jobId',
  attachProfile,
  rejectGuestFromPortal,
  getDirectorDeepDiveStatusController,
);
auditsRouter.post(
  '/:id/orchestration/selected-initiative',
  attachProfile,
  rejectGuestFromPortal,
  postSelectedInitiativeController,
);
auditsRouter.post(
  '/:id/orchestration/commercial-offer',
  attachProfile,
  rejectGuestFromPortal,
  postOrchestrationCommercialOfferController,
);
auditsRouter.get('/:id', attachProfile, rejectGuestFromPortal, getAuditController);
auditsRouter.post('/:id/upgrade-from-snapshot', attachProfile, rejectGuestFromPortal, upgradeFromSnapshotController);
auditsRouter.delete('/:id', ...consultantGuard, deleteAuditController);
auditsRouter.get('/:id/brief/schema', attachProfile, rejectGuestFromPortal, getBriefSchemaController);
auditsRouter.post('/:id/brief/analytics-events', attachProfile, rejectGuestFromPortal, postBriefAnalyticsController);
auditsRouter.get('/:id/brief', attachProfile, rejectGuestFromPortal, getBriefController);
auditsRouter.post(
  '/:id/brief/intelligence-snapshot',
  attachProfile,
  rejectGuestFromPortal,
  postBriefIntelligenceSnapshotController,
);
auditsRouter.post(
  '/:id/brief/intelligence-wording',
  attachProfile,
  rejectGuestFromPortal,
  postBriefIntelligenceWordingController,
);
auditsRouter.get(
  '/:id/client-project-context',
  attachProfile,
  rejectGuestFromPortal,
  getClientProjectContextController,
);
auditsRouter.get(
  '/:id/intake-followup-suggestions',
  attachProfile,
  rejectGuestFromPortal,
  getIntakeFollowupSuggestionsController,
);
auditsRouter.post('/:id/brief/help-request', attachProfile, postBriefHelpRequestController);
auditsRouter.post(
  '/:id/brief/clone-from',
  attachProfile,
  rejectGuestFromPortal,
  postBriefCloneFromController,
);
auditsRouter.put('/:id/brief', attachProfile, rejectGuestFromPortal, putBriefController);
