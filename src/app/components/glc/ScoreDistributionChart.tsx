import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import { SectionLabel } from './SectionLabel';
import type { DashboardScoreDistribution } from '../../data/apiService';

interface ScoreDistributionChartProps {
  distribution: DashboardScoreDistribution | undefined;
  loading: boolean;
}

interface Band {
  key: keyof Pick<DashboardScoreDistribution, 'band_1' | 'band_2' | 'band_3' | 'band_4'>;
  label: string;
  color: string;
}

const BANDS: Band[] = [
  { key: 'band_1', label: '1–2  Critical',  color: 'var(--score-1)' },
  { key: 'band_2', label: '2–3  Issues',    color: 'var(--score-2)' },
  { key: 'band_3', label: '3–4  Moderate',  color: 'var(--score-3)' },
  { key: 'band_4', label: '4–5  Good',      color: 'var(--score-4)' },
];

export function ScoreDistributionChart({ distribution, loading }: ScoreDistributionChartProps) {
  const total = distribution?.total_scored ?? 0;

  return (
    <div className="glc-card h-full rounded-[var(--radius-xl)] p-5">
      <div className="glc-panel-head">
        <SectionLabel>Score Distribution</SectionLabel>
        <span className="glc-panel-meta">Bands 1-5</span>
      </div>

      {loading && !distribution && (
        <div className="space-y-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-24 animate-pulse rounded bg-[var(--bg-canvas)]" />
              <div className="h-2 animate-pulse rounded-full bg-[var(--bg-canvas)]" />
            </div>
          ))}
        </div>
      )}

      {!loading && distribution && total === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <p className="text-sm text-[var(--text-tertiary)]">No scored audits yet</p>
        </div>
      )}

      {distribution && total > 0 && (
        <div className="space-y-3.5">
          {BANDS.map(band => {
            const count = distribution[band.key];
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={band.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--text-secondary)]">{band.label}</span>
                  <span className="text-xs tabular-nums text-[var(--text-tertiary)]">
                    {count}
                  </span>
                </div>
                {/* Track */}
                <div className="w-full overflow-hidden ds-score-distribution-track">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="ds-score-distribution-fill"
                    style={{ ['--score-distribution-fill' as string]: band.color } as CSSProperties}
                  />
                </div>
              </div>
            );
          })}
          <div
            className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-2"
          >
            <span className="text-xs text-[var(--text-tertiary)]">Total scored</span>
            <span className="text-xs font-semibold tabular-nums [font-family:var(--font-display)] text-[var(--text-secondary)]">
              {total}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
