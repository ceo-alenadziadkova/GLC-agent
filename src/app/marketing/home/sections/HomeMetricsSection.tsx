import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeMetricsSectionProps = {
  data: MarketingHomeViewModel['trustMetrics'];
  /** When false, parent section owns the landmark (combined at-a-glance block). */
  includeLandmark?: boolean;
  maxItems?: number;
  showTagline?: boolean;
};

export function HomeMetricsSection({
  data,
  includeLandmark = true,
  maxItems,
  showTagline = true,
}: HomeMetricsSectionProps) {
  if (!data.items[0]) {
    return null;
  }
  const metricItems = typeof maxItems === 'number' ? data.items.slice(0, maxItems) : data.items;

  return (
    <div
      className="mx-auto w-full max-w-5xl px-5 pb-7 pt-5 sm:px-6 sm:pb-8 sm:pt-6"
      {...(includeLandmark ? { 'aria-label': data.ariaLabel } : {})}
    >
      <p className="ds-home-metrics-proof-label">{data.sectionLabel}</p>
      <div className="ds-home-proof-grid mb-8" aria-label={data.gridLabel}>
        {metricItems.map(item => (
          <article key={item.value} className="ds-home-proof-card">
            <h3 className="ds-home-proof-card-title">{item.value}</h3>
            <p className="ds-home-proof-card-body">{item.label}</p>
          </article>
        ))}
      </div>

      {showTagline ? <p className="ds-home-metrics-tagline">{data.tagline}</p> : null}
    </div>
  );
}
