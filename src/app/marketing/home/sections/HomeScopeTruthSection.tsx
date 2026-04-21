'use client';

import { CaretDown } from '@phosphor-icons/react';
import { cn } from '../../../components/ui/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { HOME_DISPLAY_H2 } from '../config/home-ui.config';
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
    <div className="ds-marketing-surface-muted-band px-5 py-8 sm:px-8 sm:py-10">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
        {data.kicker}
      </p>
      <h2 className={cn(HOME_DISPLAY_H2, 'ds-text-primary max-w-[40ch] tracking-tight')}>
        {data.title}
      </h2>
      <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
        {data.body}
      </p>
      <div className="ds-home-coverage-visual mt-7" aria-label="Whole-business coverage map">
        <div className="ds-home-coverage-visual-head">
          <span>Coverage areas</span>
          <span>Included in shared reading</span>
        </div>
        <div className="ds-home-coverage-map ds-home-coverage-map-columns">
          <div className="ds-home-coverage-map-group">
            {firstGroup.map((item) => (
              <div key={item} className="ds-home-coverage-map-row">
                <span className="ds-home-coverage-map-label">{item}</span>
                <span className="ds-home-coverage-map-status">Included</span>
              </div>
            ))}
          </div>
          <div className="ds-home-coverage-map-group">
            {secondGroup.map((item) => (
              <div key={item} className="ds-home-coverage-map-row">
                <span className="ds-home-coverage-map-label">{item}</span>
                <span className="ds-home-coverage-map-status">Included</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-4 max-w-[62ch] text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
        {data.boundaryNote}
      </p>

      <Collapsible>
        <CollapsibleTrigger className="ds-home-scope-truth-expand-trigger">
          <CaretDown
            className="ds-home-scope-truth-expand-chevron h-4 w-4 shrink-0 text-[var(--glc-blue-deeper)]"
            weight="bold"
            aria-hidden
          />
          {data.expandTriggerLabel}
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden pt-1">
          <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
            {data.expandBody}
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
