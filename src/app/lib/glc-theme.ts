/** localStorage `light` | `dark` | omit = follow `prefers-color-scheme` */
export const GLC_THEME_STORAGE_KEY = 'glc-theme';
export type GlcThemeMode = 'light' | 'dark' | 'system';

export function getGlcThemeMode(): GlcThemeMode {
  const stored = localStorage.getItem(GLC_THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  return 'system';
}

/** Effective dark mode (after preference + system fallback). Browser only. */
export function getResolvedGlcDark(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  const mode = getGlcThemeMode();
  if (mode === 'dark') {
    return true;
  }
  if (mode === 'light') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyGlcColorScheme(): void {
  document.documentElement.classList.toggle('dark', getResolvedGlcDark());
}

export function setGlcColorScheme(mode: GlcThemeMode): void {
  if (mode === 'system') {
    localStorage.removeItem(GLC_THEME_STORAGE_KEY);
  } else {
    localStorage.setItem(GLC_THEME_STORAGE_KEY, mode);
  }
  applyGlcColorScheme();
}
