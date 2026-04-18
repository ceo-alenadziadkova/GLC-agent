import type { User } from '@supabase/supabase-js';
import type { FreeSnapshotPreview } from '../../../data/auditTypes';
import type { SnapshotLandingStage } from '../hooks/useSnapshotLandingController';
import { isAnonymousUser } from '../../../lib/snapshot-auth';
import { getSnapshotAccessBlockedState, formatScanCoverageLine } from '../../../lib/snapshot-diagnostics';
import { snapshotClassificationExplainerLine } from '../../../lib/snapshot-landing-helpers';

export type SnapshotLandingViewModel = {
  techEntries: Array<[string, string[]]>;

  snapshotAccess: ReturnType<typeof getSnapshotAccessBlockedState> | null;
  snapshotShowsAccessCallout: boolean;
  snapshotAccessRobotsBlocked: boolean;
  snapshotAccessNoPages: boolean;
  snapshotAccessRobotsLimited: boolean;
  snapshotCalloutLimitations: string[];

  snapshotCoverageCaption: string | null;
  snapshotClassificationExplainer: string | null;
  snapshotLimitations: string[] | null;

  snapshotInsightBlockCount: number;
  snapshotInsightGridClass: string;
  snapshotTechColClass: string;

  hasFullAccount: boolean;
  workspaceEmail: string | null;
};

export function createSnapshotLandingViewModel(params: {
  stage: SnapshotLandingStage;
  result: FreeSnapshotPreview | null;
  accountUser: User | null;
}): SnapshotLandingViewModel {
  const { stage, result, accountUser } = params;

  const techEntries = result
    ? Object.entries(result.tech_stack).filter(([, vals]) => vals.length > 0)
    : [];

  // Important: the access-blocking UI is driven by server-scoped flags + scan coverage interpretation.
  const snapshotAccess =
    stage === 'done' && result ? getSnapshotAccessBlockedState(result) : null;

  const snapshotShowsAccessCallout = snapshotAccess?.showCallout ?? false;
  const snapshotAccessRobotsBlocked = snapshotAccess?.robotsBlocked ?? false;
  const snapshotAccessNoPages = snapshotAccess?.noPages ?? false;
  const snapshotAccessRobotsLimited = snapshotAccess?.robotsLimitedSample ?? false;

  const snapshotCalloutLimitations =
    stage === 'done' && result && snapshotAccessRobotsBlocked && !snapshotAccessRobotsLimited
      ? []
      : (result?.limitations ?? []);

  const snapshotCoverageCaption =
    stage === 'done' && result ? formatScanCoverageLine(result.scan_coverage) : null;

  const snapshotClassificationExplainer =
    stage === 'done' && result ? snapshotClassificationExplainerLine(result) : null;

  const snapshotLimitations =
    stage === 'done' && result?.limitations && result.limitations.length > 0 && !snapshotShowsAccessCallout
      ? result.limitations
      : null;

  const snapshotInsightBlockCount =
    stage === 'done' && result
      ? Number(result.issues.length > 0) +
        Number(result.quick_wins.length > 0) +
        Number(techEntries.length > 0 || (result.tech_stack_tentative?.length ?? 0) > 0)
      : 0;

  const snapshotInsightGridClass =
    snapshotInsightBlockCount === 0
      ? ''
      : [
          'grid gap-4 lg:gap-6 mobile:grid-cols-1',
          snapshotInsightBlockCount === 3 ? 'lg:grid-cols-2 xl:grid-cols-3' : '',
          snapshotInsightBlockCount === 2 ? 'lg:grid-cols-2' : '',
        ]
          .filter(Boolean)
          .join(' ');

  const snapshotTechColClass = snapshotInsightBlockCount === 3 ? 'lg:col-span-2 xl:col-span-1' : '';

  const hasFullAccount = accountUser != null && !isAnonymousUser(accountUser);
  const workspaceEmail =
    hasFullAccount && accountUser.email && accountUser.email.trim().length > 0
      ? accountUser.email.trim()
      : null;

  return {
    techEntries,
    snapshotAccess,
    snapshotShowsAccessCallout,
    snapshotAccessRobotsBlocked,
    snapshotAccessNoPages,
    snapshotAccessRobotsLimited,
    snapshotCalloutLimitations,
    snapshotCoverageCaption,
    snapshotClassificationExplainer,
    snapshotLimitations,
    snapshotInsightBlockCount,
    snapshotInsightGridClass,
    snapshotTechColClass,
    hasFullAccount,
    workspaceEmail,
  };
}

