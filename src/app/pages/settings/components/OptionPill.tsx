import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../../components/ui/utils';
import { SETTINGS_UI_STYLES } from '../config/settings-ui-policy';

type OptionPillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
};

export function OptionPill({ active, className, style, ...props }: OptionPillProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn('ds-settings-option-pill-base', className)}
      style={{
        ...(active ? SETTINGS_UI_STYLES.selectedOption : SETTINGS_UI_STYLES.unselectedOption),
        ...style,
      }}
    />
  );
}
