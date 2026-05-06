import { ORCHESTRATION_PANEL_DOM_ID, ORCHESTRATION_UI_LIMITS } from '../../../config/orchestration-ui-limits';
import { REPORT_VIEWER_UI } from '../../../config/report-viewer-ui';

export const REPORT_VIEWER_CONSTANTS = {
  dateLocale: 'en-US',
  totalDomainCount: 6,
  scoreMax: 5,
  summaryPreviewMaxWidthPx: 480,
  scoreRing: {
    sizePx: 72,
    center: 36,
    radius: 28,
    strokeWidth: 4,
  },
  findings: {
    maxPinnedItems: 5,
  },
  quickWins: {
    maxItems: 8,
  },
  followUp: {
    estimatedMinutes: 3,
  },
  orchestration: {
    maxDependencyLinksDisplayed: ORCHESTRATION_UI_LIMITS.maxDependencyLinksDisplayed,
  },
  roadmapCockpit: {
    /** Max critical issues considered for the cockpit “primary focus” line. */
    maxDiagnosisIssues: 1,
    /** In-page anchors for cockpit CTAs (must match corresponding `id` attributes). */
    anchors: {
      cockpit: 'glc-roadmap-cockpit',
      domainScorecard: 'report-domain-scorecard',
      executionRoadmap: ORCHESTRATION_PANEL_DOM_ID,
    },
  },
  sectionAnchors: {
    hero: 'report-hero',
    analysis: 'report-analysis',
    coverage: 'report-coverage',
    scorecard: 'report-scorecard',
    findings: 'report-findings',
    followUp: 'report-follow-up',
    executionLog: 'report-execution-log',
  },
  motion: {
    heroEnterOffsetY: 14,
    heroEnterDurationSec: 0.38,
    cardEnterOffsetY: 10,
    cardEnterDurationSec: 0.32,
    followUpEnterOffsetY: 8,
    followUpEnterDurationSec: 0.25,
    quickWinEnterOffsetX: -6,
    quickWinDelayStartSec: 0.15,
    quickWinStaggerDelaySec: 0.07,
    quickWinEnterDurationSec: 0.28,
  },
  profileMaxItems: REPORT_VIEWER_UI.profileMaxItems,
  easing: REPORT_VIEWER_UI.easing,
  list: REPORT_VIEWER_UI.motion,
} as const;
