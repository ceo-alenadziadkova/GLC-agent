import type { CSSProperties } from 'react';
import { Moon, Sun } from '@phosphor-icons/react';
import { Switch } from './ui/switch';
import { cn } from './ui/utils';
import { useGlcTheme } from '../hooks/useGlcTheme';

type ThemeToggleProps = {
  /** `sidebar` — icons for dark ink nav background */
  variant?: 'default' | 'sidebar';
  className?: string;
};

export function ThemeToggle({ variant = 'default', className }: ThemeToggleProps) {
  const { isDark, setDark } = useGlcTheme();
  const iconMuted =
    variant === 'sidebar' ? 'rgba(255,255,255,0.42)' : 'var(--text-tertiary)';
  const iconActive =
    variant === 'sidebar' ? 'rgba(255,255,255,0.78)' : 'var(--text-secondary)';

  const cssVars = {
    '--theme-toggle-sun': isDark ? iconMuted : iconActive,
    '--theme-toggle-moon': isDark ? iconActive : iconMuted,
  } as CSSProperties;

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      style={cssVars}
      title={isDark ? 'Dark theme on' : 'Light theme on'}
    >
      <Sun
        className="ds-theme-toggle-sun h-4 w-4 shrink-0"
        weight={isDark ? 'regular' : 'fill'}
        aria-hidden
        focusable="false"
      />
      <Switch
        checked={isDark}
        onCheckedChange={setDark}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        className={variant === 'sidebar' ? 'data-[state=unchecked]:bg-white/15' : undefined}
      />
      <Moon
        className="ds-theme-toggle-moon h-4 w-4 shrink-0"
        weight={isDark ? 'fill' : 'regular'}
        aria-hidden
        focusable="false"
      />
    </div>
  );
}
