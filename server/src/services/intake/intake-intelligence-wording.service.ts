import type { IntakeSurface } from '@glc/intake-core';
import type { IntakeBriefCollectionMode, ProductMode } from '@glc/intake-core';

import { getBriefQuestionsByIds } from '../../schemas/intake-brief.js';
import { fetchAuditForBriefById } from '../../repositories/audits/audits.repository.js';
import { fetchBriefByAuditId } from '../../repositories/audits/audit-brief.repository.js';
import { fetchCollectedDataRowsForAudit } from '../../repositories/audits/collected-data-for-audit.repository.js';
import { applyReconSuggestedAnswersToResponses } from '../audits/audits-brief.service.js';
import { getLighthouseSummaryForIntelligenceSnapshot } from '../client-project/client-project-collected-enrichment.js';
import { isIntakeIntelligenceWordingLlmEnabled } from '../../config/feature-flags.js';
import {
  buildIntakeFollowupBundleForParams,
  parseAuditProductModeForIntakeBundle,
  parseBriefCollectionModeForIntakeBundle,
} from './intake-followup-candidates.service.js';
import { runIntakeIntelligenceWordingLlm } from './intake-intelligence-snapshot-llm.service.js';
import { buildResponsesSummaryForIntakeSnapshot } from './intake-intelligence-snapshot.service.js';
import { recordIntakeIntelligenceWordingKpi } from './intake-intelligence-wording-kpi.service.js';

const MAX_WORDING_IDS = 32;

function isBriefCellUnanswered(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'object' && v !== null && 'value' in v) {
    const val = (v as { value: unknown }).value;
    if (val === null || val === undefined) return true;
    if (typeof val === 'string') return val.trim() === '';
    if (Array.isArray(val)) return val.length === 0;
    if (val === false) return false;
    return false;
  }
  return true;
}

export type IntakeWordingResult = {
  label_overrides: Record<string, string>;
  hint_overrides: Record<string, string>;
  option_display_overrides: Record<string, string[]>;
  kpi: {
    allowed_wording_id_count: number;
    label_override_key_count: number;
    hint_override_key_count: number;
    option_display_id_count: number;
  };
};

/**
 * B1 second pass: personalized display labels for **unanswered** follow-up bank ids (subset of tailored tail).
 */
