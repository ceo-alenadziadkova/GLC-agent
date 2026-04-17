import { PORTAL_SNAPSHOT_MIRROR_COPY } from '../config/portal-snapshot-account-mirror-copy.en';

export function MirrorAccountNoticeSection() {
  return (
    <div
      className="rounded-xl px-4 py-3.5 lg:px-5"
      style={{
        border: '1px solid rgba(28,189,255,0.22)',
        background: 'linear-gradient(135deg, rgba(28,189,255,0.10) 0%, rgba(28,189,255,0.02) 100%)',
      }}
    >
      <p className="m-0 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--glc-blue)' }}>
        {PORTAL_SNAPSHOT_MIRROR_COPY.accountNotice.eyebrow}
      </p>
      <p className="mt-2 mb-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {PORTAL_SNAPSHOT_MIRROR_COPY.accountNotice.bodyPrefix}{' '}
        <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {PORTAL_SNAPSHOT_MIRROR_COPY.accountNotice.bodyStrong}
        </strong>{' '}
        - {PORTAL_SNAPSHOT_MIRROR_COPY.accountNotice.bodySuffix}
      </p>
    </div>
  );
}
