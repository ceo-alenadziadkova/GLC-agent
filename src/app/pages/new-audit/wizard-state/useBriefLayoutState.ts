import { useMemo, useState } from 'react';
import { useBriefLayoutPrefsSync } from '../../../hooks/useBriefLayoutPrefsSync';
import {
  CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE,
  CONSULTANT_BRIEF_LAYOUT_DEFAULT_KEY,
  consultantBriefLayoutStorageKey,
  readConsultantNewAuditBriefLayout,
  writeConsultantBriefLayout,
  clearConsultantBriefLayout,
  CLIENT_BRIEF_LAYOUT_DEFAULT_KEY,
} from '../../../lib/client-brief-layout-preference';
import {
  BRIEF_LAYOUT_CLASSIC,
  BRIEF_LAYOUT_UNSET,
  BRIEF_LAYOUT_WIZARD,
} from '../wizard-config/wizard-constants';

export type BriefLayoutChoice = 'unset' | 'classic' | 'wizard';

export function useBriefLayoutState(params: {
  isClientSelfServe: boolean;
  seededChoice?: BriefLayoutChoice | null;
}) {
  const [briefLayoutChoice, setBriefLayoutChoice] = useState<BriefLayoutChoice>(() => {
    if (params.seededChoice === BRIEF_LAYOUT_CLASSIC || params.seededChoice === BRIEF_LAYOUT_WIZARD) {
      return params.seededChoice;
    }
    if (params.isClientSelfServe) {
      return BRIEF_LAYOUT_WIZARD;
    }
    return readConsultantNewAuditBriefLayout() ?? BRIEF_LAYOUT_UNSET;
  });

  const briefLayoutSyncKeys = useMemo(
    () =>
      params.isClientSelfServe
        ? [CLIENT_BRIEF_LAYOUT_DEFAULT_KEY]
        : [CONSULTANT_BRIEF_LAYOUT_DEFAULT_KEY, consultantBriefLayoutStorageKey(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE)],
    [params.isClientSelfServe],
  );

  useBriefLayoutPrefsSync(briefLayoutSyncKeys, () => {
    if (params.isClientSelfServe) {
      setBriefLayoutChoice(BRIEF_LAYOUT_WIZARD);
      return;
    }
    setBriefLayoutChoice(readConsultantNewAuditBriefLayout() ?? BRIEF_LAYOUT_UNSET);
  });

  function handleSelectConsultantBriefLayout(mode: 'classic' | 'wizard') {
    if (params.isClientSelfServe) {
      setBriefLayoutChoice(BRIEF_LAYOUT_WIZARD);
    } else {
      writeConsultantBriefLayout(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE, mode);
      setBriefLayoutChoice(mode);
    }
  }

  function handleChangeConsultantBriefLayout() {
    if (params.isClientSelfServe) {
      setBriefLayoutChoice(BRIEF_LAYOUT_WIZARD);
    } else {
      clearConsultantBriefLayout(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE);
      setBriefLayoutChoice(BRIEF_LAYOUT_UNSET);
    }
  }

  return {
    briefLayoutChoice,
    setBriefLayoutChoice,
    layoutSelected: briefLayoutChoice === BRIEF_LAYOUT_CLASSIC || briefLayoutChoice === BRIEF_LAYOUT_WIZARD,
    handleSelectConsultantBriefLayout,
    handleChangeConsultantBriefLayout,
  };
}
