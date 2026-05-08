import { StrategyOutputSchema, type StrategyOutput } from '../../schemas/domain-output.js';
import { normalizeStrategyToolInputForSchema } from './strategy-output-tool-normalize.js';

export type ParsedStrategyToolInputOk = {
  ok: true;
  data: StrategyOutput;
  normalization_mutation_codes: readonly string[];
};

export type ParsedStrategyToolInputErr = {
  ok: false;
  zod_message: string;
  normalization_mutation_codes: readonly string[];
};

/**
 * Operational path: deterministic repairs ({@link normalizeStrategyToolInputForSchema}) then Zod strict parse.
 * Does **not** read feature flags — repairs are intentional for human-repaired payloads.
 */
export function parseStrategyToolInputWithDeterministicRepairs(rawInput: unknown): ParsedStrategyToolInputOk | ParsedStrategyToolInputErr {
  const normalized = normalizeStrategyToolInputForSchema(rawInput);
  const parsed = StrategyOutputSchema.safeParse(normalized.value);
  if (!parsed.success) {
    return {
      ok: false,
      zod_message: parsed.error.message,
      normalization_mutation_codes: normalized.mutationCodes,
    };
  }
  return {
    ok: true,
    data: parsed.data,
    normalization_mutation_codes: normalized.mutationCodes,
  };
}
