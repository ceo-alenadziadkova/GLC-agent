/**
 * Notifications / Telegram / in-app delivery defaults (CONFIG layer — not ENV).
 */

export const SYSTEM_DEFAULTS_NOTIFICATIONS = {
  /**
   * Minimum interval between identical `emitStructuredNotification` logical events
   * (key = category + event + audience-scoped id + optional audit).
   * Suppresses duplicate Telegram + in-app rows during failure storms.
   */
  structuredNotificationDedupCooldownMs: 60_000,
} as const;
