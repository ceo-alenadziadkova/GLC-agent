import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../../components/ui/utils';

type OptionPillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
};

export function OptionPill({ active, className, ...props }: OptionPillProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'ds-settings-option-pill-base',
        active ? 'ds-settings-option-pill--selected' : 'ds-settings-option-pill--unselected',
        className,
      )}
    />
  );
}
