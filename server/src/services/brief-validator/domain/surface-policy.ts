import {
  currentIntakeVersionTuple,
  isSupportedIntakeArtifactTuple,
  type IntakeSurface,
} from '@glc/intake-core';
import type { IntakeBriefCollectionMode, IntakeVersionTuple } from '../../../types/audit.js';
import { logger } from '../../logger.js';

/** Owner vs linked client — drives layout surface for validation. */
export function validationPerspectiveForBriefAccess(
  auditUserId: string,
  auditClientId: string | null | undefined,
  requestUserId: string,
): 'consultant' | 'client' {
  if (auditClientId && requestUserId === auditClientId) return 'client';
  return 'consultant';
}

export function resolveIntakeSurfaceForPlan(
  collectionMode: IntakeBriefCollectionMode,
  perspective: 'consultant' | 'client',
): IntakeSurface | undefined {
  /** Matches buildIntakePlan: `public_discovery` layout only applies with this surface + discovery mode. */
  if (collectionMode === 'discovery') return 'public_discovery';
  if (perspective === 'client') {
    return collectionMode === 'pre_brief' ? 'client_portal' : 'client_form';
  }
  return 'consultant_interview';
}

/** Use stored tuple when supported; otherwise current engine (logs once per read path). */
export function coerceArtifactTupleForRead(
  stored: IntakeVersionTuple | null | undefined,
  context: string,
): IntakeVersionTuple {
  const current = currentIntakeVersionTuple();
  if (!stored) return current;
  if (isSupportedIntakeArtifactTuple(stored)) return stored;
  logger.warn('intake_versions not in supported artifact registry; using current engine', {
    context,
    stored,
  });
  return current;
}
