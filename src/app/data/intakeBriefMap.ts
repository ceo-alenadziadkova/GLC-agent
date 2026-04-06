import type { BriefResponseEntry, BriefResponses } from './briefQuestions';

/** Map UI brief state to engine input (cells may be flat or `{ value, source }`). */
export function briefResponsesToIntakeMap(brief: BriefResponses): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(brief)) {
    if (v != null && typeof v === 'object' && !Array.isArray(v) && 'value' in v) {
      out[k] = v;
    } else {
      out[k] = v as unknown;
    }
  }
  return out;
}

/** Normalise a flat or cell-shaped record into `BriefResponses` for UI state. */
export function normalizeIntakeToResponses(raw: Record<string, unknown>): BriefResponses {
  const out: BriefResponses = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && typeof v === 'object' && !Array.isArray(v) && 'value' in (v as Record<string, unknown>)) {
      out[k] = { value: (v as BriefResponseEntry).value, source: 'client' };
    } else {
      out[k] = { value: v as BriefResponseEntry['value'], source: 'client' };
    }
  }
  return out;
}

/** Shallow copy for client-side gate previews (matches server `prepareBriefForValidation`). */
export function effectiveBriefForPipelineGates(brief: BriefResponses): BriefResponses {
  return { ...brief };
}
