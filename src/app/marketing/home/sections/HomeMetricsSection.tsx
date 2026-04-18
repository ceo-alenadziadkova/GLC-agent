import type { ComponentType } from 'react';
import { Clock, ChartLineUp, Gauge, Sparkle } from '@phosphor-icons/react';
import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeMetricsSectionProps = {
  data: MarketingHomeViewModel['trustMetrics'];
};

type IconComponent = ComponentType<{ size?: number; weight?: 'bold' | 'regular'; 'aria-hidden'?: boolean }>;

const METRIC_ICONS: readonly IconComponent[] = [Clock, ChartLineUp, Gauge];

export function HomeMetricsSection({ data }: HomeMetricsSectionProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 sm:py-9" aria-label={data.ariaLabel}>
      <div className="grid gap-8 text-center sm:grid-cols-3 sm:gap-10 sm:text-left">
        {data.items.map((item, i) => {
          const Icon = METRIC_ICONS[i] ?? Sparkle;
          return (
            <div key={item.label} className="max-w-md sm:max-w-none">
              <span
                className="ds-marketing-card-icon-well ds-marketing-card-icon-well--small mx-auto mb-4 sm:mx-0"
                aria-hidden
              >
                <Icon size={18} weight="bold" aria-hidden />
              </span>
              <p className="ds-home-metric-value">{item.value}</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
      <p className="ds-home-metrics-tagline">{data.tagline}</p>
    </div>
  );
}
