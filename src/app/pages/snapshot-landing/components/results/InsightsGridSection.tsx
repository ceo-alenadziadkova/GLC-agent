import { CheckCircle, Lightning, Shield, Warning } from '@phosphor-icons/react';
import type { FreeSnapshotPreview } from '../../../../data/auditTypes';
import { Surface } from '../../../../components/ui/surface';
import { SNAPSHOT_LANDING_HERO_COPY } from '../../../../config/snapshot-landing-copy.en';
import { UI_POLICY } from '../../../../config/ui-policy';
import { SEVERITY_COLOR } from '../../../../lib/snapshot-landing-helpers';
import { flattenDetectedTech } from '../../selectors';

export function InsightsGridSection(props: {
  result: FreeSnapshotPreview;
  snapshotInsightBlockCount: number;
  snapshotInsightGridClass: string;
  snapshotTechColClass: string;
  techEntries: Array<[string, string[]]>;
}) {
  const { result, snapshotInsightBlockCount, snapshotInsightGridClass, snapshotTechColClass, techEntries } = props;
  if (snapshotInsightBlockCount <= 0) return null;
  const detectedTech = flattenDetectedTech(techEntries);

  return (
    <div className={`mb-6 ${snapshotInsightGridClass}`}>
      {result.issues.length > 0 && (
        <Surface className="glc-card glc-snapshot-result-card p-5 lg:p-6" style={{ borderRadius: 'var(--radius-xl)' }}>
          <div className="glc-snapshot-section-h glc-snapshot-section-h--warning">
            <span className="glc-snapshot-section-h__rule" aria-hidden />
            <Warning className="h-4 w-4 shrink-0 text-[var(--score-2)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {SNAPSHOT_LANDING_HERO_COPY.topIssuesTitle}
            </span>
          </div>
          <div className="space-y-1">
            {result.issues.map((issue, i) => (
              <div key={i} className="glc-snapshot-insight-row flex gap-3">
                <div
                  className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full"
                  style={{
                    backgroundColor: SEVERITY_COLOR[issue.severity] ?? 'var(--text-tertiary)',
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
        </Surface>
      )}

      {result.quick_wins.length > 0 && (
        <Surface className="glc-card glc-snapshot-result-card p-5 lg:p-6" style={{ borderRadius: 'var(--radius-xl)' }}>
          <div className="glc-snapshot-section-h glc-snapshot-section-h--positive">
            <span className="glc-snapshot-section-h__rule" aria-hidden />
            <Lightning className="h-4 w-4 shrink-0 text-[var(--glc-green)]" weight="fill" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {SNAPSHOT_LANDING_HERO_COPY.quickWinsTitle}
            </span>
          </div>
          <div className="space-y-1">
            {result.quick_wins.map((qw, i) => (
              <div key={i} className="glc-snapshot-insight-row flex gap-3">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--glc-green)]" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {qw.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                    {qw.effort} effort · {qw.timeframe}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Surface>
      )}

      {(techEntries.length > 0 || (result.tech_stack_tentative?.length ?? 0) > 0) && (
        <Surface
          className={`glc-card glc-snapshot-result-card p-5 lg:p-6 ${snapshotTechColClass}`}
          style={{ borderRadius: 'var(--radius-xl)' }}
        >
          <div className="glc-snapshot-section-h glc-snapshot-section-h--info !mb-3">
            <span className="glc-snapshot-section-h__rule" aria-hidden />
            <Shield className="h-4 w-4 shrink-0 text-[var(--glc-blue)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {SNAPSHOT_LANDING_HERO_COPY.techStackTitle}
            </span>
          </div>
          {detectedTech.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {detectedTech.slice(0, UI_POLICY.snapshotLanding.maxDetectedTechPills).map((tech, i) => (
                <span
                  key={i}
                  className="glc-snapshot-signal-pill rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{
                    background: 'var(--bg-inset)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          )}
          {(result.tech_stack_tentative?.length ?? 0) > 0 && (
            <div className={detectedTech.length > 0 ? 'mt-4' : ''}>
              <p className="mb-2 text-xs leading-relaxed text-[var(--text-tertiary)]">
                {SNAPSHOT_LANDING_HERO_COPY.tentativeTechTitle}
              </p>
              <div className="flex flex-wrap gap-2">
                {(result.tech_stack_tentative ?? []).slice(0, UI_POLICY.snapshotLanding.maxTentativeTechPills).map((t, i) => (
                  <span
                    key={i}
                    title={t.signal}
                    className="glc-snapshot-signal-pill rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      background: 'transparent',
                      border: '1px dashed var(--border-default)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Surface>
      )}
    </div>
  );
}
