/**
 * Public snapshot landing: polling intervals, thresholds, and fallback user copy.
 * Static SPA config (not secrets). Keeps `SnapshotLanding` free of scattered literals.
 */

export const SNAPSHOT_LANDING_POLL_INTERVAL_MS = 3000;

/** Transient poll failures before surfacing the generic error path */
export const SNAPSHOT_LANDING_POLL_FAILURE_THRESHOLD = 3;

/** Phase label rotation while status is `running` */
export const SNAPSHOT_LANDING_PHASE_LABEL_INTERVAL_MS = 4500;

export const SNAPSHOT_LANDING_COPY = {
  analysisFailedOnServer:
    'Analysis failed on the server. Please retry with the same URL in a few moments.',
  pollStatusGenericError: 'Could not fetch snapshot status. Please try again.',
  loadStatusDefaultHint: 'Could not load snapshot status.',
  startAnalysisDefaultHint: 'Could not start analysis.',
  startNetworkError:
    'Network error: could not reach the server. Check your connection and try again.',
} as const;

/** Client portal: how long to show the brief "saved" confirmation */
export const PORTAL_BRIEF_SAVED_FEEDBACK_MS = 3000;
