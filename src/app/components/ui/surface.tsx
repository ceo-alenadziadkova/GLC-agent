import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils';

const surfaceVariants = cva('rounded-lg border bg-[var(--bg-surface)]', {
  variants: {
    elevation: {
      base: 'shadow-[var(--shadow-sm)]',
      raised: 'shadow-[var(--shadow-md)]',
    },
    padding: {
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-6',
      none: 'p-0',
    },
  },
  defaultVariants: {
    elevation: 'base',
    padding: 'md',
  },
});

function Surface({
  className,
  elevation,
  padding,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof surfaceVariants>) {
  return (
    <div
      data-slot="surface"
      className={cn('border-[var(--panel-border)]', surfaceVariants({ elevation, padding }), className)}
      {...props}
    />
  );
}

export { Surface, surfaceVariants };
