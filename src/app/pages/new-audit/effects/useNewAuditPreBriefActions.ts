import { useCallback } from 'react';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { createPreBriefToken, validatePreBriefInput } from '../wizard-services/prebrief-token.service';

type PreBriefStateShape = {
  preBriefCompany: string;
  preBriefWebsite: string;
  preBriefIndustryField: string;
  preBriefIndustrySpecify: string;
  preBriefMessage: string;
  preBriefConsultantName: string;
  preBriefExpectedContact: string;
  preBriefContactChannel: string;
  preBriefEmail: string;
  preBriefWhatsapp: string;
  setPreBriefErr: (value: string | null) => void;
  setPreBriefLoading: (value: boolean) => void;
  setPreBriefLink: (value: string | null) => void;
  setPreBriefToken: (value: string | null) => void;
};

export function useNewAuditPreBriefActions(args: {
  user: { id?: string } | null;
  preBriefState: PreBriefStateShape;
}) {
  const handlePreBriefCreate = useCallback(async () => {
    args.preBriefState.setPreBriefErr(null);
    args.preBriefState.setPreBriefLoading(true);
    args.preBriefState.setPreBriefLink(null);
    try {
      const validation = validatePreBriefInput({
        company: args.preBriefState.preBriefCompany,
        website: args.preBriefState.preBriefWebsite,
        industryField: args.preBriefState.preBriefIndustryField,
        industrySpecify: args.preBriefState.preBriefIndustrySpecify,
        message: args.preBriefState.preBriefMessage,
        consultantName: args.preBriefState.preBriefConsultantName,
        expectedContact: args.preBriefState.preBriefExpectedContact,
        contactChannel: args.preBriefState.preBriefContactChannel,
        email: args.preBriefState.preBriefEmail,
        whatsapp: args.preBriefState.preBriefWhatsapp,
      });
      if (validation.hasError) {
        args.preBriefState.setPreBriefErr(WORKSPACE_PAGE_COPY.newAudit.preBriefIndustryOtherRequired);
        args.preBriefState.setPreBriefLoading(false);
        return;
      }
      const { url: link, token } = await createPreBriefToken({
        user: args.user,
        draft: {
          company: args.preBriefState.preBriefCompany,
          website: args.preBriefState.preBriefWebsite,
          industryField: args.preBriefState.preBriefIndustryField,
          industrySpecify: args.preBriefState.preBriefIndustrySpecify,
          message: args.preBriefState.preBriefMessage,
          consultantName: args.preBriefState.preBriefConsultantName,
          expectedContact: args.preBriefState.preBriefExpectedContact,
          contactChannel: args.preBriefState.preBriefContactChannel,
          email: args.preBriefState.preBriefEmail,
          whatsapp: args.preBriefState.preBriefWhatsapp,
        },
      });
      args.preBriefState.setPreBriefLink(link);
      args.preBriefState.setPreBriefToken(token);
    } catch (e) {
      args.preBriefState.setPreBriefErr((e as Error).message);
    } finally {
      args.preBriefState.setPreBriefLoading(false);
    }
  }, [args]);

  return { handlePreBriefCreate };
}
