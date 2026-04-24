/**
 * Ownership filter for optimistic `audits` updates on POST /api/audits/:id/pipeline/retry.
 */

export const PIPELINE_RETRY_CLAIM_OWNERSHIP = {
  owner: 'owner',
  platformOperator: 'platform_operator',
} as const;
