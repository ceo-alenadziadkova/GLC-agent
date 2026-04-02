import { useCallback, useEffect, useState } from 'react';
import {
  getResolvedGlcDark,
  GLC_THEME_STORAGE_KEY,
  setGlcColorScheme,
  getGlcThemeMode,
  type GlcThemeMode,
} from '../lib/glc-theme';

export function useGlcTheme() {
  const [isDark, setIsDark] = useState(getResolvedGlcDark);
  const [mode, setModeState] = useState<GlcThemeMode>(getGlcThemeMode);

  useEffect(() => {
    const sync = () => {
      setIsDark(getResolvedGlcDark());
      setModeState(getGlcThemeMode());
    };
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
    setModeState(dark ? 'dark' : 'light');
  }, []);

  const setMode = useCallback((nextMode: GlcThemeMode) => {
    setGlcColorScheme(nextMode);
    setIsDark(getResolvedGlcDark());
    setModeState(nextMode);
  }, []);

  const toggle = useCallback(() => {
    setDark(!getResolvedGlcDark());
  }, [setDark]);

  return { isDark, mode, setDark, setMode, toggle };
}
