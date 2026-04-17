import { DecisionPath } from '../../blocks/DecisionPath';
import { MarketingComparisonShell } from '../../blocks/MarketingComparisonShell';
import { MarketingRevealMask } from '../../blocks/MarketingRevealMask';
import { SectionHeading } from '../components/SectionHeading';
import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeHowItWorksSectionProps = {
  data: MarketingHomeViewModel['chooseEntry'];
};

export function HomeHowItWorksSection({ data }: HomeHowItWorksSectionProps) {
  return (
    <>
      <SectionHeading size="display" title={data.title} description={data.description} />
      <MarketingRevealMask className="mt-12 will-change-transform">
        <MarketingComparisonShell padded>
          <DecisionPath flush variant="cards" />
        </MarketingComparisonShell>
      </MarketingRevealMask>
    </>
  );
}
