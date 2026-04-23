/**
 * Shared auth context for E2E tests that need a real bearer token.
 * Reuses the same env vars as API-oriented orchestration specs.
 */
export const consultantAuthEnv = {
  auditId: process.env.E2E_ORCHESTRATION_AUDIT_ID,
  token: process.env.E2E_ORCHESTRATION_AUTH_TOKEN,
} as const;

export function requireConsultantAuth(): { auditId: string; token: string } {
  const { auditId, token } = consultantAuthEnv;
  if (!auditId || !token) {
    throw new Error('Set E2E_ORCHESTRATION_AUDIT_ID and E2E_ORCHESTRATION_AUTH_TOKEN');
  }
  return { auditId, token };
}
