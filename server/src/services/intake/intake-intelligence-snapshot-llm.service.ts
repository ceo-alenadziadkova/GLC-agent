import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

import { getIntakeIntelligenceWordingVoiceSystemLine } from '../../config/feature-flags.js';
import { CLAUDE_MODEL } from '../../config/model.js';
import { createAnthropicClient } from '../../config/claude-client.js';
import type { NlDescribeGraphDraft } from './nl-describe-graph-mapper.js';

const SnapshotToolSchema = z.object({
  narrative: z.string().nullable().optional(),
  inferred: z.array(
    z.object({
      questionId: z.string().min(1),
      confidence: z.enum(['low', 'medium']),
      rationale: z.string().min(1),
      suggestedValue: z.union([z.string(), z.boolean()]),
    }),
  ),
  suggested_next_question_ids: z.array(z.string().min(1)),
  label_overrides: z.record(z.string(), z.string()).optional(),
});

const TOOL_NAME = 'intake_intelligence_snapshot';

export type IntakeIntelligenceSnapshotLlmResult = {
  narrative: string | null;
  inferred: NlDescribeGraphDraft['inferred'];
  suggestedNextQuestionIds: string[];
  labelOverrides: Record<string, string>;
};

function buildUserPrompt(
  allowedF2Ids: readonly string[],
  responsesSummary: string,
  lighthouseSummary?: Record<string, unknown> | null,
): string {
  const parts = [
    'You help prioritize follow-up bank questions for a business intake after a short pre-brief.',
    'Return exactly one tool call.',
    'Rules:',
    '- suggested_next_question_ids: subset of the ALLOWED_IDS list, best order to deepen understanding (3–12 ids typical).',
    '- inferred: only questionIds from the same bank; only when you can suggest a new cell value not already fully stated (confidence low|medium).',
    '- label_overrides: optional shorter, client-specific *display* phrasing for those bank ids (UI only; canonical stems stay in the system).',
    '- narrative: one short paragraph summarizing what you understood (or null if there is nothing additive beyond the client text).',
    'Do not invent new question ids not in ALLOWED_IDS.',
    '',
    'ALLOWED_IDS (in deterministic planner order):',
    allowedF2Ids.join(', '),
    '',
    'PREBRIEF_RESPONSES_SUMMARY (PII may be redacted):',
    responsesSummary,
  ];
  if (lighthouseSummary && Object.keys(lighthouseSummary).length > 0) {
    parts.push(
      '',
      'LIGHTHOUSE_SUMMARY (optional; scores and Web Vitals when a public URL was audited — use only as objective context, not as client quotes):',
      JSON.stringify(lighthouseSummary),
    );
  }
  return parts.join('\n');
}

export async function runIntakeIntelligenceSnapshotLlm(args: {
  allowedF2Ids: readonly string[];
  responsesSummary: string;
  /** When present (e.g. from `collected_data` performance / bootstrap), folded into the user prompt. */
  lighthouseSummary?: Record<string, unknown> | null;
}): Promise<IntakeIntelligenceSnapshotLlmResult> {
  const anthropic: Anthropic = createAnthropicClient();
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1_200,
    system:
      'You are an intake intelligence assistant. Only output the tool; question ids must be from the allowed list. Never claim you stored answers you did not infer.',
    messages: [
      {
        role: 'user',
        content: buildUserPrompt(
          args.allowedF2Ids,
          args.responsesSummary,
          args.lighthouseSummary,
        ),
      },
    ],
    tools: [
      {
        name: TOOL_NAME,
        description: 'Narrative, inferred cell hints, F2 follow-up order, and optional label overrides for public intake.',
        input_schema: {
          type: 'object',
          properties: {
            narrative: { type: 'string' },
            inferred: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  questionId: { type: 'string' },
                  confidence: { type: 'string', enum: ['low', 'medium'] },
                  rationale: { type: 'string' },
                  suggestedValue: { oneOf: [{ type: 'string' }, { type: 'boolean' }] },
                },
                required: ['questionId', 'confidence', 'rationale', 'suggestedValue'],
              },
            },
            suggested_next_question_ids: { type: 'array', items: { type: 'string' } },
            label_overrides: { type: 'object', additionalProperties: { type: 'string' } },
          },
          required: ['inferred', 'suggested_next_question_ids'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: TOOL_NAME },
  });
  const toolBlock = response.content.find(block => block.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('intake_intelligence_snapshot_llm_missing_tool_use');
  }
  const parsed = SnapshotToolSchema.safeParse(toolBlock.input);
  if (!parsed.success) {
    throw new Error(`intake_intelligence_snapshot_llm_schema_invalid: ${parsed.error.message}`);
  }
  const d = parsed.data;
  return {
    narrative: d.narrative ?? null,
    inferred: d.inferred,
    suggestedNextQuestionIds: d.suggested_next_question_ids,
    labelOverrides: d.label_overrides ?? {},
  };
}

