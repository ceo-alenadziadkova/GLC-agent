'use client';

import { CaretDown } from '@phosphor-icons/react';
import { cn } from '../../../components/ui/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeScopeTruthSectionProps = {
  data: MarketingHomeViewModel['scopeTruth'];
};

/**
 * Editorial block + optional depth via collapsible (adds discoverable interaction without a second ladder).
 */
export function HomeScopeTruthSection({ data }: HomeScopeTruthSectionProps) {
  const firstGroup = data.coverageItems.slice(0, 3);
  const secondGroup = data.coverageItems.slice(3);

  return (
    <div className="ds-marketing-scope-truth-surface text-[var(--text-primary)]">
      <div className="flex flex-col items-center text-center">
        <p className="ds-marketing-text-muted mb-4 text-xs font-semibold uppercase tracking-[var(--marketing-kicker-track)]">
          {data.kicker}
        </p>
        <h2 className="max-w-[40ch] text-3xl font-semibold tracking-[var(--marketing-section-heading-track)] sm:text-4xl lg:text-5xl">
          {data.title}
        </h2>
        <p className="ds-marketing-text-muted mt-6 max-w-[62ch] text-base leading-relaxed sm:text-lg">
          {data.body}
        </p>
      </div>
      <div
        className="mt-12 overflow-hidden rounded-2xl border border-white/5 bg-black/40"
        aria-label="Whole-business coverage map"
      >
        <div className="ds-marketing-scope-coverage-header">
          <span>{data.coverageMapHeadingLeft}</span>
          <span>{data.coverageMapHeadingRight}</span>
        </div>
        <div className="grid gap-px bg-white/5 sm:grid-cols-2">
          <div className="flex flex-col bg-black/40">
            {firstGroup.map((item) => (
              <div
                key={item}
                className="flex items-center justify-between border-b border-white/5 px-6 py-4 last:border-0 hover:bg-white/[0.02]"
              >
                <span className="text-sm font-medium text-[var(--text-primary)]">{item}</span>
                <span className="text-xs font-medium text-[var(--glc-blue)]">
                  <span className="sr-only">{data.coverageStatusIncludedLabel}</span>
                  <span aria-hidden>✓</span>
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col bg-black/40">
            {secondGroup.map((item) => (
              <div
                key={item}
                className="flex items-center justify-between border-b border-white/5 px-6 py-4 last:border-0 hover:bg-white/[0.02]"
              >
                <span className="text-sm font-medium text-[var(--text-primary)]">{item}</span>
                <span className="text-xs font-medium text-[var(--glc-blue)]">
                  <span className="sr-only">{data.coverageStatusIncludedLabel}</span>
                  <span aria-hidden>✓</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="ds-marketing-text-muted mt-8 text-center text-xs leading-relaxed">
        {data.boundaryNote}
      </p>

      <Collapsible className="mt-6 flex flex-col items-center">
        <CollapsibleTrigger
          className={cn(
            'group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors',
            'hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--glc-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]',
          )}
        >
          {data.expandTriggerLabel}
          <CaretDown
            className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden pt-4 text-center">
          <p className="ds-marketing-text-muted max-w-[62ch] text-sm leading-relaxed">
            {data.expandBody}
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
