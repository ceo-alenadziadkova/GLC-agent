import { HomeMetricsSection } from './HomeMetricsSection';
import { HomeTrustSection } from './HomeTrustSection';
import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeAtAGlanceSectionProps = {
  trustMetrics: MarketingHomeViewModel['trustMetrics'];
  trustStrip: MarketingHomeViewModel['trustStrip'];
  reduceMotion: boolean;
};

/**
 * Merges trust metrics and trust strip into one vertical block to shorten the home scroll
 * and pair “proof points” with “why teams choose this flow” in one scan.
 */
export function HomeAtAGlanceSection({ trustMetrics, trustStrip, reduceMotion }: HomeAtAGlanceSectionProps) {
  return (
    <div className="flex flex-col">
      <HomeMetricsSection data={trustMetrics} includeLandmark={false} maxItems={2} showTagline={false} />
      <div className="mx-auto w-full max-w-5xl border-t border-[var(--border-subtle)] px-5 pb-6 pt-4 sm:px-6 sm:pb-7 sm:pt-5">
        <HomeTrustSection data={trustStrip} reduceMotion={reduceMotion} density="compact" maxLines={2} />
      </div>
    </div>
  );
}
