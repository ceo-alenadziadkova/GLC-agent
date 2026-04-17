export {
  DOMAIN_DISPLAY_LABELS as DOMAIN_LABELS,
  DOMAIN_KEYS,
  SCORE_COLORS,
  SCORE_LABELS,
} from '@glc/intake-core';
export type { DomainKey } from '@glc/intake-core';

export {
  AUDIT_COVERAGE_PACKAGES,
  COMPLETE_AUDIT_COVERAGE_PACKAGE,
  DEFAULT_AUDIT_COVERAGE_PACKAGE,
  EXPRESS_PRODUCT_MODE,
  FREE_SNAPSHOT_PRODUCT_MODE,
  FULL_PRODUCT_MODE,
  INTAKE_BRIEF_SLA_PRODUCT_MODE,
  PRO_AUDIT_COVERAGE_PACKAGE,
  STARTER_AUDIT_COVERAGE_PACKAGE,
} from '../config/audit-product-policy';

export type {
  AuditCoveragePackage,
  AuditDepth,
  AuditMeta,
  AuditRequest,
  AuditRequestStatus,
  CrawledPage,
  ProductMode,
  ReconData,
  UserRole,
} from './audit/contracts/core/audit-meta.types';

export type {
  BriefResponseEntry,
  BriefResponseSource,
  BriefResponseValue,
  IntakeBrief,
  IntakeBriefCollectionMode,
  IntakeNextBestAction,
  IntakeReadinessBadge,
  IntakeVersionTuple,
  ReconConflict,
} from './audit/contracts/intake/intake-brief.types';

export type {
  FreeSnapshotPreview,
  SnapshotCompetitorComparison,
  SnapshotScanCoverageApi,
  SnapshotSiteProfile,
} from './audit/contracts/snapshot/free-snapshot.types';

export type {
  AuditIssue,
  ConfidenceDistribution,
  ConfidenceLevel,
  DataSource,
  DomainData,
  EvidenceRef,
  QuickWin,
  Recommendation,
  ScorecardEntry,
  StrategyInitiative,
  StrategyRoadmap,
} from './audit/contracts/report/report-domain.types';

export type {
  ControlObjectGovernanceView,
  GovernanceDecisionHint,
  PipelineEvent,
  QualityFlag,
  QualityGateReport,
  RefineRecommendedEventData,
  ReviewPoint,
} from './audit/contracts/pipeline/pipeline.types';

export type {
  NotificationItem,
  NotificationKind,
  NotificationPayload,
} from './audit/contracts/notifications/notification.types';

export type { AuditState } from './audit/contracts/state/audit-state.types';
