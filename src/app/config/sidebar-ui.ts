/**
 * Sidebar shell UI defaults (layout chrome, not product business rules).
 */

export const SIDEBAR_COOKIE_NAME = "sidebar_state" as const;

export const SIDEBAR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const SIDEBAR_COOKIE_PATH = "/" as const;

export const SIDEBAR_WIDTH_CSS = "var(--sidebar-width)" as const;

export const SIDEBAR_WIDTH_MOBILE_CSS = "var(--sidebar-width-mobile)" as const;

export const SIDEBAR_WIDTH_ICON_CSS = "var(--sidebar-width-icon)" as const;

export const SIDEBAR_KEYBOARD_SHORTCUT_KEY = "b" as const;

export const SIDEBAR_TOOLTIP_PROVIDER_DELAY_MS = 0;

export const SIDEBAR_TRIGGER_BUTTON_CLASS = "size-7";

export const SIDEBAR_MENU_SKELETON_TEXT_WIDTH_PERCENT_DEFAULT = 70;

export const SIDEBAR_MENU_SKELETON_TEXT_WIDTH_PERCENT_MIN = 50;

export const SIDEBAR_MENU_SKELETON_TEXT_WIDTH_PERCENT_MAX = 90;

export function setSidebarOpenCookie(open: boolean): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=${SIDEBAR_COOKIE_PATH}; max-age=${SIDEBAR_COOKIE_MAX_AGE_SECONDS}`;
}
