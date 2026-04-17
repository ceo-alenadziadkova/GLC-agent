import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils';

const stackVariants = cva('flex flex-col', {
  variants: {
    gap: {
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
      xl: 'gap-6',
    },
  },
  defaultVariants: {
    gap: 'md',
  },
});

function Stack({
  className,
  gap,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof stackVariants>) {
  return <div className={cn(stackVariants({ gap }), className)} {...props} />;
}

export { Stack, stackVariants };
