/**
 * Coarse client hints from built-in browser APIs (no third-party fingerprinting).
 * Used only for support / bug triage (Windows vs macOS vs Android vs iOS, etc.).
 */

export type ClientOsFamily =
  | 'windows'
  | 'macos'
  | 'linux'
  | 'android'
  | 'ios'
  | 'chromeos'
  | 'unknown';

export type ClientDeviceClass = 'desktop' | 'mobile' | 'tablet' | 'unknown';

export type ClientBrowserCoarse =
  | 'chrome'
  | 'firefox'
  | 'safari'
  | 'edge'
  | 'samsung'
  | 'opera'
  | 'other'
  | 'unknown';

export type ClientEnvironmentSummary = {
  os_family: ClientOsFamily;
  device_class: ClientDeviceClass;
  browser_coarse: ClientBrowserCoarse;
  /** Short UA prefix for edge cases (e.g. iPad pretending to be Mac). */
  user_agent_excerpt: string | null;
};

function isLikelyIpad(ua: string, platform: string, maxTouchPoints: number): boolean {
  if (/ipad/i.test(ua)) return true;
  return platform === 'MacIntel' && maxTouchPoints > 1;
}

export function inferOsFamilyFromNavigatorParts(
  ua: string,
  platform: string,
  maxTouchPoints: number,
): ClientOsFamily {
  const u = ua.toLowerCase();
  if (/android/i.test(ua)) return 'android';
  if (isLikelyIpad(ua, platform, maxTouchPoints)) return 'ios';
  if (/iphone|ipod/i.test(ua)) return 'ios';
  if (/cros\s|chromeos|crkey/i.test(u)) return 'chromeos';
  if (/windows nt|win64|win32|wow64/i.test(u)) return 'windows';
  if (/mac os x|macintosh/i.test(u)) return 'macos';
  if (/linux|x11/i.test(u)) return 'linux';
  return 'unknown';
}

export function inferDeviceClassFromNavigatorParts(
  ua: string,
  platform: string,
  maxTouchPoints: number,
): ClientDeviceClass {
  if (isLikelyIpad(ua, platform, maxTouchPoints)) return 'tablet';
  if (/iphone|ipod|android.+mobile|blackberry|iemobile|mobi/i.test(ua)) return 'mobile';
  if (/android/i.test(ua)) return 'tablet';
  if (!ua) return 'unknown';
  return 'desktop';
}

export function inferBrowserCoarseFromUa(ua: string): ClientBrowserCoarse {
  if (!ua.trim()) return 'unknown';
  const u = ua.toLowerCase();
  if (/edg\//i.test(ua)) return 'edge';
  if (/opr\/|opera/i.test(u)) return 'opera';
  if (/samsungbrowser/i.test(u)) return 'samsung';
  if ((/chrome|crios|crmo/i.test(u)) && !/edg/i.test(ua)) return 'chrome';
  if (/firefox|fxios/i.test(u)) return 'firefox';
  if (/safari/i.test(u) && !/chrome|crios|chromium|android/i.test(u)) return 'safari';
  return 'other';
}

/**
 * Safe to call from React in the browser; returns `unknown` values when `navigator` is missing.
 */
export function getClientEnvironmentSummary(): ClientEnvironmentSummary {
  if (typeof navigator === 'undefined') {
    return {
      os_family: 'unknown',
      device_class: 'unknown',
      browser_coarse: 'unknown',
      user_agent_excerpt: null,
    };
  }

  const ua = navigator.userAgent ?? '';
  const platform = navigator.platform ?? '';
  const maxTouch =
    typeof navigator.maxTouchPoints === 'number' && Number.isFinite(navigator.maxTouchPoints)
      ? navigator.maxTouchPoints
      : 0;

  return {
    os_family: inferOsFamilyFromNavigatorParts(ua, platform, maxTouch),
    device_class: inferDeviceClassFromNavigatorParts(ua, platform, maxTouch),
    browser_coarse: inferBrowserCoarseFromUa(ua),
    user_agent_excerpt: ua.length > 0 ? ua.slice(0, 120) : null,
  };
}

/** One line for copy-paste in support emails (no PII beyond public UA prefix). */
export function formatClientEnvironmentForSupport(): string {
  const e = getClientEnvironmentSummary();
  return `OS: ${e.os_family}; device: ${e.device_class}; browser: ${e.browser_coarse}`;
}
