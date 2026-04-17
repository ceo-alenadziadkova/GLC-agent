import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils';

const calloutVariants = cva('rounded-lg border p-3', {
  variants: {
    intent: {
      info: 'border-[var(--callout-info-border)] bg-[var(--callout-info-bg)]',
      warning: 'border-[var(--callout-warning-border)] bg-[var(--callout-warning-bg-subtle)]',
      danger: 'border-[var(--callout-error-border)] bg-[var(--callout-error-bg)]',
      success: 'border-[var(--score-5-border)] bg-[var(--score-5-bg)]',
      neutral: 'border-[var(--border-subtle)] bg-[var(--bg-inset)]',
    },
  },
  defaultVariants: {
    intent: 'neutral',
  },
});

interface CalloutProps extends VariantProps<typeof calloutVariants> {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Callout({ title, children, intent, className }: CalloutProps) {
  return (
    <div className={cn(calloutVariants({ intent }), className)}>
      {title ? <div className="mb-0.5 text-sm font-medium text-[var(--text-primary)]">{title}</div> : null}
      <div className="text-xs text-[var(--text-secondary)]">{children}</div>
    </div>
  );
}
