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
    'text-[var(--text-primary)]',
    size === 'display' && 'text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-[var(--marketing-section-heading-track)]',
    size !== 'display' && 'tracking-[var(--tracking-tight)] font-semibold',
  );

  if (variant === 'minimal') {
    return (
      <div className={cn('max-w-3xl mx-auto flex flex-col items-center text-center', className)}>
        <h2 className={h2Combined}>
          {title}
        </h2>
        {description ? (
          <p className="ds-marketing-text-muted mt-4 max-w-[65ch] text-lg leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
    );
  }

  if (variant === 'rail') {
    return (
      <div className={cn('max-w-3xl mx-auto flex flex-col items-center text-center', className)}>
        <h2 className={h2Combined}>
          {title}
        </h2>
        {description ? (
          <p className="ds-marketing-text-muted mt-4 max-w-[65ch] text-lg leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('max-w-3xl mx-auto flex flex-col items-center text-center', className)}>
      <h2 className={h2Combined}>
        {title}
      </h2>
      {description ? (
        <p className="ds-marketing-text-muted mt-4 max-w-[65ch] text-lg leading-relaxed">
          {description}
        </p>
      ) : null}
    </div>
  );
}
