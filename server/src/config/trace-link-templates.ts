/**
 * Optional trace deep-link templates (infrastructure ENV) for alert / notification text.
 * Placeholder in each template: `{trace_id}`.
 */

const TRACE_ID_TOKEN = '{trace_id}';

export function getSentryTraceLinkTemplate(): string | undefined {
  const t = process.env.SENTRY_TRACE_LINK_TEMPLATE?.trim();
  return t || undefined;
}

export function getGenericTraceLinkTemplate(): string | undefined {
  const t = process.env.TRACE_LINK_TEMPLATE?.trim();
  return t || undefined;
}

/**
 * Formats a multi-line suffix for pipeline alert messages (Sentry / generic trace URLs or raw id).
 */
export function formatObservabilityTraceSuffixForAlerts(traceId?: string): string {
  if (!traceId) return '';
  const sentryTemplate = getSentryTraceLinkTemplate();
  const traceTemplate = getGenericTraceLinkTemplate();
  const sentryLink = sentryTemplate ? sentryTemplate.replace(TRACE_ID_TOKEN, traceId) : undefined;
  const traceLink = traceTemplate ? traceTemplate.replace(TRACE_ID_TOKEN, traceId) : undefined;
  const parts = [sentryLink ? `Sentry: ${sentryLink}` : null, traceLink ? `Trace: ${traceLink}` : null].filter(Boolean);
  return parts.length > 0 ? `\n${parts.join('\n')}` : `\ntrace_id=${traceId}`;
}
