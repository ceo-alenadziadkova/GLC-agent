import { PORTAL_SNAPSHOT_MIRROR_COPY } from '../config/portal-snapshot-account-mirror-copy.en';
import { PORTAL_SNAPSHOT_MIRROR_CONSTANTS } from '../config/portal-snapshot-account-mirror.constants';

export function MirrorSiteReadSection({
  siteLine,
  classificationExplainer,
  confidenceBand,
}: {
  siteLine: string | null;
  classificationExplainer: string | null;
  confidenceBand: string | null | undefined;
}) {
  if (!siteLine) return null;
  return (
    <div
      className="ds-card ds-snapshot-result-card p-5 text-left lg:p-6"
      style={PORTAL_SNAPSHOT_MIRROR_CONSTANTS.styles.cardOutlined}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        {PORTAL_SNAPSHOT_MIRROR_COPY.siteRead.title}
      </p>
      <p className="m-0 text-sm leading-relaxed text-[var(--text-secondary)]">
        {siteLine}
      </p>
      {confidenceBand ? (
        <p className="mb-0 mt-2 text-xs text-[var(--text-quaternary)]">
          {PORTAL_SNAPSHOT_MIRROR_COPY.siteRead.confidencePrefix} {confidenceBand}
        </p>
      ) : null}
      {classificationExplainer ? (
        <p className="mb-0 mt-2 text-xs leading-relaxed text-[var(--text-quaternary)]">
          {classificationExplainer}
        </p>
      ) : null}
    </div>
  );
}
