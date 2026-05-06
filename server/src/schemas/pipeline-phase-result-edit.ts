import { z } from 'zod';
import { CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS } from '@glc/intake-core';

const textListSchema = z.array(z.string().trim().min(1)).max(12);

const issuePatchSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(4000),
  impact: z.string().trim().min(1).max(1000),
});

const quickWinPatchSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(4000),
  timeframe: z.string().trim().min(1).max(160),
});

const recommendationPatchSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(4000),
  impact: z.string().trim().min(1).max(1000),
});

const strategyInitiativePatchSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(4000),
  /** Explicit override only (Epic 1). `null` clears; omit to leave unchanged. */
  board_identity_key: z
    .string()
    .trim()
    .min(1)
    .max(CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS)
    .nullable()
    .optional(),
});

export const DomainPhaseResultPatchSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  summary: z.string().trim().min(1).max(5000).optional(),
  strengths: textListSchema.optional(),
  weaknesses: textListSchema.optional(),
  issues: z.array(issuePatchSchema).max(20).optional(),
  quick_wins: z.array(quickWinPatchSchema).max(20).optional(),
  recommendations: z.array(recommendationPatchSchema).max(20).optional(),
});

export const StrategyPhaseResultPatchSchema = z.object({
  executive_summary: z.string().trim().min(1).max(7000).optional(),
  quick_wins: z.array(strategyInitiativePatchSchema).max(20).optional(),
  medium_term: z.array(strategyInitiativePatchSchema).max(20).optional(),
  strategic: z.array(strategyInitiativePatchSchema).max(20).optional(),
});

export const PipelinePhaseResultPatchSchema = z.object({
  result: z.union([DomainPhaseResultPatchSchema, StrategyPhaseResultPatchSchema]),
});

export type PipelinePhaseResultPatch = z.infer<typeof PipelinePhaseResultPatchSchema>;
