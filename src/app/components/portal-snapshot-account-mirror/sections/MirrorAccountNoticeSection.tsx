import { PORTAL_SNAPSHOT_MIRROR_COPY } from '../config/portal-snapshot-account-mirror-copy.en';

export function MirrorAccountNoticeSection() {
  return (
    <div className="ds-portal-mirror-notice-panel rounded-xl px-4 py-3.5 lg:px-5">
      <p className="m-0 text-xs font-semibold uppercase tracking-wide ds-text-brand" >
        {PORTAL_SNAPSHOT_MIRROR_COPY.accountNotice.eyebrow}
      </p>
      <p className="mt-2 mb-0 text-sm leading-relaxed ds-text-secondary" >
        {PORTAL_SNAPSHOT_MIRROR_COPY.accountNotice.bodyPrefix}{' '}
        <strong className="ds-text-primary font-semibold">
          {PORTAL_SNAPSHOT_MIRROR_COPY.accountNotice.bodyStrong}
        </strong>{' '}
        - {PORTAL_SNAPSHOT_MIRROR_COPY.accountNotice.bodySuffix}
      </p>
    </div>
  );
}
