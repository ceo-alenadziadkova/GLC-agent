import { CheckCircle, SealCheck, Warning } from '@phosphor-icons/react';
import { cn } from '../../ui/utils';
import { PORTAL_SNAPSHOT_MIRROR_COPY } from '../config/portal-snapshot-account-mirror-copy.en';
import type { SnapshotMirrorAccessState } from '../model/portal-snapshot-mirror.types';

export function MirrorStatusHeaderSection({
  access,
  hostname,
  location,
}: {
  access: SnapshotMirrorAccessState;
  hostname: string;
  location: string | null;
}) {
  return (
    <div className="text-center lg:text-left">
      <div
        className={cn(
          'mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ds-mirror-status-pill',
          access.showCallout && access.robotsBlocked && 'ds-mirror-status-pill--robots-callout',
        )}
      >
        {access.showCallout ? (
          access.robotsBlocked ? (
            <>
              <SealCheck className="h-3 w-3 shrink-0 text-[var(--score-5)]" weight="fill" />
              {access.robotsLimitedSample
                ? PORTAL_SNAPSHOT_MIRROR_COPY.status.sampledLimited
                : PORTAL_SNAPSHOT_MIRROR_COPY.status.robotsLimited}
            </>
          ) : (
            <>
              <Warning className="h-3 w-3 shrink-0 text-[var(--score-2)]" weight="fill" />
              {PORTAL_SNAPSHOT_MIRROR_COPY.status.incomplete}
            </>
          )
        ) : (
          <>
            <CheckCircle className="h-3 w-3 text-[var(--score-5)]" />
            {PORTAL_SNAPSHOT_MIRROR_COPY.status.ready}
          </>
        )}
      </div>
      <h2
        className="m-0 break-words text-xl font-bold tracking-tight text-[var(--text-primary)] [font-family:var(--font-display)] lg:text-2xl"
      >
        {hostname}
      </h2>
      {location ? (
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          {location}
        </p>
      ) : null}
    </div>
  );
}
