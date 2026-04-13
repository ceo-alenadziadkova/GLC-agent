/**
 * Build absolute URLs for public marketing routes from the current origin.
 * Keeps path constants in config; avoids scattering `window.location` assembly.
 */

export function buildAbsoluteUrlFromOrigin(pathname: string): string {
  if (typeof window === 'undefined') return pathname;
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${window.location.origin}${path}`;
}
