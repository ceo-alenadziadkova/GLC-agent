import { useMemo, useState } from 'react';
import { useBriefLayoutPrefsSync } from '../../../hooks/useBriefLayoutPrefsSync';
import {
  CLIENT_SELF_SERVE_NEW_AUDIT_SCOPE,
  CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE,
  CONSULTANT_BRIEF_LAYOUT_DEFAULT_KEY,
  consultantBriefLayoutStorageKey,
  resolveConsultantBriefLayout,
  writeConsultantBriefLayout,
  clearConsultantBriefLayout,
  resolveClientBriefLayout,
  writeClientBriefLayout,
  clearClientBriefLayout,
  CLIENT_BRIEF_LAYOUT_DEFAULT_KEY,
  clientBriefLayoutStorageKey,
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
    if (params.isClientSelfServe) {
      if (params.seededChoice === BRIEF_LAYOUT_CLASSIC || params.seededChoice === BRIEF_LAYOUT_WIZARD) {
        return params.seededChoice;
      }
      // Client self-serve defaults to guided wizard to reduce perceived load.
      return resolveClientBriefLayout(CLIENT_SELF_SERVE_NEW_AUDIT_SCOPE) ?? BRIEF_LAYOUT_WIZARD;
    }
    return resolveConsultantBriefLayout(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE) ?? BRIEF_LAYOUT_UNSET;
  });

  const briefLayoutSyncKeys = useMemo(
    () =>
      params.isClientSelfServe
        ? [CLIENT_BRIEF_LAYOUT_DEFAULT_KEY, clientBriefLayoutStorageKey(CLIENT_SELF_SERVE_NEW_AUDIT_SCOPE)]
        : [CONSULTANT_BRIEF_LAYOUT_DEFAULT_KEY, consultantBriefLayoutStorageKey(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE)],
    [params.isClientSelfServe],
  );

  useBriefLayoutPrefsSync(briefLayoutSyncKeys, () => {
    setBriefLayoutChoice(
      params.isClientSelfServe
        ? (resolveClientBriefLayout(CLIENT_SELF_SERVE_NEW_AUDIT_SCOPE) ?? BRIEF_LAYOUT_UNSET)
        : (resolveConsultantBriefLayout(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE) ?? BRIEF_LAYOUT_UNSET),
    );
  });

  function handleSelectConsultantBriefLayout(mode: 'classic' | 'wizard') {
    if (params.isClientSelfServe) {
      writeClientBriefLayout(CLIENT_SELF_SERVE_NEW_AUDIT_SCOPE, mode);
    } else {
      writeConsultantBriefLayout(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE, mode);
    }
    setBriefLayoutChoice(mode);
  }

  function handleChangeConsultantBriefLayout() {
    if (params.isClientSelfServe) {
      clearClientBriefLayout(CLIENT_SELF_SERVE_NEW_AUDIT_SCOPE);
    } else {
      clearConsultantBriefLayout(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE);
    }
    setBriefLayoutChoice(BRIEF_LAYOUT_UNSET);
  }

  return {
    briefLayoutChoice,
    setBriefLayoutChoice,
    layoutSelected: briefLayoutChoice === BRIEF_LAYOUT_CLASSIC || briefLayoutChoice === BRIEF_LAYOUT_WIZARD,
    handleSelectConsultantBriefLayout,
    handleChangeConsultantBriefLayout,
  };
}
