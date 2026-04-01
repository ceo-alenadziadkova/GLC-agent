/** localStorage `light` | `dark` | omit = follow `prefers-color-scheme` */
export const GLC_THEME_STORAGE_KEY = 'glc-theme';

/** Effective dark mode (after preference + system fallback). Browser only. */
export function getResolvedGlcDark(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  const stored = localStorage.getItem(GLC_THEME_STORAGE_KEY);
  if (stored === 'dark') {
    return true;
  }
  if (stored === 'light') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyGlcColorScheme(): void {
  document.documentElement.classList.toggle('dark', getResolvedGlcDark());
}

export function setGlcColorScheme(mode: 'light' | 'dark' | 'system'): void {
  if (mode === 'system') {
    localStorage.removeItem(GLC_THEME_STORAGE_KEY);
  } else {
    localStorage.setItem(GLC_THEME_STORAGE_KEY, mode);
  }
  applyGlcColorScheme();
}
