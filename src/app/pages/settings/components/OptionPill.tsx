import type { ButtonHTMLAttributes } from 'react';
import { SETTINGS_UI_STYLES } from '../config/settings-ui-policy';

type OptionPillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
};

export function OptionPill({ active, style, ...props }: OptionPillProps) {
  return (
    <button
      type="button"
      {...props}
      style={{
        borderRadius: 'var(--radius-md)',
        padding: '6px 10px',
        fontSize: '11px',
        fontWeight: 500,
        cursor: 'pointer',
        ...(active ? SETTINGS_UI_STYLES.selectedOption : SETTINGS_UI_STYLES.unselectedOption),
        ...style,
      }}
    />
  );
}
