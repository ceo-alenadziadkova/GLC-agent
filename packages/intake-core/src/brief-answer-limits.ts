/**
 * Shared limits for free-text / textarea intake answers.
 * Used by Zod validation (server), bank UI contracts, and policy linters.
 */
export const BRIEF_ANSWER_STRING_MAX = 12_000 as const;
