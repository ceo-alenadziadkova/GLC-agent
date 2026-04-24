export const API_ERROR_UI_COPY = {
  fallback: 'Something went wrong. Please retry.',
  byCode: {
    AUTH_NOT_AUTHENTICATED: 'Your session expired. Please sign in again.',
    AUTH_INVALID_TOKEN: 'Your session expired. Please sign in again.',
    AUTH_MISSING_AUTHORIZATION: 'Please sign in to continue.',
    AUTH_ROLE_REQUIRED: 'You do not have access to this action.',
    GENERAL_API_RATE_LIMITED: 'Too many requests. Please retry shortly.',
    PIPELINE_RATE_LIMITED: 'Too many pipeline actions right now. Please retry shortly.',
    PIPELINE_START_FAILED:
      'We could not start the audit run. Your consultant has been notified; please try again later or contact them if this continues.',
    PIPELINE_STATUS_FAILED:
      'The audit run hit an issue. Your consultant has been notified and will follow up. You do not need to do anything right now.',
    PIPELINE_AUDIT_NOT_FOUND: 'This audit is not available. If you need help, contact your consultant.',
    PIPELINE_TOKEN_BUDGET_EXCEEDED:
      'This audit has reached its usage limit. Please contact your consultant to continue.',
    PIPELINE_NEXT_CLAIM_CONFLICT:
      'Another request may have already advanced this audit (for example a second tab or a background action). Refresh the page or wait a moment, then check the pipeline status.',
    AUDIT_CREATE_RATE_LIMITED: 'You reached the audit creation limit. Please retry later.',
  },
} as const;
