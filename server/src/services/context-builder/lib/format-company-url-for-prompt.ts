import { auditSkipsPublicWebsiteFetches } from '@glc/intake-core';
import { CONTEXT_BUILDER_NO_PUBLIC_WEBSITE_LINE } from '../../../config/prompt-fragments.js';

export function formatCompanyUrlForPrompt(url: string, noPublicWebsite?: boolean | null): string {
  return auditSkipsPublicWebsiteFetches(noPublicWebsite, url) ? CONTEXT_BUILDER_NO_PUBLIC_WEBSITE_LINE : url;
}
