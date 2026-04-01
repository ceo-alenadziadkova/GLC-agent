import { useCallback, useEffect, useState } from 'react';
import { getResolvedGlcDark, GLC_THEME_STORAGE_KEY, setGlcColorScheme } from '../lib/glc-theme';

export function useGlcTheme() {
  const [isDark, setIsDark] = useState(getResolvedGlcDark);

  useEffect(() => {
    const sync = () => setIsDark(getResolvedGlcDark());
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const onStorage = (e: StorageEvent) => {
      if (e.key === GLC_THEME_STORAGE_KEY || e.key === null) {
        sync();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      obs.disconnect();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setDark = useCallback((dark: boolean) => {
    setGlcColorScheme(dark ? 'dark' : 'light');
    setIsDark(dark);
  }, []);

  const toggle = useCallback(() => {
    setDark(!getResolvedGlcDark());
  }, [setDark]);

  return { isDark, setDark, toggle };
}
