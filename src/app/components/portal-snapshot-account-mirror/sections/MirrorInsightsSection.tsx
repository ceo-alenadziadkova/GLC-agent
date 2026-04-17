import { CheckCircle, Lightning, Shield, Warning } from '@phosphor-icons/react';
import type { SnapshotIssue, SnapshotQuickWin } from '../config/portal-snapshot-account-mirror.constants';
import {
  PORTAL_SNAPSHOT_MIRROR_CONSTANTS,
  PORTAL_SNAPSHOT_SEVERITY_COLOR,
} from '../config/portal-snapshot-account-mirror.constants';
import { PORTAL_SNAPSHOT_MIRROR_COPY } from '../config/portal-snapshot-account-mirror-copy.en';

export function MirrorInsightsSection({
  issues,
  quickWins,
  techChips,
}: {
  issues: SnapshotIssue[];
  quickWins: SnapshotQuickWin[];
  techChips: string[];
}) {
  if (issues.length < 1 && quickWins.length < 1 && techChips.length < 1) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {issues.length > 0 ? (
        <div className="glc-card glc-snapshot-result-card p-5 lg:p-6" style={PORTAL_SNAPSHOT_MIRROR_CONSTANTS.styles.cardRadius}>
          <div className="glc-snapshot-section-h glc-snapshot-section-h--warning">
            <span className="glc-snapshot-section-h__rule" aria-hidden />
            <Warning className="h-4 w-4 shrink-0 text-[var(--score-2)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {PORTAL_SNAPSHOT_MIRROR_COPY.issues.title}
            </span>
          </div>
          <div className="space-y-1">
            {issues.map(issue => (
              <div key={issue.id} className="glc-snapshot-insight-row flex gap-3">
                <div
                  className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full"
                  style={{
                    backgroundColor: PORTAL_SNAPSHOT_SEVERITY_COLOR[issue.severity] ?? 'var(--text-tertiary)',
                    marginTop: 6,
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {issue.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                    {issue.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {quickWins.length > 0 ? (
        <div className="glc-card glc-snapshot-result-card p-5 lg:p-6" style={PORTAL_SNAPSHOT_MIRROR_CONSTANTS.styles.cardRadius}>
          <div className="glc-snapshot-section-h glc-snapshot-section-h--positive">
            <span className="glc-snapshot-section-h__rule" aria-hidden />
            <Lightning className="h-4 w-4 shrink-0 text-[var(--glc-green)]" weight="fill" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {PORTAL_SNAPSHOT_MIRROR_COPY.quickWins.title}
            </span>
          </div>
          <div className="space-y-1">
            {quickWins.map(qw => (
              <div key={qw.id} className="glc-snapshot-insight-row flex gap-3">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--glc-green)]" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {qw.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                    {qw.effort} · {qw.timeframe}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {techChips.length > 0 ? (
        <div className="glc-card glc-snapshot-result-card p-5 lg:p-6 lg:col-span-2" style={PORTAL_SNAPSHOT_MIRROR_CONSTANTS.styles.cardRadius}>
          <div className="glc-snapshot-section-h glc-snapshot-section-h--info !mb-3">
            <span className="glc-snapshot-section-h__rule" aria-hidden />
            <Shield className="h-4 w-4 shrink-0 text-[var(--glc-blue)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {PORTAL_SNAPSHOT_MIRROR_COPY.techStack.title}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {techChips.map((tech, i) => (
              <span
                key={i}
                className="glc-snapshot-signal-pill rounded-full px-2.5 py-1 text-xs font-medium"
                style={PORTAL_SNAPSHOT_MIRROR_CONSTANTS.styles.pillInset}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
