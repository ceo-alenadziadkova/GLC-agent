export const API_ERROR_UI_COPY = {
  fallback: 'Something went wrong. Please retry.',
  byCode: {
    AUTH_NOT_AUTHENTICATED: 'Your session expired. Please sign in again.',
    AUTH_INVALID_TOKEN: 'Your session expired. Please sign in again.',
    AUTH_MISSING_AUTHORIZATION: 'Please sign in to continue.',
    AUTH_ROLE_REQUIRED: 'You do not have access to this action.',
    GENERAL_API_RATE_LIMITED: 'Too many requests. Please retry shortly.',
    PIPELINE_RATE_LIMITED: 'Too many pipeline actions right now. Please retry shortly.',
    AUDIT_CREATE_RATE_LIMITED: 'You reached the audit creation limit. Please retry later.',
  },
} as const;
