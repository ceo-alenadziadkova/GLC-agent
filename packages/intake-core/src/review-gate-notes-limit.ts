/**
 * Max length for consultant_notes and interview_notes on pipeline review approval
 * (POST /api/audits/:id/reviews/:phase). Shared with the SPA ReviewPointModal maxLength.
 *
 * Shorter consultant-only notes on audit-requests use REQUEST_FIELD_LIMITS.consultantNoteMax on the server.
 */
export const REVIEW_GATE_NOTES_MAX = 5000 as const;
