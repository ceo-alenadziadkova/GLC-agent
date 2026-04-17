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
  return (
    <>
      <SectionHeading variant="minimal" size="display" title={data.title} description={data.description} />
      <MarketingRevealMask className="mt-10 max-w-3xl overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 will-change-transform sm:px-6 sm:py-3">
        <Accordion type="single" collapsible className="w-full">
          {data.items.map((item, i) => (
            <AccordionItem key={item.q} value={`p-${i}`}>
              <AccordionTrigger className="text-left text-base font-semibold">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </MarketingRevealMask>
      <Link
        to="/faq"
        className={cn(
          'group mt-6 inline-flex items-center gap-1 text-sm font-semibold transition-[color,transform] duration-300 ease-out',
          HOME_FOCUS_RING,
          'rounded-md',
        )}
        style={{ color: 'var(--glc-blue)' }}
      >
        {data.allQuestionsLabel}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </>
  );
}