export async function runIntakeIntelligenceWordingForResponses(args: {
  responses: Record<string, unknown>;
  productMode: ProductMode;
  collectionMode: IntakeBriefCollectionMode | undefined;
  surface: IntakeSurface;
  auditId: string | null;
  intakeTokenId?: string;
  lighthouseSummary?: Record<string, unknown> | null;
}): Promise<IntakeWordingResult> {
  const bundle = buildIntakeFollowupBundleForParams({
    responses: args.responses,
    productMode: args.productMode,
    collectionMode: args.collectionMode,
    surface: args.surface,
  });
  const unanswered = bundle.questionIds.filter(id => isBriefCellUnanswered(args.responses[id]));
  const allowedWordingIds = unanswered.slice(0, MAX_WORDING_IDS);

  if (allowedWordingIds.length === 0 || !isIntakeIntelligenceWordingLlmEnabled()) {
    const empty: IntakeWordingResult = {
      label_overrides: {},
      hint_overrides: {},
      option_display_overrides: {},
      kpi: {
        allowed_wording_id_count: 0,
        label_override_key_count: 0,
        hint_override_key_count: 0,
        option_display_id_count: 0,
      },
    };
    await recordIntakeIntelligenceWordingKpi({
      auditId: args.auditId,
      intakeTokenId: args.intakeTokenId,
      labelOverrideKeyCount: 0,
      allowedWordingIdCount: 0,
      hintOverrideKeyCount: 0,
      optionDisplayIdCount: 0,
    });
    return empty;
  }

  const questions = getBriefQuestionsByIds(allowedWordingIds);
  const idLabels: Record<string, string> = {};
  const idToCanonicalOptions: Record<string, string[] | undefined> = {};
  for (const q of questions) {
    idLabels[q.id] = q.question;
    if (q.type === 'single_choice' || q.type === 'multi_choice') {
      idToCanonicalOptions[q.id] = q.options && q.options.length > 0 ? [...q.options] : undefined;
    } else {
      idToCanonicalOptions[q.id] = undefined;
    }
  }
  const summary = buildResponsesSummaryForIntakeSnapshot(args.responses);

  let labelOverrides: Record<string, string> = {};
  let hintOverrides: Record<string, string> = {};
  let optionDisplayOverrides: Record<string, string[]> = {};
  let llmError: string | null = null;
  try {
    const out = await runIntakeIntelligenceWordingLlm({
      allowedWordingIds,
      responsesSummary: summary,
      idLabels,
      idToCanonicalOptions,
      lighthouseSummary: args.lighthouseSummary,
    });
    labelOverrides = out.labelOverrides;
    hintOverrides = out.hintOverrides;
    optionDisplayOverrides = out.optionDisplayOverrides;
  } catch (e) {
    llmError = e instanceof Error ? e.message : 'unknown_llm_error';
    labelOverrides = {};
    hintOverrides = {};
    optionDisplayOverrides = {};
  }

  const labelOverrideKeyCount = Object.keys(labelOverrides).length;
  const hintOverrideKeyCount = Object.keys(hintOverrides).length;
  const optionDisplayIdCount = Object.keys(optionDisplayOverrides).length;

  await recordIntakeIntelligenceWordingKpi({
    auditId: args.auditId,
    intakeTokenId: args.intakeTokenId,
    labelOverrideKeyCount,
    allowedWordingIdCount: allowedWordingIds.length,
    hintOverrideKeyCount,
    optionDisplayIdCount,
    llmError: llmError ?? undefined,
  });

  return {
    label_overrides: labelOverrides,
    hint_overrides: hintOverrides,
    option_display_overrides: optionDisplayOverrides,
    kpi: {
      allowed_wording_id_count: allowedWordingIds.length,
      label_override_key_count: labelOverrideKeyCount,
      hint_override_key_count: hintOverrideKeyCount,
      option_display_id_count: optionDisplayIdCount,
    },
  };
}

/**
 * Load persisted `intake_brief` for an audit and run the B1 wording pass (idempotent; safe to call after `PUT /brief`).
 */
export async function runIntakeIntelligenceWordingForAuditId(auditId: string): Promise<IntakeWordingResult | null> {
  const { data: brief, error: briefError } = await fetchBriefByAuditId(auditId);
  if (briefError || !brief) {
    return null;
  }
  const { data: audit, error: auditError } = await fetchAuditForBriefById(auditId);
  if (auditError || !audit) {
    return null;
  }
  const recon = brief.recon_prefills as Record<string, unknown> | undefined;
  const responses = applyReconSuggestedAnswersToResponses(
    (brief.responses as Record<string, unknown>) ?? {},
    recon,
  );
  const productMode = parseAuditProductModeForIntakeBundle(audit.product_mode as string | null);
  const collectionMode = parseBriefCollectionModeForIntakeBundle(brief.collection_mode);
  const row = brief as { collected_by?: string | null };
  const surface: IntakeSurface = row.collected_by === 'client' ? 'client_form' : 'consultant_interview';

  const { rows: collectedRows, error: collectedErr } = await fetchCollectedDataRowsForAudit(auditId);
  if (collectedErr) {
    // Best-effort: wording still works without Lighthouse.
  }
  const lighthouseSummary = getLighthouseSummaryForIntelligenceSnapshot(collectedRows ?? []);

  return runIntakeIntelligenceWordingForResponses({
    responses,
    productMode,
    collectionMode,
    surface,
    auditId,
    lighthouseSummary: lighthouseSummary && Object.keys(lighthouseSummary).length > 0 ? lighthouseSummary : null,
  });
}
