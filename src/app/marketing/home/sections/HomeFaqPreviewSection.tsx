import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../components/ui/accordion';
import { cn } from '../../../components/ui/utils';
import { MarketingRevealMask } from '../../blocks/MarketingRevealMask';
import { HOME_FOCUS_RING } from '../config/home-ui.config';
import { SectionHeading } from '../components/SectionHeading';
import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeFaqPreviewSectionProps = {
  data: MarketingHomeViewModel['faq'];
};

export function HomeFaqPreviewSection({ data }: HomeFaqPreviewSectionProps) {
  const previewItems = data.items.slice(0, 3);

  return (
    <>
      <SectionHeading variant="minimal" size="display" title={data.title} />
      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <MarketingRevealMask className="max-w-3xl overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 will-change-transform sm:px-6 sm:py-3">
          <Accordion type="single" collapsible className="w-full">
            {previewItems.map((item, i) => (
              <AccordionItem
                key={item.q}
                value={`p-${i}`}
                className="mb-3 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] px-4 last:mb-0 sm:px-5"
              >
                <AccordionTrigger className="text-left text-base font-semibold">{item.q}</AccordionTrigger>
                <AccordionContent className="pb-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </MarketingRevealMask>
        <Link
          to="/faq"
          className={cn(
            'group mt-1 inline-flex items-center gap-1 self-start text-sm font-semibold text-[var(--glc-blue)] transition-[color,transform] duration-300 ease-out lg:mt-3',
            HOME_FOCUS_RING,
            'rounded-md',
          )}
        >
          {data.allQuestionsLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </>
  );
}
