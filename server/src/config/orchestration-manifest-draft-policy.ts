/**
 * Limits for roadmap manifest draft revision queue (Board → manifest signing).
 */

export const MANIFEST_DRAFT_REVISION_OWNER_HINT_MAX_CHARS = 200 as const;

/** Soft cap on distinct nodes with pending revisions per audit (enforced in service). */
export const MANIFEST_DRAFT_REVISION_MAX_KEYS_PER_AUDIT = 250 as const;
