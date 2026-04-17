import type { ControlObjectV1 } from '../../../schemas/control-object/index.js';
import type { DomainKey, DomainResult } from '../../../types/audit.js';
import type { ConnectorRunResult } from '../../connector-runner.js';
import {
  getHighestPrioritySource,
  mapDataSourceToTruthSource,
  normalizeTruthSourcesList,
  type TruthSourceId,
} from '../../../config/truth-registry.js';

export function buildTrace(params: {
  co: ControlObjectV1;
  issues: DomainResult['issues'];
  domainKey: DomainKey;
  phaseNumber: number;
  connectorEnrichments: ConnectorRunResult[];
}): void {
  const { co, issues, domainKey, phaseNumber, connectorEnrichments } = params;

  // ─── Trace ────────────────────────────────────────────────
  // v1.5+: truth_source resolved via Truth Registry helper (canonical mapping)
  // v2.1+: truth_sources[] lists contributing tiers; truth_source = priority winner
  // v2.2+: merge connector tier (external_api | document_feed) when connector confirmed claim type

  const issueTitleMatchesConfirmedType = (title: string, ft: string): boolean =>
    title.toLowerCase().includes(ft.replace(/_/g, ' '));

  function externalTierForIssue(title: string): TruthSourceId | null {
    let best: TruthSourceId | null = null;
    for (const r of connectorEnrichments) {
      if (r.timed_out || r.error !== null) continue;
      const hit = r.confirmed_fact_types.some(ft => issueTitleMatchesConfirmedType(title, ft));
      if (!hit) continue;
      if (r.source_tier === 'document_feed') {
        best = 'document_feed';
        break;
      }
      if (r.source_tier === 'external_api') best = 'external_api';
    }
    return best;
  }

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const baseSource = mapDataSourceToTruthSource(issue.data_source ?? 'inferred');
    const tiers: TruthSourceId[] = [baseSource];
    const ext = externalTierForIssue(issue.title);
    if (ext) tiers.push(ext);
    const truthSources = normalizeTruthSourcesList(tiers);
    const truthSource = getHighestPrioritySource(truthSources);

    co.trace.claim_sources.push({
      claim_id: i + 1,
      agent: phaseNumber,
      section: `Phase ${phaseNumber} — ${domainKey}`,
      truth_source: truthSource,
      truth_sources: truthSources,
    });
  }

  co.counts.statuses.confirmed_external = co.trace.claim_sources.filter(
    cs => cs.truth_sources.includes('external_api') || cs.truth_sources.includes('document_feed'),
  ).length;
}

