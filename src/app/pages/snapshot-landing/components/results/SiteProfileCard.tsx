import type { FreeSnapshotPreview } from '../../../../data/auditTypes';
import { Surface } from '../../../../components/ui/surface';
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
    <Surface
      padding="none"
      className="ds-card ds-snapshot-result-card mb-4 rounded-[var(--radius-xl)] p-5 text-left lg:p-6"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        {SNAPSHOT_LANDING_HERO_COPY.siteReadAdvisoryTitle}
      </p>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{profileLine}</p>
      {(result.classification_confidence_band || result.site_profile?.classificationConfidenceBand) && (
        <p className="mt-2 text-xs text-[var(--text-quaternary)]">
          {SNAPSHOT_LANDING_HERO_COPY.classificationConfidencePrefix}{' '}
          {result.classification_confidence_band ?? result.site_profile?.classificationConfidenceBand}
        </p>
      )}
      {snapshotClassificationExplainer ? (
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-quaternary)]">{snapshotClassificationExplainer}</p>
      ) : null}
    </Surface>
  );
}
