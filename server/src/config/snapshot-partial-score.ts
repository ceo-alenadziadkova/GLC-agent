/**
 * Multiplier applied to max points when a snapshot audit rule status is `partial`.
 * Source of truth: `SYSTEM_DEFAULTS.snapshotAudit.partialScoreFactor`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

export const SNAPSHOT_PARTIAL_SCORE_FACTOR = SYSTEM_DEFAULTS.snapshotAudit.partialScoreFactor;
