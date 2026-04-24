import { SectionHeading } from '../components/SectionHeading';
import { HomeGuidedPathSelector } from './HomeGuidedPathSelector';
import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeHowItWorksSectionProps = {
  data: MarketingHomeViewModel['chooseEntry'];
};

export function HomeHowItWorksSection({ data }: HomeHowItWorksSectionProps) {
  return (
    <>
      <SectionHeading size="display" title={data.title} description={data.description} />
      <HomeGuidedPathSelector data={data} />
    </>
  );
}
