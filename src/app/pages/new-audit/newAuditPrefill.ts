import { useEffect } from 'react';
import { DISCOVERY_BRIEF_PATCH_A5_NO_WEBSITE_YET } from '@glc/intake-core';
import { api, ApiError } from '../../data/apiService';
import { isIndustryOption } from '../../data/industry-options';
import type { BriefResponseEntry, BriefResponses } from '../../data/briefQuestions';
import { normalizeIntakeToResponses } from '../../data/intakeBriefMap';
import { applyIntakeMetadataPrefill } from '../../lib/intake-client-copy';
import { unwrapBriefString, websiteAnswerToAuditUrl } from '../../lib/new-audit-helpers';
import { GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY } from '../../lib/storage-keys';
import type { Dispatch, SetStateAction } from 'react';

export type UseIntakeTokenPrefillDeps = {
  intakeTokenFromUrl: string;
  isClientSelfServe: boolean;
  setResponses: Dispatch<SetStateAction<BriefResponses>>;
  setIntakePrefillActive: Dispatch<SetStateAction<boolean>>;
  setNoPublicWebsite: Dispatch<SetStateAction<boolean>>;
  setUrl: Dispatch<SetStateAction<string>>;
  setName: Dispatch<SetStateAction<string>>;
  setIndustry: Dispatch<SetStateAction<string>>;
  setIndustrySpecify: Dispatch<SetStateAction<string>>;
};

export function useIntakeTokenPrefill({
  intakeTokenFromUrl,
  isClientSelfServe,
  setResponses,
  setIntakePrefillActive,
  setNoPublicWebsite,
  setUrl,
  setName,
  setIndustry,
  setIndustrySpecify,
}: UseIntakeTokenPrefillDeps): void {
  useEffect(() => {
    if (isClientSelfServe || !intakeTokenFromUrl) return;
    let cancelled = false;
    (async () => {
      try {
        let data: Awaited<ReturnType<typeof api.getIntakeToken>>;
        try {
          data = await api.getIntakePrefillForConsultant(intakeTokenFromUrl);
        } catch (e) {
          if (e instanceof ApiError) {
            data = await api.getIntakeToken(intakeTokenFromUrl);
          } else {
            throw e;
          }
        }
        if (cancelled) return;

        let merged = normalizeIntakeToResponses(data.responses ?? {});
        merged = applyIntakeMetadataPrefill(merged, data.metadata ?? {});

        // Token / server answers win over empty local state.
        setResponses(prev => ({ ...prev, ...merged }));
        setIntakePrefillActive(true);

        const web =
          unwrapBriefString(merged, 'a11') ?? unwrapBriefString(merged, 'intake_company_website');
        if (web) {
          const auditUrl = websiteAnswerToAuditUrl(web);
          if (auditUrl) {
            setNoPublicWebsite(false);
            setUrl(u => (u.trim() ? u : auditUrl));
          } else {
            setNoPublicWebsite(true);
            setUrl('');
          }
        }

        const cname =
          unwrapBriefString(merged, 'a12')
          ?? unwrapBriefString(merged, 'intake_company_name')
          ?? (typeof data.metadata?.company_name === 'string' ? data.metadata.company_name.trim() : undefined);
        if (cname) {
          setName(n => (n.trim() ? n : cname));
        }

        const ind = unwrapBriefString(merged, 'a2') ?? unwrapBriefString(merged, 'intake_industry');
        if (ind && isIndustryOption(ind)) {
          setIndustry(i => (i ? i : ind));
        }
        if (ind === 'Other') {
          const spec = unwrapBriefString(merged, 'intake_industry_specify');
          setIndustrySpecify(spec ?? '');
        }
      } catch {
        // invalid or expired token — ignore, user continues fresh
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [intakeTokenFromUrl, isClientSelfServe, setResponses, setIntakePrefillActive, setNoPublicWebsite, setUrl, setName, setIndustry, setIndustrySpecify]);
}

export type UseDiscoverySessionPrefillDeps = {
  fromDiscovery: string;
  setResponses: Dispatch<SetStateAction<BriefResponses>>;
  setDiscoveryPrefilled: Dispatch<SetStateAction<boolean>>;
  setNoPublicWebsite: Dispatch<SetStateAction<boolean>>;
  setIndustry: Dispatch<SetStateAction<string>>;
};

export function useDiscoverySessionPrefill({
  fromDiscovery,
  setResponses,
  setDiscoveryPrefilled,
  setNoPublicWebsite,
  setIndustry,
}: UseDiscoverySessionPrefillDeps): void {
  useEffect(() => {
    if (!fromDiscovery) return;
    const token = localStorage.getItem(GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY);
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const session = await api.getDiscoverySession(token);
        if (cancelled || !session?.answers) return;

        const bankResponses: BriefResponses = {};
        for (const [key, val] of Object.entries(session.answers as Record<string, unknown>)) {
          if (val != null) {
            bankResponses[key] = { value: val as BriefResponseEntry['value'], source: 'client' };
          }
        }
        // Discovery mode always implies no public website.
        bankResponses.a5 = { value: DISCOVERY_BRIEF_PATCH_A5_NO_WEBSITE_YET, source: 'client' };

        setResponses(prev => ({ ...prev, ...bankResponses }));
        setNoPublicWebsite(true);

        const a2 = session.answers['a2'] as string | undefined;
        if (a2) setIndustry(a2);

        setDiscoveryPrefilled(true);
        localStorage.removeItem(GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY);
      } catch {
        // Non-critical — wizard opens blank if session can't be loaded
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fromDiscovery, setResponses, setDiscoveryPrefilled, setNoPublicWebsite, setIndustry]);
}

