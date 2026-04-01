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

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      title={isDark ? 'Dark theme on' : 'Light theme on'}
    >
      <Sun
        className="h-4 w-4 shrink-0"
        weight={isDark ? 'regular' : 'fill'}
        style={{ color: isDark ? iconMuted : iconActive }}
        aria-hidden
      />
      <Switch
        checked={isDark}
        onCheckedChange={setDark}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        className={variant === 'sidebar' ? 'data-[state=unchecked]:bg-white/15' : undefined}
      />
      <Moon
        className="h-4 w-4 shrink-0"
        weight={isDark ? 'fill' : 'regular'}
        style={{ color: isDark ? iconActive : iconMuted }}
        aria-hidden
      />
    </div>
  );
}
