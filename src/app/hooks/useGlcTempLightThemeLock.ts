import { useLocation } from 'react-router';
import { isGlcTempLightThemeDisabledForPathname } from '../lib/glc-temp-light-theme';

/** True on routes where the light theme is temporarily disabled (marketing + login). */
export function useGlcTempLightThemeLock(): boolean {
  return isGlcTempLightThemeDisabledForPathname(useLocation().pathname);
}
