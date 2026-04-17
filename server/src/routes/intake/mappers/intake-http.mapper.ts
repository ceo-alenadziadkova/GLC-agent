import { INTAKE_PUBLIC_CLIENT_PATH } from '../../../config/intake-public-client-path.js';
import { resolveFrontendBaseUrl } from '../../../config/frontend-url.js';

export function buildIntakePublicClientUrl(token: string): string {
  const base = resolveFrontendBaseUrl();
  return `${base}${INTAKE_PUBLIC_CLIENT_PATH}/${token}`;
}

export type IntakeSubmissionListItem = {
  token: string;
  metadata: Record<string, unknown>;
  responses: Record<string, unknown>;
  submitted_at: string;
  expires_at: string;
  audit_id: string | null;
  intake_url: string;
};

export function mapIntakeSubmissionsRows(rows: Record<string, unknown>[]): IntakeSubmissionListItem[] {
  const base = resolveFrontendBaseUrl();
  return rows.map(r => ({
    token: r.token as string,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    responses: (r.responses as Record<string, unknown>) ?? {},
    submitted_at: r.submitted_at as string,
    expires_at: r.expires_at as string,
    audit_id: (r.audit_id as string | null) ?? null,
    intake_url: `${base}${INTAKE_PUBLIC_CLIENT_PATH}/${r.token as string}`,
  }));
}
