import {
  GLC_DIRECTOR_EXECUTION_LEGACY_KEYS,
  GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
} from '../../config/director-orchestration-policy.js';
import {
  DirectorWaveBundleSchema,
  GlcDirectorOrchestrationSliceSchema,
  type GlcDirectorOrchestrationSlice,
} from '../../schemas/glc-director-orchestration-slice.js';

export const DIRECTOR_SLICE_PARSE_MODES = ['canonical', 'legacy', 'missing', 'invalid'] as const;
export type DirectorSliceParseMode = (typeof DIRECTOR_SLICE_PARSE_MODES)[number];

export interface DirectorSliceExtractionResult {
  slice: GlcDirectorOrchestrationSlice | null;
  mode: DirectorSliceParseMode;
}

function parseWaveBundle(input: unknown) {
  if (Array.isArray(input)) {
    return DirectorWaveBundleSchema.safeParse({ actions: input });
  }
  return DirectorWaveBundleSchema.safeParse(input);
}

function buildSliceFromWaveCandidates(raw: Record<string, unknown>): GlcDirectorOrchestrationSlice | null {
  const baselineCandidate =
    raw.baseline ?? raw.director_baseline ?? raw.actions ?? raw.director_actions ?? raw.recommendations;
  const deepCandidate = raw.deep ?? raw.director_deep;

  const baselineParsed = parseWaveBundle(baselineCandidate);
  const deepParsed = parseWaveBundle(deepCandidate);
  const baseline = baselineParsed.success ? baselineParsed.data : undefined;
  const deep = deepParsed.success ? deepParsed.data : undefined;

  if (!baseline && !deep) return null;

  const parsed = GlcDirectorOrchestrationSliceSchema.safeParse({
    schema_version: GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
    ...(baseline ? { baseline } : {}),
    ...(deep ? { deep } : {}),
  });
  return parsed.success ? parsed.data : null;
}

function hasLegacyWaveCandidateKeys(raw: Record<string, unknown>): boolean {
  return (
    raw.baseline !== undefined ||
    raw.director_baseline !== undefined ||
    raw.actions !== undefined ||
    raw.director_actions !== undefined ||
    raw.recommendations !== undefined ||
    raw.deep !== undefined ||
    raw.director_deep !== undefined
  );
}

/**
 * Best-effort parser for director orchestration payload emitted by domain agents.
 * Keeps pipeline deterministic: invalid or absent payload is ignored safely.
 */
export function extractGlcDirectorOrchestrationSliceFromAgentOutput(
  rawAgentOutput: unknown,
): GlcDirectorOrchestrationSlice | null {
  return extractGlcDirectorOrchestrationSliceFromAgentOutputDetailed(rawAgentOutput).slice;
}

export function extractGlcDirectorOrchestrationSliceFromAgentOutputDetailed(
  rawAgentOutput: unknown,
): DirectorSliceExtractionResult {
  if (!rawAgentOutput || typeof rawAgentOutput !== 'object' || Array.isArray(rawAgentOutput)) {
    return { slice: null, mode: 'missing' };
  }
  const raw = rawAgentOutput as Record<string, unknown>;

  const canonicalParsed = GlcDirectorOrchestrationSliceSchema.safeParse(raw.glc_director_execution);
  if (canonicalParsed.success) {
    return { slice: canonicalParsed.data, mode: 'canonical' };
  }

  const aliasCandidates = GLC_DIRECTOR_EXECUTION_LEGACY_KEYS.map(key => raw[key]);
  for (const candidate of aliasCandidates) {
    const parsed = GlcDirectorOrchestrationSliceSchema.safeParse(candidate);
    if (parsed.success) return { slice: parsed.data, mode: 'legacy' };
  }

  const hasAnyExplicitCandidate = [raw.glc_director_execution, ...aliasCandidates].some(
    candidate => candidate !== undefined,
  );
  const hasAnyLegacyWaveCandidate = hasLegacyWaveCandidateKeys(raw);
  const legacy = buildSliceFromWaveCandidates(raw);
  if (legacy) return { slice: legacy, mode: 'legacy' };
  if (hasAnyExplicitCandidate || hasAnyLegacyWaveCandidate) return { slice: null, mode: 'invalid' };
  return { slice: null, mode: 'missing' };
}
