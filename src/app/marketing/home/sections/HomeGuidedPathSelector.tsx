import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import { cn } from '../../../components/ui/utils';
import { HOME_FOCUS_RING } from '../config/home-ui.config';
import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeGuidedPathSelectorProps = {
  data: MarketingHomeViewModel['chooseEntry'];
};

export function HomeGuidedPathSelector({ data }: HomeGuidedPathSelectorProps) {
  if (data.selectorOptions.length === 0 || data.selectorPaths.length === 0) return null;

  return (
    <div className="ds-marketing-guided-path mt-12 sm:mt-16">
      <h3 className="font-display text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">
        {data.selectorTitle}
      </h3>
      <p className="ds-marketing-text-muted mt-2 max-w-[60ch] text-base leading-relaxed">
        {data.selectorDescription}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {data.selectorOptions.map((option) => {
          const path = data.selectorPaths.find((item) => item.id === option.recommendedPathId);
          if (!path) return null;
          return (
            <Link
              key={option.id}
              to={path.to}
              className={cn(
                'group relative rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 text-left transition-all duration-300',
                'hover:border-white/20 hover:bg-white/[0.05]',
                HOME_FOCUS_RING,
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="block text-sm font-semibold text-[var(--text-primary)]">{option.label}</span>
              {path.subtitle ? (
                <span className="ds-marketing-text-muted mt-2 block text-xs">
                  {path.subtitle}
                </span>
              ) : null}
              <span className="mt-3 block text-xs font-medium text-[var(--text-primary)]/60">
                {path.nextStepLabel}
              </span>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
                {path.ctaLabel}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>
      <p className="ds-marketing-text-muted mt-8 text-center text-xs leading-relaxed">
        {data.selectorRecoveryLabel}{' '}
        <Link
          to={data.selectorRecoveryCtaTo}
          className={cn(
            'font-medium text-[var(--text-primary)] underline-offset-4 hover:underline',
            HOME_FOCUS_RING,
          )}
        >
          {data.selectorRecoveryCtaLabel}
        </Link>
      </p>
    </div>
  );
}
