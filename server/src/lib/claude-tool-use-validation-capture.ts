/**
 * Serialize failed tool_use payloads for pipeline_events (bounded size; no secrets layer — may contain model text).
 */

import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';

export type LlmToolValidationFailedCallType =
  | 'domain_agent'
  | 'strategy_execution_pack'
  | 'orchestration_synthesis';

function truncateByCharCount(s: string, maxChars: number): { text: string; truncated: boolean } {
  if (s.length <= maxChars) return { text: s, truncated: false };
  return { text: s.slice(0, maxChars), truncated: true };
}

/** Build `data` for `llm_tool_validation_failed` pipeline_events rows. */
export function buildLlmToolValidationFailedEventData(params: {
  callType: LlmToolValidationFailedCallType;
  toolName: string;
  toolUseId: string;
  zodMessage: string;
  toolInput: unknown;
}): Record<string, unknown> {
  const rawMax = SYSTEM_DEFAULTS.claudeHttp.llmToolValidationFailedRawJsonMaxChars;
  const zodSummaryMax = SYSTEM_DEFAULTS.claudeHttp.llmToolValidationFailedZodSummaryMaxChars;
  let rawJson: string;
  try {
    rawJson = typeof params.toolInput === 'string' ? params.toolInput : JSON.stringify(params.toolInput);
  } catch {
    rawJson = '"[unserializable tool_use input]"';
  }
  const rawTrunc = truncateByCharCount(rawJson, rawMax);
  const zodTrunc = truncateByCharCount(params.zodMessage, zodSummaryMax);

  return {
    detail_level: 'debug',
    call_type: params.callType,
    tool_name: params.toolName,
    tool_use_id: params.toolUseId,
    zod_summary: zodTrunc.text,
    zod_summary_truncated: zodTrunc.truncated,
    raw_tool_input_json: rawTrunc.text,
    raw_tool_input_truncated: rawTrunc.truncated,
  };
}
