import { Target, Compass, Rocket, Users, ChartLineUp, ClipboardText } from '@phosphor-icons/react';
import type { ComponentType } from 'react';
import { MarketingStaggeredReveal } from './MarketingStaggeredReveal';
import { cn } from '../../components/ui/utils';

type AudienceCard = {
  situation: string;
  happening_now: string;
  best_fit: string;
};

type IconComponent = ComponentType<{ size?: number; weight?: 'regular' | 'bold' | 'duotone'; 'aria-hidden'?: boolean | 'true' | 'false' }>;

/** Index-keyed icon anchors for audience personas. Fallback to Users if over-length. */
const AUDIENCE_ICONS: readonly IconComponent[] = [Target, Compass, Rocket, ChartLineUp, ClipboardText];

export function PackageAudienceSection({
  title,
  cards,
}: {
  title: string;
  cards: AudienceCard[];
}) {
  return (
    <section
      className="glc-info-glass-surface -mx-4 mt-8 px-4 py-10 sm:-mx-6 sm:mt-10 sm:px-6 sm:py-12"
      aria-label={title}
    >
      <h2 className="font-display text-xl font-bold sm:text-2xl ds-text-primary">
        {title}
      </h2>
      <MarketingStaggeredReveal className="mt-5 grid gap-3 md:grid-cols-3">
        {cards.map((card, i) => {
          const Icon = AUDIENCE_ICONS[i] ?? Users;
          const isPrimary = i === 0;
          return (
            <MarketingStaggeredReveal.Item
              key={card.situation}
              as="article"
              className="ds-package-audience-section-card rounded-[var(--radius-xl)] border p-5"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'ds-marketing-card-icon-well ds-marketing-card-icon-well--small',
                    isPrimary && 'ds-marketing-card-icon-well--accent',
                  )}
                  aria-hidden
                >
                  <Icon size={18} weight="bold" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[length:var(--text-2xs)] font-semibold uppercase ds-package-audience-caps ds-text-tertiary">
                    Situation
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-relaxed ds-text-primary">
                    {card.situation}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-[length:var(--text-2xs)] font-semibold uppercase ds-package-audience-caps ds-text-tertiary">
                What is happening now
              </p>
              <p className="mt-1 text-sm leading-relaxed ds-text-secondary">
                {card.happening_now}
              </p>
              <p className="ds-text-brand-deeper mt-3 text-xs font-semibold">
                {card.best_fit}
              </p>
            </MarketingStaggeredReveal.Item>
          );
        })}
      </MarketingStaggeredReveal>
    </section>
  );
}
