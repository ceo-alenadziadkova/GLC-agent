import { ensureHttpsUrl } from '@glc/intake-core';
import type { FreeSnapshotPreview } from '../../../data/auditTypes';
import { formatScanCoverageLine, getSnapshotAccessBlockedState } from '../../../lib/snapshot-diagnostics';
import {
  snapshotClassificationExplainerLine,
  snapshotLegacyUxBand,
  snapshotSiteProfileSoftLine,
} from '../../snapshot/SnapshotScoreKit';
import { mapTechStackToChips } from '../mappers/mirror-tech-stack.mapper';
import type { PortalSnapshotMirrorViewModel, SnapshotScoreVisualModel } from './portal-snapshot-mirror.types';

function buildSnapshotHostname(result: FreeSnapshotPreview): string {
  if (result.company_name?.trim()) return result.company_name.trim();
  try {
    return new URL(ensureHttpsUrl(result.company_url)).hostname;
  } catch {
    return result.company_url;
  }
}

function buildScoreVisualModel(result: FreeSnapshotPreview): SnapshotScoreVisualModel {
  if (typeof result.overall_score === 'number') {
    return { mode: 'overall', overallScore: result.overall_score };
  }
  return {
    mode: 'legacy',
    band: snapshotLegacyUxBand(result.ux_score),
    uxLabel: result.ux_label,
  };
}

function shouldShowSnapshotScoreBlock(result: FreeSnapshotPreview): boolean {
  return (
    result.ux_score !== null ||
    typeof result.overall_score === 'number' ||
    result.category_scores != null ||
    Boolean(result.ux_summary?.trim())
  );
}

export function buildPortalSnapshotMirrorViewModel(result: FreeSnapshotPreview): PortalSnapshotMirrorViewModel {
  const access = getSnapshotAccessBlockedState(result);
  return {
    result,
    access,
    calloutLimitations: access.robotsBlocked && !access.robotsLimitedSample ? [] : (result.limitations ?? []),
    coverageLine: formatScanCoverageLine(result.scan_coverage),
    hostname: buildSnapshotHostname(result),
    siteLine: snapshotSiteProfileSoftLine(result.site_profile),
    classificationExplainer: snapshotClassificationExplainerLine(result),
    showSnapshotScoreBlock: shouldShowSnapshotScoreBlock(result),
    hasSummary: Boolean(result.ux_summary?.trim()),
    scoreVisual: buildScoreVisualModel(result),
    issues: result.issues,
    quickWins: result.quick_wins,
    programRecommendations: result.program_recommendations ?? [],
    signalsFound: result.signals_found ?? [],
    techChips: mapTechStackToChips(result.tech_stack),
  };
}
