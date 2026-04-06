import { Toaster } from 'sonner';
import { useGlcTheme } from '../hooks/useGlcTheme';

/** Sonner theme follows GLC `html.dark` / `useGlcTheme` (not next-themes). */
export function GlcToaster() {
  const { isDark } = useGlcTheme();
  return <Toaster richColors position="top-right" theme={isDark ? 'dark' : 'light'} />;
}
