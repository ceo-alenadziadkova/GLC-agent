/**
 * Settings — client portal self-serve audit owner (consultant).
 */

export const SETTINGS_SELF_SERVE_COPY = {
  envFallbackCalloutTitle: 'Server env fallback is active',
  envFallbackCalloutBody:
    'The running API still resolves the default owner from the SELF_SERVE_AUDIT_OWNER_USER_ID environment variable because no value is stored in platform_settings yet. Use Save assignment below to persist a consultant in the database so normal operation does not depend on deploy config.',
  envFallbackHintShort:
    'No consultant is saved in the database yet; a backup default from the server environment may still apply. Saving below writes platform_settings and removes reliance on SELF_SERVE_AUDIT_OWNER_USER_ID for day-to-day operation.',
} as const;
