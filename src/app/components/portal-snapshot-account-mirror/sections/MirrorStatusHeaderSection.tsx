import { CheckCircle, SealCheck, Warning } from '@phosphor-icons/react';
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
        className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"
        style={{
          background:
            access.showCallout && access.robotsBlocked
              ? 'color-mix(in oklab, var(--glc-green) 10%, var(--bg-surface))'
              : 'var(--bg-surface)',
          border:
            access.showCallout && access.robotsBlocked
              ? '1px solid color-mix(in oklab, var(--glc-green) 38%, var(--border-subtle))'
              : '1px solid var(--border-subtle)',
          color: 'var(--text-tertiary)',
        }}
      >
        {access.showCallout ? (
          access.robotsBlocked ? (
            <>
              <SealCheck className="h-3 w-3 shrink-0" style={{ color: 'var(--glc-green)' }} weight="fill" />
              {access.robotsLimitedSample
                ? PORTAL_SNAPSHOT_MIRROR_COPY.status.sampledLimited
                : PORTAL_SNAPSHOT_MIRROR_COPY.status.robotsLimited}
            </>
          ) : (
            <>
              <Warning className="h-3 w-3 shrink-0" style={{ color: 'var(--score-2)' }} weight="fill" />
              {PORTAL_SNAPSHOT_MIRROR_COPY.status.incomplete}
            </>
          )
        ) : (
          <>
            <CheckCircle className="h-3 w-3" style={{ color: 'var(--glc-green)' }} />
            {PORTAL_SNAPSHOT_MIRROR_COPY.status.ready}
          </>
        )}
      </div>
      <h2
        className="m-0 break-words text-xl font-bold tracking-tight lg:text-2xl"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
      >
        {hostname}
      </h2>
      {location ? (
        <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {location}
        </p>
      ) : null}
    </div>
  );
}
