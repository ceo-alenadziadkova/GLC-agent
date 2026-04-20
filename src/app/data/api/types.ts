import { benchmarksApi } from './benchmarks';
import { auditRequestsApi } from './audit-requests';
import { auditsCrudApi } from './audits-crud';
import { auditsPipelineApi } from './audits-pipeline';
import { auditsReviewsReportsApi } from './audits-reviews-reports';
import { auditsStrategyLabApi } from './audits-strategy-lab';
import { auditsOrchestrationApi } from './audits-orchestration';
import { briefProfilePlatformApi } from './brief-profile-platform';
import { dashboardNotificationsApi } from './dashboard-notifications';
import { discoverApi } from './discover';
import { briefPublicApi } from './brief-public';
import { intakeTokensApi } from './intake-tokens';
import { marketingSnapshotIncidentsApi } from './marketing-snapshot-incidents';
import { snapshotCompareApi } from './snapshot-compare';

/** Full SPA API client shape (all domain slices merged). */
export type GlcApi =
  typeof benchmarksApi &
  typeof auditsCrudApi &
  typeof auditsPipelineApi &
  typeof auditsReviewsReportsApi &
  typeof auditsStrategyLabApi &
  typeof auditsOrchestrationApi &
  typeof briefProfilePlatformApi &
  typeof auditRequestsApi &
  typeof dashboardNotificationsApi &
  typeof briefPublicApi &
  typeof intakeTokensApi &
  typeof discoverApi &
  typeof marketingSnapshotIncidentsApi &
  typeof snapshotCompareApi;
