import { describe, expect, it } from 'vitest';
import { isGlcTempLightThemeDisabledForPathname } from './glc-temp-light-theme';
import { APP_ROUTE_PATHS } from '../config/route-paths';
import { APP_ROUTE_SEGMENTS as P } from '@glc/intake-core';

describe('isGlcTempLightThemeDisabledForPathname', () => {
  it('enables dark-only on marketing, legal, and login', () => {
    expect(isGlcTempLightThemeDisabledForPathname('/')).toBe(true);
    expect(isGlcTempLightThemeDisabledForPathname('/login')).toBe(true);
    expect(isGlcTempLightThemeDisabledForPathname(APP_ROUTE_PATHS.home)).toBe(true);
    expect(isGlcTempLightThemeDisabledForPathname(APP_ROUTE_PATHS.snapshot)).toBe(true);
    expect(isGlcTempLightThemeDisabledForPathname(APP_ROUTE_PATHS.starterPackage)).toBe(true);
    expect(isGlcTempLightThemeDisabledForPathname('/legal/privacy')).toBe(true);
    expect(isGlcTempLightThemeDisabledForPathname(`/${P.discoveryPublicLegacy}`)).toBe(true);
    expect(isGlcTempLightThemeDisabledForPathname('/express-audit')).toBe(true);
  });

  it('does not lock the app shell', () => {
    expect(isGlcTempLightThemeDisabledForPathname('/dashboard')).toBe(false);
    expect(isGlcTempLightThemeDisabledForPathname('/settings')).toBe(false);
  });
});
