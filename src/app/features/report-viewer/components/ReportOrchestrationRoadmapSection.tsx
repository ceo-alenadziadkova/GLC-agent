import { isGlcOrchestrationPackView } from '../../../lib/orchestration-pack-guards';
import { ORCHESTRATION_PANEL_DOM_ID } from '../../../config/orchestration-ui-limits';
import type { DomainKey } from '@glc/intake-core';
import {
  laneIdsForOrchestrationDisplayPreset,
  type OrchestrationLaneDisplayPreset,
} from '../../../config/orchestration-client-roadmap-lanes';
import { REPORT_VIEWER_CONSTANTS } from '../config/report-viewer.constants';
import { REPORT_VIEWER_COPY } from '../config/report-viewer.copy.en';
import { OrchestrationRoadmapPresentational } from './OrchestrationRoadmapPresentational';

export type ReportOrchestrationStrategySlice = {
  glc_orchestration_pack?: unknown;
  orchestration_pack_version?: number;
};

type ReportOrchestrationRoadmapSectionProps = {
  strategy: ReportOrchestrationStrategySlice | null | undefined;
  strategyLabHref: string;
  /** Consultant report: full lanes; client portal: MVP lane subset. */
  laneDisplayPreset?: OrchestrationLaneDisplayPreset;
  /** In-page anchor (e.g. cockpit / Lab link here). */
  sectionDomId?: string;
  selectedDomains?: readonly DomainKey[] | null;
};

const ORCHESTRATION_SECTION_COPY = {
  sectionTitle: REPORT_VIEWER_COPY.orchestration.sectionTitle,
  sectionHint: REPORT_VIEWER_COPY.orchestration.sectionHint,
  versionLabel: REPORT_VIEWER_COPY.orchestration.versionLabel,
  openStrategyLab: REPORT_VIEWER_COPY.orchestration.openStrategyLab,
  dependencyTitle: REPORT_VIEWER_COPY.orchestration.dependencyTitle,
  dependencyHint: REPORT_VIEWER_COPY.orchestration.dependencyHint,
} as const;

export function ReportOrchestrationRoadmapSection({
  strategy,
  strategyLabHref,
  laneDisplayPreset = 'full',
  sectionDomId = ORCHESTRATION_PANEL_DOM_ID,
  selectedDomains,
}: ReportOrchestrationRoadmapSectionProps) {
  const rawPack = strategy?.glc_orchestration_pack;
  if (!isGlcOrchestrationPackView(rawPack)) {
    return null;
  }

  const pack = rawPack;
  const laneOrder = laneIdsForOrchestrationDisplayPreset(laneDisplayPreset);

  return (
    <OrchestrationRoadmapPresentational
      pack={pack}
      packVersion={strategy?.orchestration_pack_version}
      strategyLabHref={strategyLabHref}
      laneOrder={laneOrder}
      selectedDomains={selectedDomains}
      maxDependencyLinks={REPORT_VIEWER_CONSTANTS.orchestration.maxDependencyLinksDisplayed}
      showOpenLabButton
      copy={ORCHESTRATION_SECTION_COPY}
      motionCardEnterOffsetY={REPORT_VIEWER_CONSTANTS.motion.cardEnterOffsetY}
      motionCardEnterDurationSec={REPORT_VIEWER_CONSTANTS.motion.cardEnterDurationSec}
      domId={sectionDomId}
    />
  );
}
