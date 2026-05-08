/**
 * Barrel for the Collaborative Director Protocol schemas.
 * Concept ADR: `docs/adrs/ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-V1.md`.
 */

export {
  ClientSituationSnapshotSchema,
  type ClientSituationSnapshot,
} from './client-situation.js';

export {
  DomainHypothesisDraftSchema,
  HYPOTHESIS_ID_PATTERN,
  type DomainHypothesisDraft,
} from './hypothesis.js';

export {
  DomainAlignmentResponseSchema,
  type DomainAlignmentResponse,
} from './alignment.js';

export {
  CrossDomainConflictResolutionSchema,
  type CrossDomainConflictResolution,
} from './conflict-resolution.js';
