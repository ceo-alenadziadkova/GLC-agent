import type { BriefResponseSource } from '../data/auditTypes';
import type { BriefResponseEntry, BriefResponseValue, BriefResponses } from '../data/briefQuestions';
import { normalizeIntakeToResponses } from '../data/intakeBriefMap';
import { buildStep0IntakePatch } from './new-audit-helpers';

export function normalizeServerBriefResponsesForWizard(
  briefRow: unknown,
  responseSource: BriefResponseSource,
): BriefResponses {
  if (!briefRow || typeof briefRow !== 'object') return {};
  const raw = (briefRow as { responses?: unknown }).responses;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const normalized = normalizeIntakeToResponses(raw as Record<string, unknown>);
  const out: BriefResponses = {};
  for (const [key, cell] of Object.entries(normalized)) {
    if (cell && typeof cell === 'object' && 'value' in cell) {
      out[key] = { value: cell.value, source: responseSource };
    } else {
      out[key] = cell as BriefResponseValue | BriefResponseEntry;
    }
  }
  return out;
}

export function buildNewAuditBriefSavePayload(args: {
  isClientSelfServe: boolean;
  responses: BriefResponses;
  name: string;
  industry: string;
  industrySpecify: string;
  url: string;
  noPublicWebsite: boolean;
}): BriefResponses {
  const source: BriefResponseSource = args.isClientSelfServe ? 'client' : 'consultant';
  const payload: BriefResponses = {
    ...args.responses,
    ...buildStep0IntakePatch(
      args.name,
      args.industry,
      args.industrySpecify,
      args.url,
      args.noPublicWebsite,
      source,
    ),
  };
  if (args.industry !== 'Other') {
    delete payload.intake_industry_specify;
  }
  return payload;
}

export function buildResetIntelligenceSnapshotState() {
  return {
    briefIntelligenceSubStep: 'short_brief' as const,
    intelligenceSnapshotResult: null,
    intelligenceSnapshotError: null,
    intelligenceSnapshotPhase: 'standard' as const,
    intelligenceLlm1Done: false,
  };
}
