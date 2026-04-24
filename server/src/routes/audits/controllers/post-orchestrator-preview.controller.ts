import type { Response } from 'express';

import type { AuthRequest } from '../../../middleware/auth.js';
import { postRoadmapManifestPreviewController } from './post-roadmap-manifest-preview.controller.js';
import { markOrchestratorAliasDeprecated } from './orchestrator-legacy-alias.js';

/**
 * Compatibility alias for Orchestrator v1 API.
 * Keeps roadmap manifest preview logic in one place.
 */
export async function postOrchestratorPreviewController(req: AuthRequest, res: Response) {
  markOrchestratorAliasDeprecated(res);
  await postRoadmapManifestPreviewController(req, res);
}

