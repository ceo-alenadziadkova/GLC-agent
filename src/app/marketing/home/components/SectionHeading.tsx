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
  const headingStyle = {
    color: 'var(--text-primary)',
    letterSpacing: size === 'display' ? undefined : 'var(--tracking-tight)',
  };

  if (variant === 'minimal') {
    return (
      <div className={cn('max-w-3xl', className)}>
        <h2 className={h2Class} style={headingStyle}>
          {title}
        </h2>
        {description ? (
          <p
            className="mt-3 max-w-[65ch] text-base leading-relaxed sm:text-[1.02rem]"
            style={{ color: 'var(--text-secondary)' }}
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
          <span className="h-px w-10 shrink-0 sm:w-14" style={{ backgroundColor: 'var(--glc-blue)' }} aria-hidden />
          <h2 className={h2Class} style={headingStyle}>
            {title}
          </h2>
        </div>
        {description ? (
          <p
            className="mt-4 max-w-[65ch] pl-0 text-base leading-relaxed sm:pl-[3.25rem] sm:text-[1.02rem]"
            style={{ color: 'var(--text-secondary)' }}
          >
            {description}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('max-w-3xl', className)}>
      <div className="mb-4 h-1 w-12 rounded-full sm:w-14" style={{ background: 'var(--gradient-brand)' }} aria-hidden />
      <h2 className={h2Class} style={headingStyle}>
        {title}
      </h2>
      {description ? (
        <p
          className="mt-3 max-w-[65ch] text-base leading-relaxed sm:text-[1.02rem]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
