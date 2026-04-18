/**
 * Feasibility risk descriptions for consultants (CMS-style JSON). Templates use `{{var}}` placeholders.
 */
import raw from './feasibility-risk-messages.en.json' with { type: 'json' };

const messages = raw as Record<string, string>;

export function feasibilityRiskDescription(code: string, vars?: Record<string, string | number>): string {
  const template = messages[code];
  if (typeof template !== 'string') return code;
  if (!vars) return template;
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{{${k}}}`).join(String(v));
  }
  return s;
}
