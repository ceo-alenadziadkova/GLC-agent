import { STRATEGY_INITIATIVE_SCHEMA_VERSION } from '../../config/strategy-initiative-policy.js';
import { StrategyInitiativeSchema } from '../../schemas/domain-output.js';
import { parseStoredStrategyLabContext } from '../../config/strategy-lab-context-policy.js';
import {
  buildDomainIssueIdIndex,
  buildStrategyBriefConstraintSnapshot,
  mergeBriefSnapshotWithLabOverrides,
} from './strategy-brief-constraint-snapshot.js';
import { coerceLegacyStrategyInitiative } from './strategy-initiative-legacy-coerce.js';
import { postProcessStrategyInitiatives, type StrategyInitiativePostProcessed } from './strategy-initiative-post-process.js';

function mapInitiativeArray(
  rawList: unknown,
  briefSnapshot: ReturnType<typeof mergeBriefSnapshotWithLabOverrides>,
  issueIndex: Map<import('@glc/intake-core').DomainKey, Set<string>>,
): StrategyInitiativePostProcessed[] {
  if (!Array.isArray(rawList)) return [];
  const parsedList = rawList
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const rec = item as Record<string, unknown>;
      const p = StrategyInitiativeSchema.safeParse(item);
      if (p.success) return p.data;
      return coerceLegacyStrategyInitiative(rec, briefSnapshot);
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  return postProcessStrategyInitiatives(parsedList, briefSnapshot, issueIndex);
}

/**
 * Normalizes `audit_strategy` row for API clients (v1 coercion, v2 validation, evidence + path flags).
 */
export function normalizeAuditStrategyRowForReadModel(args: {
  strategy: Record<string, unknown> | null;
  domainRows: Array<{ domain_key: string; issues?: unknown }>;
  briefResponses: Record<string, unknown> | null | undefined;
}): Record<string, unknown> | null {
  if (!args.strategy || typeof args.strategy !== 'object') return args.strategy;

  const strategy = { ...args.strategy } as Record<string, unknown>;
  const schemaVersionRaw = strategy.schema_version;
  const schemaVersionFromRow =
    typeof schemaVersionRaw === 'number' && Number.isFinite(schemaVersionRaw)
      ? schemaVersionRaw
      : typeof schemaVersionRaw === 'string'
        ? parseInt(schemaVersionRaw, 10) || STRATEGY_INITIATIVE_SCHEMA_VERSION.v1
        : STRATEGY_INITIATIVE_SCHEMA_VERSION.v1;

  const labRaw = strategy.strategy_lab_context;
  const briefOnly = buildStrategyBriefConstraintSnapshot(args.briefResponses);
  const mergedSnapshot = mergeBriefSnapshotWithLabOverrides(briefOnly, labRaw);
  const issueIndex = buildDomainIssueIdIndex(args.domainRows);

  strategy.strategy_lab_context = parseStoredStrategyLabContext(labRaw);
  strategy.effective_constraints = {
    company_stage: mergedSnapshot.company_stage,
    budget_band: mergedSnapshot.budget_band,
    team_scale: mergedSnapshot.team_scale,
  };

  strategy.quick_wins = mapInitiativeArray(strategy.quick_wins, mergedSnapshot, issueIndex);
  strategy.medium_term = mapInitiativeArray(strategy.medium_term, mergedSnapshot, issueIndex);
  strategy.strategic = mapInitiativeArray(strategy.strategic, mergedSnapshot, issueIndex);
  strategy.schema_version = schemaVersionFromRow;

  return strategy;
}
