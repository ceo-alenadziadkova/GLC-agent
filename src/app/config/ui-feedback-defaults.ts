/**
 * Durations for transient inline UI feedback (copied / saved toasts). Static SPA config.
 */

/** e.g. "Link copied" on discovery queue */
export const UI_FEEDBACK_FLASH_MS = 2000;

/** Brief enrich / workspace save confirmation — slightly longer for readability */
export const AUDIT_WORKSPACE_SAVE_FLASH_MS = 2200;

/** Autosave debounce in workspace side-panel quick edits */
export const AUDIT_WORKSPACE_BRIEF_SAVE_DEBOUNCE_MS = 650;

/** Autosave debounce for new-audit session draft snapshot */
export const NEW_AUDIT_DRAFT_SAVE_DEBOUNCE_MS = 350;
