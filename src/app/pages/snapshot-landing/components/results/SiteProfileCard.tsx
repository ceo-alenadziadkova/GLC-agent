import type { FreeSnapshotPreview } from '../../../../data/auditTypes';
import { SNAPSHOT_LANDING_HERO_COPY } from '../../../../config/snapshot-landing-copy.en';
import { siteProfileSoftLine } from '../../../../lib/snapshot-landing-helpers';

export function SiteProfileCard(props: {
  result: FreeSnapshotPreview;
  snapshotClassificationExplainer: string | null;
}) {
  const { result, snapshotClassificationExplainer } = props;
  const profileLine = siteProfileSoftLine(result.site_profile);
  if (!profileLine) return null;

  return (
    <div
      className="glc-card glc-snapshot-result-card mb-4 p-5 text-left lg:p-6"
      style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>
        {SNAPSHOT_LANDING_HERO_COPY.siteReadAdvisoryTitle}
      </p>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {profileLine}
      </p>
      {(result.classification_confidence_band || result.site_profile?.classificationConfidenceBand) && (
        <p className="mt-2 text-xs" style={{ color: 'var(--text-quaternary)' }}>
          {SNAPSHOT_LANDING_HERO_COPY.classificationConfidencePrefix}{' '}
          {result.classification_confidence_band ?? result.site_profile?.classificationConfidenceBand}
        </p>
      )}
      {snapshotClassificationExplainer ? (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
          {snapshotClassificationExplainer}
        </p>
      ) : null}
    </div>
  );
}
