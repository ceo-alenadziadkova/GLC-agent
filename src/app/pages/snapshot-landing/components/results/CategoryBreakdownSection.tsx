import type { FreeSnapshotPreview } from '../../../../data/auditTypes';
import { Surface } from '../../../../components/ui/surface';
import { SNAPSHOT_LANDING_HERO_COPY } from '../../../../config/snapshot-landing-copy.en';
import { CategoryBreakdownHint } from '../..';
import { createCategoryScoreRows } from '../../selectors';

export function CategoryBreakdownSection(props: { result: FreeSnapshotPreview }) {
  const { result } = props;
  const rows = createCategoryScoreRows(result);
  if (rows.length === 0) return null;

  return (
    <Surface
      className="glc-card glc-snapshot-result-card glc-snapshot-surface-category mb-4 p-5 lg:p-6"
      style={{ borderRadius: 'var(--radius-xl)' }}
    >
      <div className="glc-snapshot-section-h glc-snapshot-section-h--neutral">
        <span className="glc-snapshot-section-h__rule" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          {SNAPSHOT_LANDING_HERO_COPY.categoryBreakdownLabel}
        </span>
      </div>
      <ul className="space-y-4 text-sm lg:grid lg:grid-cols-2 lg:gap-x-10 lg:gap-y-5 lg:space-y-0">
        {rows.map(row => (
          <li key={row.key}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="inline-flex min-w-0 items-center gap-1.5 text-[var(--text-secondary)]">
                <span className="truncate">{row.label}</span>
                <CategoryBreakdownHint label={row.label} categoryKey={row.key} />
              </span>
              <span className="font-semibold tabular-nums" style={{ color: row.barColor }}>
                {row.value}/100
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]"
              aria-hidden
            >
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${row.percentage}%`,
                  backgroundColor: row.barColor,
                  opacity: 0.92,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      {result.scan_basis && (
        <p className="mt-4 border-t border-[var(--border-subtle)] pt-4 text-xs leading-relaxed text-[var(--text-quaternary)]">
          {SNAPSHOT_LANDING_HERO_COPY.basedOnLabel} {result.scan_basis}
        </p>
      )}
    </Surface>
  );
}
