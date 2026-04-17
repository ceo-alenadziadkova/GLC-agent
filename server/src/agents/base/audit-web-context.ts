/**
 * Read audit URL context for collectors and agent prompts.
 */

import { supabase } from '../../services/supabase.js';

export type AuditWebContext = { companyUrl: string; noPublicWebsite: boolean };

/**
 * Throws if the audit row is missing or inaccessible — prevents silent
 * empty-string company URLs from propagating into collectors and Claude prompts.
 */
export async function fetchAuditWebContext(auditId: string): Promise<AuditWebContext> {
  const { data, error } = await supabase
    .from('audits')
    .select('company_url, no_public_website')
    .eq('id', auditId)
    .single();

  if (error || !data) {
    throw new Error(`Audit not found or inaccessible: ${auditId}`);
  }

  return {
    companyUrl: data.company_url as string,
    noPublicWebsite: data.no_public_website === true,
  };
}
