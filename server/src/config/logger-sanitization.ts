export const LOGGER_REDACTED_KEYS = [
  'email',
  'token',
  'authorization',
  'auth',
  'password',
  'cookie',
  'secret',
] as const;

export const LOGGER_EMAIL_REPLACEMENT = '[REDACTED_EMAIL]' as const;
export const LOGGER_TOKEN_REPLACEMENT = '[REDACTED_SECRET]' as const;
