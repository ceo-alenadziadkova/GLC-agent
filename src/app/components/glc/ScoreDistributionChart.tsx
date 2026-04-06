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
  { key: 'band_1', label: '1–2  Critical',  color: '#EF4444' },
  { key: 'band_2', label: '2–3  Issues',    color: '#F97316' },
  { key: 'band_3', label: '3–4  Moderate',  color: '#EAB308' },
  { key: 'band_4', label: '4–5  Good',      color: '#22C55E' },
];

export function ScoreDistributionChart({ distribution, loading }: ScoreDistributionChartProps) {
  const total = distribution?.total_scored ?? 0;

  return (
    <div
      className="glc-card p-5 h-full"
      style={{ borderRadius: 'var(--radius-xl)' }}
    >
      <div className="mb-4">
        <SectionLabel>Score Distribution</SectionLabel>
      </div>

      {loading && !distribution && (
        <div className="space-y-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-24 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-canvas)' }} />
              <div className="h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--bg-canvas)' }} />
            </div>
          ))}
        </div>
      )}

      {!loading && distribution && total === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No scored audits yet</p>
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
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{band.label}</span>
                  <span
                    className="tabular-nums"
                    style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}
                  >
                    {count}
                  </span>
                </div>
                {/* Track */}
                <div
                  className="w-full overflow-hidden"
                  style={{
                    height: 6,
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--border-subtle)',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      height: '100%',
                      backgroundColor: band.color,
                      borderRadius: 'var(--radius-full)',
                    }}
                  />
                </div>
              </div>
            );
          })}
          <div
            className="pt-2 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Total scored</span>
            <span
              className="tabular-nums font-semibold"
              style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}
            >
              {total}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
