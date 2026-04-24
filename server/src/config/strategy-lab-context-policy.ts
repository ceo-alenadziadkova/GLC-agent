import { z } from 'zod';
import { DOMAIN_KEYS, type DomainKey } from '@glc/intake-core';

import {
  STRATEGY_COMPANY_STAGES,
  STRATEGY_CONSTRAINT_BUDGET_BANDS,
  STRATEGY_CONSTRAINT_TEAM_SCALES,
  type StrategyCompanyStage,
  type StrategyConstraintBudgetBand,
  type StrategyConstraintTeamScale,
} from './strategy-initiative-policy.js';

const companyStageEnum = z.enum(STRATEGY_COMPANY_STAGES);
const budgetBandEnum = z.enum(STRATEGY_CONSTRAINT_BUDGET_BANDS);
const teamScaleEnum = z.enum(STRATEGY_CONSTRAINT_TEAM_SCALES);

const domainKeyEnum = z.enum(DOMAIN_KEYS);

/** Persisted shape on `audit_strategy.strategy_lab_context` (subset only). */
export type StrategyLabContextPersisted = {
  company_stage?: StrategyCompanyStage;
  budget_band?: StrategyConstraintBudgetBand;
  team_scale?: StrategyConstraintTeamScale;
  /**
   * Domains marked for an explicit stage-2 (deep) director follow-up; product signal only until
   * pipeline/UI runbook consumes it. Does not trigger automatic re-runs.
   */
  director_stage2_domains?: DomainKey[];
};

/** PATCH body: `null` clears an override (revert to brief); omit = leave unchanged. */
export const StrategyLabContextPatchSchema = z
  .object({
    company_stage: z.union([companyStageEnum, z.null()]).optional(),
    budget_band: z.union([budgetBandEnum, z.null()]).optional(),
    team_scale: z.union([teamScaleEnum, z.null()]).optional(),
    director_stage2_domains: z.union([z.array(domainKeyEnum).max(6), z.null()]).optional(),
  })
  .strict();

export type StrategyLabContextPatch = z.infer<typeof StrategyLabContextPatchSchema>;

/**
 * Parses stored JSON from DB into a safe persisted object (unknown keys ignored).
 */
export function parseStoredStrategyLabContext(raw: unknown): StrategyLabContextPersisted {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  const out: StrategyLabContextPersisted = {};
  const cs = companyStageEnum.safeParse(r.company_stage);
  if (cs.success) out.company_stage = cs.data;
  const bb = budgetBandEnum.safeParse(r.budget_band);
  if (bb.success) out.budget_band = bb.data;
  const ts = teamScaleEnum.safeParse(r.team_scale);
  if (ts.success) out.team_scale = ts.data;
  const d2 = z.array(domainKeyEnum).max(6).safeParse(r.director_stage2_domains);
  if (d2.success && d2.data.length > 0) {
    out.director_stage2_domains = [...new Set(d2.data)] as DomainKey[];
  }
  return out;
}

export function mergeStrategyLabContextForStorage(
  existing: unknown,
  patch: StrategyLabContextPatch,
): StrategyLabContextPersisted {
  const cur = parseStoredStrategyLabContext(existing);
  const next: StrategyLabContextPersisted = { ...cur };
  if ('company_stage' in patch) {
    if (patch.company_stage === null) delete next.company_stage;
    else if (patch.company_stage !== undefined) next.company_stage = patch.company_stage;
  }
  if ('budget_band' in patch) {
    if (patch.budget_band === null) delete next.budget_band;
    else if (patch.budget_band !== undefined) next.budget_band = patch.budget_band;
  }
  if ('team_scale' in patch) {
    if (patch.team_scale === null) delete next.team_scale;
    else if (patch.team_scale !== undefined) next.team_scale = patch.team_scale;
  }
  if ('director_stage2_domains' in patch) {
    if (patch.director_stage2_domains === null) delete next.director_stage2_domains;
    else if (patch.director_stage2_domains !== undefined) {
      next.director_stage2_domains = [...new Set(patch.director_stage2_domains)];
    }
  }
  return next;
}
