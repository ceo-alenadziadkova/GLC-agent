/**
 * Stable Claude tool contract for domain agents (tool name, abort reasons).
 * Keep aligned with pipeline event copy where the tool is described to operators.
 */

export const CLAUDE_DOMAIN_SUBMIT_TOOL_NAME = 'submit_analysis' as const;

/** Passed to AbortController when the Anthropic request exceeds configured timeout. */
export const CLAUDE_API_TIMEOUT_ABORT_REASON = 'Claude API timeout' as const;
