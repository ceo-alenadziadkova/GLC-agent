import { API_PATHS, apiBriefPublicConvert, apiBriefPublicSession, apiBriefPublicSubmit } from '../../config/api-paths';
import type { BriefQuestion, BriefResponses } from '../briefQuestions';
import { apiFetch, publicApiFetch } from '../api-http';

export type BriefPublicSessionPayload = {
  session_token: string;
  questions: BriefQuestion[];
  responses: Record<string, unknown>;
  submitted_at: string | null;
  expires_at: string;
  intake_versions?: {
    questionBankVersion: string;
    policyVersion: string;
    layoutVersion: string;
    resolverVersion: string;
  };
};

export const briefPublicApi = {
  async createBriefPublicSession(body: {
    contact_name: string;
    company_name: string;
    has_website: boolean;
    website_url?: string;
    email?: string;
    phone?: string;
  }) {
    return publicApiFetch<BriefPublicSessionPayload & { resume_url: string }>(API_PATHS.briefPublicSession, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async getBriefPublicSession(token: string) {
    return publicApiFetch<BriefPublicSessionPayload>(apiBriefPublicSession(token));
  },

  async saveBriefPublicSession(token: string, responses: BriefResponses) {
    return publicApiFetch<BriefPublicSessionPayload & { ok: true }>(apiBriefPublicSession(token), {
      method: 'PATCH',
      body: JSON.stringify({ responses }),
    });
  },

  async submitBriefPublicSession(token: string, responses: BriefResponses) {
    return publicApiFetch<{ ok: true; submitted_at: string }>(apiBriefPublicSubmit(token), {
      method: 'POST',
      body: JSON.stringify({ responses }),
    });
  },

  async listBriefPublicSubmissions() {
    return apiFetch<{
      submissions: Array<{
        token: string;
        contact_name: string;
        contact_company: string;
        has_website: boolean;
        website_url: string | null;
        submitted_at: string;
        created_at: string;
        status: string;
        converted_audit_id: string | null;
      }>;
    }>(API_PATHS.briefPublicSubmissions);
  },

  async convertBriefPublicSession(token: string, auditId: string) {
    return apiFetch<{ audit_id: string }>(apiBriefPublicConvert(token), {
      method: 'POST',
      body: JSON.stringify({ audit_id: auditId }),
    });
  },
};