// ── LLM-1: understanding only (no label paraphrase — wording pass is separate) ─────────────

const UnderstandingToolSchema = z.object({
  narrative: z.string().nullable().optional(),
  inferred: z.array(
    z.object({
      questionId: z.string().min(1),
      confidence: z.enum(['low', 'medium']),
      rationale: z.string().min(1),
      suggestedValue: z.union([z.string(), z.boolean()]),
    }),
  ),
  suggested_next_question_ids: z.array(z.string().min(1)),
});

const TOOL_UNDERSTANDING = 'intake_intelligence_understanding';

function buildUnderstandingUserPrompt(
  allowedF2Ids: readonly string[],
  responsesSummary: string,
  lighthouseSummary?: Record<string, unknown> | null,
): string {
  const parts = [
    'You assess what kind of company or business idea this is after a short pre-brief. Do not write display paraphrases for question labels in this pass — only structured hints and a short readout.',
    'Return exactly one tool call.',
    'Rules:',
    '- suggested_next_question_ids: subset of ALLOWED_IDS, best follow-up order (3–12 typical).',
    '- inferred: only known bank questionIds; only new cell values not already fully stated (low|medium confidence).',
    '- narrative: one short paragraph "how we read this" (or null if nothing additive).',
    'Do not invent new question ids not in ALLOWED_IDS.',
    '',
    'ALLOWED_IDS (deterministic planner order):',
    allowedF2Ids.join(', '),
    '',
    'PREBRIEF_RESPONSES_SUMMARY (PII may be redacted):',
    responsesSummary,
  ];
  if (lighthouseSummary && Object.keys(lighthouseSummary).length > 0) {
    parts.push(
      '',
      'LIGHTHOUSE_SUMMARY (objective site signals; not client quotes):',
      JSON.stringify(lighthouseSummary),
    );
  }
  return parts.join('\n');
}

/**
 * First LLM pass: company/idea understanding + F2 + inferred preview. No `label_overrides` (B1 wording is LLM-2).
 */
export async function runIntakeIntelligenceUnderstandingLlm(args: {
  allowedF2Ids: readonly string[];
  responsesSummary: string;
  lighthouseSummary?: Record<string, unknown> | null;
}): Promise<IntakeIntelligenceSnapshotLlmResult> {
  const anthropic: Anthropic = createAnthropicClient();
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1_200,
    system:
      'You are an intake understanding assistant. Only output the tool. Question ids must be from the allowed list. Never claim you stored answers you did not infer. Do not output label paraphrases here.',
    messages: [
      {
        role: 'user',
        content: buildUnderstandingUserPrompt(
          args.allowedF2Ids,
          args.responsesSummary,
          args.lighthouseSummary,
        ),
      },
    ],
    tools: [
      {
        name: TOOL_UNDERSTANDING,
        description: 'Narrative, inferred cell hints, F2 follow-up order (no display label paraphrase).',
        input_schema: {
          type: 'object',
          properties: {
            narrative: { type: 'string' },
            inferred: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  questionId: { type: 'string' },
                  confidence: { type: 'string', enum: ['low', 'medium'] },
                  rationale: { type: 'string' },
                  suggestedValue: { oneOf: [{ type: 'string' }, { type: 'boolean' }] },
                },
                required: ['questionId', 'confidence', 'rationale', 'suggestedValue'],
              },
            },
            suggested_next_question_ids: { type: 'array', items: { type: 'string' } },
          },
          required: ['inferred', 'suggested_next_question_ids'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: TOOL_UNDERSTANDING },
  });
  const toolBlock = response.content.find(block => block.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('intake_intelligence_understanding_llm_missing_tool_use');
  }
  const parsed = UnderstandingToolSchema.safeParse(toolBlock.input);
  if (!parsed.success) {
    throw new Error(`intake_intelligence_understanding_llm_schema_invalid: ${parsed.error.message}`);
  }
  const d = parsed.data;
  return {
    narrative: d.narrative ?? null,
    inferred: d.inferred,
    suggestedNextQuestionIds: d.suggested_next_question_ids,
    labelOverrides: {},
  };
}

