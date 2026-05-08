import { Binoculars } from '@phosphor-icons/react';
import { Link } from 'react-router';
import type { FreeSnapshotPreview } from '../../../../data/auditTypes';
import { Surface } from '../../../../components/ui/surface';
import { SNAPSHOT_LANDING_HERO_COPY } from '../../../../config/snapshot-landing-copy.en';
import { AI_VISIBILITY_GAP_COPY } from '../../../../lib/snapshot-diagnostics';
import { APP_ROUTE_PATHS } from '../../../../config/route-paths';

export function NeuralVisibilitySection(props: { result: FreeSnapshotPreview }) {
  const { result } = props;
  if (!(typeof result.overall_score === 'number' || result.ux_score !== null)) return null;

  return (
    <Surface
      padding="none"
      className="ds-card ds-snapshot-result-card mb-6 rounded-[var(--radius-xl)] p-5 lg:p-6"
    >
      <div className="ds-snapshot-section-h ds-snapshot-section-h--info !mb-3">
        <span className="ds-snapshot-section-h__rule" aria-hidden />
        <Binoculars className="h-4 w-4 shrink-0 text-[var(--text-blue)]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          {SNAPSHOT_LANDING_HERO_COPY.neuralVisibilityTitle}
        </span>
      </div>

      <div className="space-y-3">
        {result.ai_visibility && result.ai_visibility.gaps.length > 0 ? (
          <>
            <p className="text-sm leading-snug text-[var(--text-secondary)]">
              {SNAPSHOT_LANDING_HERO_COPY.aiVisibilityGapsIntroParagraph}
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-snug text-[var(--text-secondary)]">
              {result.ai_visibility.gaps.map(g => (
                <li key={g}>{AI_VISIBILITY_GAP_COPY[g]}</li>
              ))}
            </ul>
            <p className="text-sm leading-snug text-[var(--text-secondary)]">
              {SNAPSHOT_LANDING_HERO_COPY.aiVisibilityDoThisNextParagraph}
            </p>
          </>
        ) : (
          <p className="text-sm leading-snug text-[var(--text-secondary)]">
            {SNAPSHOT_LANDING_HERO_COPY.aiVisibilityNoGapsParagraph}
          </p>
        )}

        <p className="border-t border-[var(--border-subtle)] pt-3 text-xs leading-snug text-[var(--text-tertiary)]">
          {SNAPSHOT_LANDING_HERO_COPY.narrowSnapshotOnlyPrefix}{' '}
          <Link to={APP_ROUTE_PATHS.brief} className="font-semibold text-[var(--text-blue)] no-underline">
            {SNAPSHOT_LANDING_HERO_COPY.continueWithBriefLabel}
          </Link>{' '}
          {SNAPSHOT_LANDING_HERO_COPY.narrowSnapshotSpecialistSuffix}
        </p>
      </div>
    </Surface>
  );
}
