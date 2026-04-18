/**
 * Heuristic weights for mapping agent unknown_items to brief question IDs (post-audit followups).
 */

export const POST_AUDIT_FOLLOWUP_SCORING = {
  idPhraseMatchScore: 4,
  tokenMatchScore: 2,
  minTokenLen: 4,
} as const;
