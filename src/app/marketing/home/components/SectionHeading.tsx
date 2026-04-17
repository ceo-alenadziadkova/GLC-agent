import { cn } from '../../../components/ui/utils';
import { HOME_DEFAULT_H2, HOME_DISPLAY_H2 } from '../config/home-ui.config';
import type { HomeHeadingSize, HomeHeadingVariant } from '../types/home-content.types';

type SectionHeadingProps = {
  title: string;
  description?: string;
  className?: string;
  variant?: HomeHeadingVariant;
  size?: HomeHeadingSize;
};

export function SectionHeading({
  title,
  description,
  className,
  variant = 'bar',
  size = 'default',
}: SectionHeadingProps) {
  const h2Class = size === 'display' ? HOME_DISPLAY_H2 : HOME_DEFAULT_H2;
  const h2Combined = cn(
    h2Class,
    'ds-text-primary',
    size !== 'display' && 'tracking-[var(--tracking-tight)]',
  );

  if (variant === 'minimal') {
    return (
      <div className={cn('max-w-3xl', className)}>
        <h2 className={h2Combined}>
          {title}
        </h2>
        {description ? (
          <p
            className="mt-3 max-w-[65ch] leading-relaxed ds-text-secondary ds-home-section-desc-size"
            
          >
            {description}
          </p>
        ) : null}
      </div>
    );
  }

  if (variant === 'rail') {
    return (
      <div className={cn('max-w-3xl', className)}>
        <div className="flex items-center gap-3">
          <span className="ds-section-accent-bar h-px w-10 shrink-0 sm:w-14" aria-hidden />
          <h2 className={h2Combined}>
            {title}
          </h2>
        </div>
        {description ? (
          <p
            className="mt-4 max-w-[65ch] leading-relaxed ds-text-secondary ds-home-section-desc-size ds-home-section-desc-rail"
            
          >
            {description}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('max-w-3xl', className)}>
      <div className="ds-section-brand-gradient-bar mb-4 h-1 w-12 rounded-full sm:w-14" aria-hidden />
      <h2 className={h2Combined}>
        {title}
      </h2>
      {description ? (
        <p
          className="mt-3 max-w-[65ch] leading-relaxed ds-text-secondary ds-home-section-desc-size"
          
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