// ── LLM-2: B1 wording (display phrasing for bank ids only) ───────────────────────────────

const WordingToolSchema = z.object({
  label_overrides: z.record(z.string(), z.string()).optional(),
  hint_overrides: z.record(z.string(), z.string()).optional(),
  option_display_overrides: z.record(z.string(), z.array(z.string())).optional(),
});

const TOOL_WORDING = 'intake_intelligence_wording';

const MAX_LABEL_LEN = 500;
const MAX_HINT_LEN = 400;
const MAX_OPTION_LABEL_LEN = 200;

export type IntakeIntelligenceWordingLlmResult = {
  labelOverrides: Record<string, string>;
  hintOverrides: Record<string, string>;
  optionDisplayOverrides: Record<string, string[]>;
};

function filterStringRecord(
  raw: Record<string, string> | undefined,
  allowed: Set<string>,
  maxLen: number,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const [k, v] of Object.entries(raw)) {
    const t = v.trim();
    if (allowed.has(k) && t.length > 0) {
      out[k] = t.slice(0, maxLen);
    }
  }
  return out;
}

/**
 * `option_display_overrides[id]` must be parallel to canonical `options` (same length, order = display for each option).
 * Stored answers remain canonical option strings, not these labels.
 */
function filterOptionDisplayOverrides(
  raw: Record<string, string[]> | undefined,
  allowed: Set<string>,
  idToCanonicalOptions: Readonly<Record<string, readonly string[] | undefined>>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!raw) return out;
  for (const [id, displays] of Object.entries(raw)) {
    if (!allowed.has(id) || !Array.isArray(displays)) continue;
    const canonical = idToCanonicalOptions[id];
    if (!canonical || canonical.length === 0) continue;
    if (displays.length !== canonical.length) continue;
    const row: string[] = [];
    let ok = true;
    for (let i = 0; i < displays.length; i++) {
      const t = (displays[i] ?? '').trim();
      if (t.length === 0) {
        ok = false;
        break;
      }
      row.push(t.slice(0, MAX_OPTION_LABEL_LEN));
    }
    if (ok) {
      out[id] = row;
    }
  }
  return out;
}

/**
 * Second LLM pass: client-specific question title, hint, and per-option *display* lines for bank ids
 * (UI only; canonical option strings and `questionId` keys in responses unchanged).
 */
