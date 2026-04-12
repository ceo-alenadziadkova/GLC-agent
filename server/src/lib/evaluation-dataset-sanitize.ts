const URL_IN_STRING = /\bhttps?:\/\/[^\s"'<>]+/gi;
const EMAIL_IN_STRING = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/** Keys whose values are always redacted (case-insensitive match). */
const SENSITIVE_KEY_RE = /^(company_url|companyurl|email|contact_email|phone|telephone|password|secret|token|api_key)$/i;

/**
 * Deep-clone JSON-like data and redact obvious PII / URLs for evaluation storage.
 */
export function sanitizeJsonForEvaluationDataset(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value
      .replace(URL_IN_STRING, '[redacted_url]')
      .replace(EMAIL_IN_STRING, '[redacted_email]');
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map(sanitizeJsonForEvaluationDataset);
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_RE.test(k)) {
      out[k] = '[redacted]';
    } else {
      out[k] = sanitizeJsonForEvaluationDataset(v);
    }
  }
  return out;
}
