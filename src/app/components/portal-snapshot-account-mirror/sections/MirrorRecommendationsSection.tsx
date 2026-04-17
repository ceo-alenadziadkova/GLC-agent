import { Target } from '@phosphor-icons/react';
import type { ProgramRecommendation } from '../config/portal-snapshot-account-mirror.constants';
import { PORTAL_SNAPSHOT_MIRROR_COPY } from '../config/portal-snapshot-account-mirror-copy.en';
import { PORTAL_SNAPSHOT_MIRROR_CONSTANTS } from '../config/portal-snapshot-account-mirror.constants';

export function MirrorRecommendationsSection({ recommendations }: { recommendations: ProgramRecommendation[] }) {
  if (recommendations.length < 1) return null;
  return (
    <div
      className="glc-card glc-snapshot-result-card p-5 lg:p-6"
      style={PORTAL_SNAPSHOT_MIRROR_CONSTANTS.styles.cardOutlined}
    >
      <div className="glc-snapshot-section-h glc-snapshot-section-h--info !mb-3">
        <span className="glc-snapshot-section-h__rule" aria-hidden />
        <Target className="h-4 w-4 shrink-0 text-[var(--glc-blue)]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          {PORTAL_SNAPSHOT_MIRROR_COPY.recommendations.title}
        </span>
      </div>
      <div className="space-y-3">
        {recommendations.map(rec => (
          <div key={rec.id} className="glc-snapshot-insight-row flex gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {rec.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-tertiary)]">
                {rec.description}
              </p>
              <p className="mb-0 mt-1 text-[0.65rem] uppercase tracking-wide text-[var(--text-quaternary)]">
                {PORTAL_SNAPSHOT_MIRROR_COPY.recommendations.priorityPrefix} {rec.priority}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
