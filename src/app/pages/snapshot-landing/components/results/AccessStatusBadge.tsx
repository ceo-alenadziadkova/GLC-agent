import { CheckCircle, SealCheck, Warning } from '@phosphor-icons/react';
import { SNAPSHOT_LANDING_HERO_COPY } from '../../../../config/snapshot-landing-copy.en';

export function AccessStatusBadge(props: {
  snapshotShowsAccessCallout: boolean;
  snapshotAccessRobotsBlocked: boolean;
  snapshotAccessRobotsLimited: boolean;
}) {
  const { snapshotShowsAccessCallout, snapshotAccessRobotsBlocked, snapshotAccessRobotsLimited } = props;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs lg:mb-3"
      style={{
        background:
          snapshotShowsAccessCallout && snapshotAccessRobotsBlocked
            ? 'color-mix(in oklab, var(--glc-green) 10%, var(--bg-surface))'
            : 'var(--bg-surface)',
        border:
          snapshotShowsAccessCallout && snapshotAccessRobotsBlocked
            ? '1px solid color-mix(in oklab, var(--glc-green) 38%, var(--border-subtle))'
            : '1px solid var(--border-subtle)',
        color: 'var(--text-tertiary)',
      }}
    >
      {snapshotShowsAccessCallout ? (
        snapshotAccessRobotsBlocked ? (
          <>
            <SealCheck className="h-3 w-3 shrink-0 text-[var(--glc-green)]" weight="fill" />
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
          <CheckCircle className="h-3 w-3 text-[var(--glc-green)]" /> {SNAPSHOT_LANDING_HERO_COPY.readyBadge}
        </>
      )}
    </div>
  );
}
