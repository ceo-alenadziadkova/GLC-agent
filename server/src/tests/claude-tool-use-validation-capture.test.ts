import { describe, expect, it } from 'vitest';
import { buildLlmToolValidationFailedEventData } from '../lib/claude-tool-use-validation-capture.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';

describe('buildLlmToolValidationFailedEventData', () => {
  it('truncates raw tool string and zod summary when they exceed config caps', () => {
    const rawMax = SYSTEM_DEFAULTS.claudeHttp.llmToolValidationFailedRawJsonMaxChars;
    const zodMax = SYSTEM_DEFAULTS.claudeHttp.llmToolValidationFailedZodSummaryMaxChars;
    const rawPayload = 'y'.repeat(rawMax + 50);
    const zodPayload = 'z'.repeat(zodMax + 10);

    const data = buildLlmToolValidationFailedEventData({
      callType: 'domain_agent',
      toolName: 'submit_analysis',
      toolUseId: 'toolu_123',
      zodMessage: zodPayload,
      toolInput: rawPayload,
    });

    expect(data.raw_tool_input_truncated).toBe(true);
    expect(String(data.raw_tool_input_json).length).toBe(rawMax);
    expect(data.zod_summary_truncated).toBe(true);
    expect(String(data.zod_summary).length).toBe(zodMax);
    expect(data.tool_use_id).toBe('toolu_123');
    expect(data.call_type).toBe('domain_agent');
  });

  it('does not set truncated flags when under caps', () => {
    const data = buildLlmToolValidationFailedEventData({
      callType: 'strategy_execution_pack',
      toolName: 't',
      toolUseId: 'id',
      zodMessage: 'short',
      toolInput: { ok: true },
    });
    expect(data.raw_tool_input_truncated).toBe(false);
    expect(data.zod_summary_truncated).toBe(false);
    expect(data.raw_tool_input_json).toBe('{"ok":true}');
  });
});
