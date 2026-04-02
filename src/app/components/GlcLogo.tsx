import LogoLight from '../assets/logo.svg';
import LogoWhite from '../assets/logo-white.svg';
import { useGlcTheme } from '../hooks/useGlcTheme';
import { cn } from './ui/utils';

type GlcLogoProps = {
  /** `auto` — white on dark theme, default logo on light. `on-dark` — always white (ink sidebar). */
  variant?: 'auto' | 'on-dark';
  className?: string;
  alt?: string;
};

export function GlcLogo({ variant = 'auto', className, alt = 'GLC Audit Platform' }: GlcLogoProps) {
  const { isDark } = useGlcTheme();
  const src = variant === 'on-dark' || isDark ? LogoWhite : LogoLight;
  return <img src={src} alt={alt} className={cn('w-auto shrink-0', className)} />;
}
