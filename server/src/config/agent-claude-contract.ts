/**
 * Stable Claude tool contract for domain agents (tool name, abort reasons).
 * Keep aligned with pipeline event copy where the tool is described to operators.
 */

export const CLAUDE_DOMAIN_SUBMIT_TOOL_NAME = 'submit_analysis' as const;

/**
 * Tool names for the Collaborative Director Protocol artifacts.
 *
 * These mirror `COALITION_TOOL_NAMES` in `coalition-protocol-policy.ts` and are
 * surfaced here so the prompt-loader (`PROMPT_TOOL_NAME_MAP`) can stay in the
 * standard "tool names live in agent-claude-contract" pattern, alongside
 * `CLAUDE_DOMAIN_SUBMIT_TOOL_NAME`. Concept ADR:
 * `docs/adrs/ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-V1.md`.
 */
export const CLAUDE_COALITION_CONTEXT_DIRECTOR_TOOL_NAME = 'submit_client_situation' as const;
export const CLAUDE_COALITION_HYPOTHESIS_TOOL_NAME = 'submit_domain_hypothesis' as const;
export const CLAUDE_COALITION_ALIGNMENT_TOOL_NAME = 'submit_domain_alignment' as const;
export const CLAUDE_COALITION_CONFLICT_RESOLVER_TOOL_NAME = 'submit_conflict_resolution' as const;

/** Passed to AbortController when the Anthropic request exceeds configured timeout. */
export const CLAUDE_API_TIMEOUT_ABORT_REASON = 'Claude API timeout' as const;
