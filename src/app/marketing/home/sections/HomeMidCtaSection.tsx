import { MarketingMidCtaBand } from '../../blocks/MarketingMidCtaBand';
import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeMidCtaSectionProps = {
  landmarkLabel: string;
  data: MarketingHomeViewModel['midCta'];
};

export function HomeMidCtaSection({ landmarkLabel, data }: HomeMidCtaSectionProps) {
  return (
    <MarketingMidCtaBand
      landmarkLabel={landmarkLabel}
      title={data.title}
      body={data.body}
      ctaLabel={data.ctaLabel}
      ctaTo={data.ctaTo}
      recoveryLabel={data.recoveryLabel}
      recoveryCtaLabel={data.recoveryCtaLabel}
      recoveryCtaTo={data.recoveryCtaTo}
    />
  );
}