export async function runIntakeIntelligenceWordingLlm(args: {
  /** Only these ids (subset of the bank) may receive overrides. */
  allowedWordingIds: readonly string[];
  responsesSummary: string;
  /** Short canonical label per id for disambiguation (id -> label from bank). */
  idLabels: Readonly<Record<string, string>>;
  /** For choice questions: exact canonical `options` order (must match what the client UI persists). */
  idToCanonicalOptions: Readonly<Record<string, readonly string[] | undefined>>;
  lighthouseSummary?: Record<string, unknown> | null;
}): Promise<IntakeIntelligenceWordingLlmResult> {
  if (args.allowedWordingIds.length === 0) {
    return { labelOverrides: {}, hintOverrides: {}, optionDisplayOverrides: {} };
  }
  const labelLines = args.allowedWordingIds
    .map(id => `${id}: ${args.idLabels[id] ?? id}`)
    .join('\n');
  const optionsBlock = args.allowedWordingIds
    .map(id => {
      const opts = args.idToCanonicalOptions[id];
      if (opts && opts.length > 0) {
        return `${id}:\n${opts.map((o, i) => `  [${i}] "${o}"`).join('\n')}`;
      }
      return `${id}: (no option list — free text, number, or non-choice)`;
    })
    .join('\n\n');

  const userParts = [
    'You adapt bank intake copy to this client’s situation. Output exactly one tool call.',
    'Rules:',
    '- `label_overrides` (optional): per-id replacement *question line* the client sees (not internal ids). Max ~120 chars per value, keys only from ALLOWED_IDS.',
    '- `hint_overrides` (optional): short nudge under the title for non–free-text controls, or a friendlier rephrase of the default hint. Keys only from ALLOWED_IDS.',
    '- `option_display_overrides` (optional): for choice questions only. For each id, value is an **array of display strings in the same order and length** as CANONICAL_OPTIONS for that id. Do not change meaning; rephrase to this client’s context (e.g. industry, site). Stored answers will still be the canonical option strings on the right — the UI shows your strings.',
    '- Omit keys you do not need; empty objects are fine.',
    '',
    'ALLOWED_IDS:',
    args.allowedWordingIds.join(', '),
    '',
    'CANONICAL_LABELS (reference):',
    labelLines,
    '',
    'CANONICAL_OPTIONS (order must match for option_display_overrides):',
    optionsBlock,
    '',
    'CONFIRMED_ANSWERS_SUMMARY (PII may be redacted):',
    args.responsesSummary,
  ];
  if (args.lighthouseSummary && Object.keys(args.lighthouseSummary).length > 0) {
    userParts.push(
      '',
      'LIGHTHOUSE_SUMMARY (optional tone context):',
      JSON.stringify(args.lighthouseSummary),
    );
  }
  const anthropic: Anthropic = createAnthropicClient();
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1_800,
    system: `You are a product copy assistant for business intake. Only output the tool. Do not mention question ids, internal keys, or "the bank" to the end user. ${getIntakeIntelligenceWordingVoiceSystemLine()}`,
    messages: [{ role: 'user', content: userParts.join('\n') }],
    tools: [
      {
        name: TOOL_WORDING,
        description:
          'Client-facing phrasing: label_overrides, hint_overrides, option_display_overrides; keys are bank question ids from the allowed set only.',
        input_schema: {
          type: 'object',
          properties: {
            label_overrides: { type: 'object', additionalProperties: { type: 'string' } },
            hint_overrides: { type: 'object', additionalProperties: { type: 'string' } },
            option_display_overrides: {
              type: 'object',
              additionalProperties: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    ],
    tool_choice: { type: 'tool', name: TOOL_WORDING },
  });
  const toolBlock = response.content.find(block => block.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('intake_intelligence_wording_llm_missing_tool_use');
  }
  const parsed = WordingToolSchema.safeParse(toolBlock.input);
  if (!parsed.success) {
    throw new Error(`intake_intelligence_wording_llm_schema_invalid: ${parsed.error.message}`);
  }
  const d = parsed.data;
  const allowed = new Set(args.allowedWordingIds);
  const labelOverrides = filterStringRecord(
    d.label_overrides as Record<string, string> | undefined,
    allowed,
    MAX_LABEL_LEN,
  );
  const hintOverrides = filterStringRecord(
    d.hint_overrides as Record<string, string> | undefined,
    allowed,
    MAX_HINT_LEN,
  );
  const optionDisplayOverrides = filterOptionDisplayOverrides(
    d.option_display_overrides as Record<string, string[]> | undefined,
    allowed,
    args.idToCanonicalOptions,
  );
  return { labelOverrides, hintOverrides, optionDisplayOverrides };
}
