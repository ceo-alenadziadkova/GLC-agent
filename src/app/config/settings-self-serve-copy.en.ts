/**
 * Settings — client portal self-serve audit owner (consultant).
 */

export const SETTINGS_SELF_SERVE_COPY = {
  implicitFallbackCalloutTitle: 'Using an implicit default owner',
  implicitFallbackCalloutBody:
    'No consultant is stored in platform_settings yet. The API is using a fallback (legacy platform admin list or, in open mode, the earliest consultant by signup). Save an assignment below to persist a clear owner in the database.',
  implicitFallbackHintShort:
    'Persisting a consultant here writes platform_settings and makes ownership explicit for billing and access.',
} as const;
