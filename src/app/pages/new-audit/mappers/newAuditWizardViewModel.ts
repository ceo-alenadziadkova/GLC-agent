type PreBriefStateShape = {
  preBriefOpen: boolean;
  setPreBriefOpen: (value: boolean) => void;
  preBriefCompany: string;
  setPreBriefCompany: (value: string) => void;
  preBriefWebsite: string;
  setPreBriefWebsite: (value: string) => void;
  preBriefIndustryField: string;
  setPreBriefIndustryField: (value: string) => void;
  preBriefIndustrySpecify: string;
  setPreBriefIndustrySpecify: (value: string) => void;
  preBriefMessage: string;
  setPreBriefMessage: (value: string) => void;
  preBriefConsultantName: string;
  setPreBriefConsultantName: (value: string) => void;
  preBriefExpectedContact: string;
  setPreBriefExpectedContact: (value: string) => void;
  preBriefContactChannel: string;
  setPreBriefContactChannel: (value: string) => void;
  preBriefEmail: string;
  setPreBriefEmail: (value: string) => void;
  preBriefWhatsapp: string;
  setPreBriefWhatsapp: (value: string) => void;
  preBriefLink: string | null;
  setPreBriefLink: (value: string | null) => void;
  preBriefToken: string | null;
  setPreBriefToken: (value: string | null) => void;
  preBriefLoading: boolean;
  setPreBriefLoading: (value: boolean) => void;
  preBriefErr: string | null;
  setPreBriefErr: (value: string | null) => void;
  closePreBriefModal: () => void;
};

export function buildPreBriefViewModel(preBriefState: PreBriefStateShape) {
  return {
    preBriefOpen: preBriefState.preBriefOpen,
    setPreBriefOpen: preBriefState.setPreBriefOpen,
    preBriefCompany: preBriefState.preBriefCompany,
    setPreBriefCompany: preBriefState.setPreBriefCompany,
    preBriefWebsite: preBriefState.preBriefWebsite,
    setPreBriefWebsite: preBriefState.setPreBriefWebsite,
    preBriefIndustryField: preBriefState.preBriefIndustryField,
    setPreBriefIndustryField: preBriefState.setPreBriefIndustryField,
    preBriefIndustrySpecify: preBriefState.preBriefIndustrySpecify,
    setPreBriefIndustrySpecify: preBriefState.setPreBriefIndustrySpecify,
    preBriefMessage: preBriefState.preBriefMessage,
    setPreBriefMessage: preBriefState.setPreBriefMessage,
    preBriefConsultantName: preBriefState.preBriefConsultantName,
    setPreBriefConsultantName: preBriefState.setPreBriefConsultantName,
    preBriefExpectedContact: preBriefState.preBriefExpectedContact,
    setPreBriefExpectedContact: preBriefState.setPreBriefExpectedContact,
    preBriefContactChannel: preBriefState.preBriefContactChannel,
    setPreBriefContactChannel: preBriefState.setPreBriefContactChannel,
    preBriefEmail: preBriefState.preBriefEmail,
    setPreBriefEmail: preBriefState.setPreBriefEmail,
    preBriefWhatsapp: preBriefState.preBriefWhatsapp,
    setPreBriefWhatsapp: preBriefState.setPreBriefWhatsapp,
    preBriefLink: preBriefState.preBriefLink,
    setPreBriefLink: preBriefState.setPreBriefLink,
    preBriefToken: preBriefState.preBriefToken,
    setPreBriefToken: preBriefState.setPreBriefToken,
    preBriefLoading: preBriefState.preBriefLoading,
    setPreBriefLoading: preBriefState.setPreBriefLoading,
    preBriefErr: preBriefState.preBriefErr,
    setPreBriefErr: preBriefState.setPreBriefErr,
    closePreBriefModal: preBriefState.closePreBriefModal,
  };
}
