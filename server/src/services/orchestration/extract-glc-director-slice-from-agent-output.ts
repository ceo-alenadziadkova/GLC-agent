import { GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION } from '../../config/director-orchestration-policy.js';
import {
  DirectorWaveBundleSchema,
  GlcDirectorOrchestrationSliceSchema,
  type GlcDirectorOrchestrationSlice,
} from '../../schemas/glc-director-orchestration-slice.js';

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

/**
 * Best-effort parser for director orchestration payload emitted by domain agents.
 * Keeps pipeline deterministic: invalid or absent payload is ignored safely.
 */
export function extractGlcDirectorOrchestrationSliceFromAgentOutput(
  rawAgentOutput: unknown,
): GlcDirectorOrchestrationSlice | null {
  if (!rawAgentOutput || typeof rawAgentOutput !== 'object' || Array.isArray(rawAgentOutput)) return null;
  const raw = rawAgentOutput as Record<string, unknown>;

  const explicitCandidates = [
    raw.glc_director_execution,
    raw.director_orchestration,
    raw.director_bundle,
    raw.orchestration,
  ];
  for (const candidate of explicitCandidates) {
    const parsed = GlcDirectorOrchestrationSliceSchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
  }

  return buildSliceFromWaveCandidates(raw);
}
