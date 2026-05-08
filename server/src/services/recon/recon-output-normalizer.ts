import type { z } from 'zod';
import { ReconOutputSchema } from '../../schemas/domain-output.js';

export const RECON_LIST_COERCION_FIELDS = [
  'key_services_products',
  'initial_observations',
  'suggested_interview_questions',
] as const;

type ReconListField = (typeof RECON_LIST_COERCION_FIELDS)[number];
type ReconRuntimeOutput = z.infer<typeof ReconOutputSchema> & Partial<Record<ReconListField, unknown>>;

export type ReconNormalizationResult = {
  normalized: ReconRuntimeOutput;
  appliedFields: ReconListField[];
  rawTypesBefore: Partial<Record<ReconListField, string>>;
};

function detectType(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function normalizeListString(value: string): string[] {
  return value
    .split(/\r?\n|;/g)
    .map((item) => item.replace(/^(\d+[).:-]\s*|[-*•]\s*)/, '').trim())
    .filter((item) => item.length > 0);
}

export function normalizeReconRuntimeOutput(raw: unknown): ReconNormalizationResult {
  const next = (raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>) } : {}) as ReconRuntimeOutput;
  const appliedFields: ReconListField[] = [];
  const rawTypesBefore: Partial<Record<ReconListField, string>> = {};

  for (const field of RECON_LIST_COERCION_FIELDS) {
    const value = next[field];
    if (typeof value !== 'string') continue;
    rawTypesBefore[field] = detectType(value);
    next[field] = normalizeListString(value);
    appliedFields.push(field);
  }

  return {
    normalized: next,
    appliedFields,
    rawTypesBefore,
  };
}
