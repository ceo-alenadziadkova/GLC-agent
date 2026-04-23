import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

import { CLAUDE_MODEL } from '../../config/model.js';
import { createAnthropicClient } from '../../config/claude-client.js';
import type { NlDescribeGraphDraft } from './nl-describe-graph-mapper.js';

const NlDescribeToolSchema = z.object({
  inferred: z.array(
    z.object({
      questionId: z.string().min(1),
      confidence: z.enum(['low', 'medium']),
      rationale: z.string().min(1),
      suggestedValue: z.union([z.string(), z.boolean()]),
    }),
  ),
});

const TOOL_NAME = 'map_nl_describe_to_graph_draft';

function buildUserPrompt(text: string): string {
  return [
    'Map this intake free-text into deterministic draft hints.',
    'Return only high-signal hints; avoid guesses when unsupported.',
    'Use only known question IDs; confidence can be low or medium.',
    '',
    'INPUT_TEXT:',
    text,
  ].join('\n');
}

export async function mapNlDescribeTextToGraphDraftLlm(text: string): Promise<NlDescribeGraphDraft> {
  const anthropic: Anthropic = createAnthropicClient();
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 800,
    system:
      'You map intake text to a compact graph draft. Only return tool input that matches the schema exactly.',
    messages: [{ role: 'user', content: buildUserPrompt(text) }],
    tools: [
      {
        name: TOOL_NAME,
        description: 'Return NL-to-graph draft hints for intake.',
        input_schema: {
          type: 'object',
          properties: {
            inferred: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  questionId: { type: 'string' },
                  confidence: { type: 'string', enum: ['low', 'medium'] },
                  rationale: { type: 'string' },
                  suggestedValue: {
                    oneOf: [{ type: 'string' }, { type: 'boolean' }],
                  },
                },
                required: ['questionId', 'confidence', 'rationale', 'suggestedValue'],
              },
            },
          },
          required: ['inferred'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: TOOL_NAME },
  });
  const toolBlock = response.content.find(block => block.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('nl_describe_llm_missing_tool_use');
  }
  const parsed = NlDescribeToolSchema.safeParse(toolBlock.input);
  if (!parsed.success) {
    throw new Error(`nl_describe_llm_schema_invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}
