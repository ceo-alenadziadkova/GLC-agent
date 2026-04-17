import type { User } from '@supabase/supabase-js';
import { api } from '../../../data/apiService';
import { defaultConsultantDisplayName } from '../../../lib/new-audit-helpers';
import { INDUSTRY_OTHER_VALUE } from '../wizard-config/wizard-constants';

export type PreBriefDraftInput = {
  company: string;
  website: string;
  industryField: string;
  industrySpecify: string;
  message: string;
  consultantName: string;
  expectedContact: string;
  contactChannel: string;
  email: string;
  whatsapp: string;
};

export type CreatePreBriefTokenParams = {
  draft: PreBriefDraftInput;
  user: User | null;
};

export function validatePreBriefInput(draft: PreBriefDraftInput): {
  hasError: boolean;
} {
  const hasError = draft.industryField === INDUSTRY_OTHER_VALUE && !draft.industrySpecify.trim();
  return { hasError };
}

export async function createPreBriefToken(
  params: CreatePreBriefTokenParams,
): Promise<{ url: string; token: string }> {
  const draft = params.draft;
  const consultantName = draft.consultantName.trim() || defaultConsultantDisplayName(params.user);

  return api.createIntakeToken({
    metadata: {
      ...(draft.company.trim() ? { company_name: draft.company.trim() } : {}),
      ...(draft.website.trim() ? { company_website: draft.website.trim() } : {}),
      ...(draft.industryField.trim() ? { industry: draft.industryField.trim() } : {}),
      ...(draft.industryField === INDUSTRY_OTHER_VALUE && draft.industrySpecify.trim()
        ? { industry_specify: draft.industrySpecify.trim() }
        : {}),
      ...(draft.message.trim() ? { message: draft.message.trim() } : {}),
      ...(consultantName ? { consultant_name: consultantName } : {}),
      ...(draft.expectedContact.trim() ? { expected_contact: draft.expectedContact.trim() } : {}),
      ...(draft.contactChannel.trim() ? { contact_channel: draft.contactChannel.trim() } : {}),
      ...(draft.email.trim() ? { consultant_email: draft.email.trim() } : {}),
      ...(draft.whatsapp.trim() ? { consultant_whatsapp: draft.whatsapp.trim() } : {}),
    },
  });
}
