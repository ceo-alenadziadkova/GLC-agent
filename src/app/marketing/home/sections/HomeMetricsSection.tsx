import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeMetricsSectionProps = {
  data: MarketingHomeViewModel['trustMetrics'];
};

export function HomeMetricsSection({ data }: HomeMetricsSectionProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-7 sm:py-9" aria-label={data.ariaLabel}>
      <div className="grid gap-8 text-center sm:grid-cols-3 sm:gap-10 sm:text-left">
        {data.items.map(item => (
          <div key={item.label} className="max-w-md sm:max-w-none">
            <p className="ds-home-metric-value">{item.value}</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {item.label}
            </p>
          </div>
        ))}
      </div>
      <p className="ds-home-metrics-tagline">{data.tagline}</p>
    </div>
  );
}
