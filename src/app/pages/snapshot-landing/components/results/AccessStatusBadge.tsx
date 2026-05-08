import { CheckCircle, SealCheck, Warning } from '@phosphor-icons/react';
import { SNAPSHOT_LANDING_HERO_COPY } from '../../../../config/snapshot-landing-copy.en';
import { cn } from '../../../../components/ui/utils';

export function AccessStatusBadge(props: {
  snapshotShowsAccessCallout: boolean;
  snapshotAccessRobotsBlocked: boolean;
  snapshotAccessRobotsLimited: boolean;
}) {
  const { snapshotShowsAccessCallout, snapshotAccessRobotsBlocked, snapshotAccessRobotsLimited } = props;
  const robotsLimitedBadge = snapshotShowsAccessCallout && snapshotAccessRobotsBlocked;

  return (
    <div
      className={cn(
        'mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-[var(--text-tertiary)] lg:mb-3',
        'border-[length:var(--border-width-default)] border-solid',
        robotsLimitedBadge
          ? 'border-[color-mix(in_oklab,var(--score-5)_38%,var(--border-subtle))] bg-[color-mix(in_oklab,var(--score-5)_10%,var(--bg-surface))]'
          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]',
      )}
    >
      {snapshotShowsAccessCallout ? (
        snapshotAccessRobotsBlocked ? (
          <>
            <SealCheck className="h-3 w-3 shrink-0 text-[var(--score-5)]" weight="fill" />
            {snapshotAccessRobotsLimited
              ? SNAPSHOT_LANDING_HERO_COPY.accessLimitedSample
              : SNAPSHOT_LANDING_HERO_COPY.accessLimitedRobots}
          </>
        ) : (
          <>
            <Warning className="h-3 w-3 shrink-0 text-[var(--score-2)]" weight="fill" />
            {SNAPSHOT_LANDING_HERO_COPY.accessIncomplete}
          </>
        )
      ) : (
        <>
          <CheckCircle className="h-3 w-3 text-[var(--score-5)]" /> {SNAPSHOT_LANDING_HERO_COPY.readyBadge}
        </>
      )}
    </div>
  );
}
