import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import { SETTINGS_UI_POLICY } from '../config/settings-ui-policy';
import { SETTINGS_PAGE_DEFAULTS } from '../../../config/settings-page-defaults';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import {
  GLC_LEGAL_CONSENTS_UPDATED_WINDOW_EVENT,
  LEGAL_CONSENT_KEYS,
} from '../../../config/legal-consent-client-policy';
import { SETTINGS_PAGE_COPY } from '../../../config/settings-page-copy.en';
import { useAuth } from '../../../hooks/useAuth';
import { useGlcTheme } from '../../../hooks/useGlcTheme';
import { useProfile } from '../../../hooks/useProfile';
import { api } from '../../../data/apiService';
import type { NotificationPrefs, SelfServePayload } from '../domain/settings.types';
import { normalizeFullName, validateEmailChangeInput, validatePasswordChangeInput } from '../domain/settings.validation';
import {
  readBriefLayoutPrefs,
  readNotifyPrefs,
  setClientBriefLayoutDefault,
  setConsultantBriefLayoutDefault,
  subscribeBriefLayoutPrefsChanged,
  writeNotifyPrefs,
} from '../services/settings-local-preferences.service';
import { changeEmail, changePassword } from '../services/settings-auth.service';
import { saveProfileName } from '../services/settings-profile.service';
import { loadSelfServeOwner, saveSelfServeOwner } from '../services/settings-self-serve.service';
import {
  mapEmailValidationError,
  mapPasswordChangeError,
  mapPasswordValidationError,
  mapProfileSaveError,
  mapSelfServeSaveError,
} from '../mappers/settings-toast.mapper';
import { renderCopyTemplate } from '../utils/render-copy-template';
import type { ChangeEmailResult, ChangePasswordResult } from '../services/settings-auth.service';
import type { ValidationResult } from '../domain/settings.validation';

function isFailedPasswordChange(result: ChangePasswordResult): result is Extract<ChangePasswordResult, { ok: false }> {
  return result.ok === false;
}

function isFailedEmailChange(result: ChangeEmailResult): result is Extract<ChangeEmailResult, { ok: false }> {
  return result.ok === false;
}

function isValidationError(
  result: ValidationResult,
): result is Extract<ValidationResult, { ok: false }> {
  return result.ok === false;
}

export function useSettingsPageController() {
  const { user, signOut } = useAuth();
  const { profile, refetch, isClient, isConsultant, isAdmin, isGuest } = useProfile();
  const { mode, setMode } = useGlcTheme();

  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [notifyPrefs, setNotifyPrefs] = useState<NotificationPrefs>(readNotifyPrefs);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [clientBriefDefault, setClientBriefDefaultState] = useState(() => readBriefLayoutPrefs().clientDefault);
  const [consultantBriefDefault, setConsultantBriefDefaultState] = useState(() => readBriefLayoutPrefs().consultantDefault);

  const [selfServe, setSelfServe] = useState<SelfServePayload | null>(null);
  const [selfServeLoading, setSelfServeLoading] = useState(false);
  const [selfServeSaving, setSelfServeSaving] = useState(false);
  const [selfServeSelect, setSelfServeSelect] = useState('');

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
  }, [profile?.full_name]);

  useEffect(() => {
    const next = readBriefLayoutPrefs();
    setClientBriefDefaultState(next.clientDefault);
    setConsultantBriefDefaultState(next.consultantDefault);
  }, [profile?.id]);

  useEffect(() => subscribeBriefLayoutPrefsChanged(() => {
    const next = readBriefLayoutPrefs();
    setClientBriefDefaultState(next.clientDefault);
    setConsultantBriefDefaultState(next.consultantDefault);
  }), []);

  useEffect(() => {
    if (!isConsultant) {
      setSelfServe(null);
      return;
    }

    let cancelled = false;
    setSelfServeLoading(true);
    void loadSelfServeOwner()
      .then(data => {
        if (cancelled) return;
        setSelfServe(data);
        setSelfServeSelect(data.stored_owner_user_id ?? '');
      })
      .catch(() => {
        if (cancelled) return;
        setSelfServe(null);
        toast.error(WORKSPACE_PAGE_COPY.settings.loadAssignmentFailed);
      })
      .finally(() => {
        if (!cancelled) setSelfServeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isConsultant, profile?.id]);

  useEffect(() => {
    if (window.location.hash !== SETTINGS_UI_POLICY.hashes.briefLayoutAnchor) return;
    const timeoutId = window.setTimeout(() => {
      document.getElementById('brief-layout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, SETTINGS_UI_POLICY.timingsMs.initialAnchorScroll);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    writeNotifyPrefs(notifyPrefs);
  }, [notifyPrefs]);

  useEffect(() => {
    if (!profile?.id || isGuest) return;
    let cancelled = false;
    void api
      .getLegalConsents()
      .then(body => {
        if (cancelled) return;
        const m = body.effective.find(e => e.consent_key === LEGAL_CONSENT_KEYS.marketing);
        if (m) {
          setNotifyPrefs(prev => ({ ...prev, productUpdates: m.accepted }));
        }
      })
      .catch(() => {
        /* keep local prefs */
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.id, isGuest]);

  const setNotifyPrefsWithMarketingSync = useCallback<Dispatch<SetStateAction<NotificationPrefs>>>(action => {
    setNotifyPrefs(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next.productUpdates !== prev.productUpdates && profile?.id && !isGuest) {
        void api
          .postLegalConsents({
            source: 'settings',
            events: [{ consent_key: LEGAL_CONSENT_KEYS.marketing, accepted: next.productUpdates }],
          })
          .then(() => {
            window.dispatchEvent(new Event(GLC_LEGAL_CONSENTS_UPDATED_WINDOW_EVENT));
          })
          .catch(() => {
            toast.error(SETTINGS_PAGE_COPY.legalConsents.saveFailed);
          });
      }
      return next;
    });
  }, [profile?.id, isGuest]);

  const normalizedName = useMemo(() => normalizeFullName(fullName), [fullName]);
  const nameChanged = (profile?.full_name ?? null) !== normalizedName;

  const onSaveName = async () => {
    if (!nameChanged) return;
    setSavingName(true);
    try {
      await saveProfileName({ fullName: normalizedName });
      await refetch();
      toast.success(WORKSPACE_PAGE_COPY.settings.profileUpdated);
    } catch (error) {
      toast.error(mapProfileSaveError(error));
    } finally {
      setSavingName(false);
    }
  };

  const onChangePassword = async () => {
    const validation = validatePasswordChangeInput({
      newPassword,
      confirmPassword,
      minChars: SETTINGS_PAGE_DEFAULTS.minPasswordChars,
    });
    if (isValidationError(validation)) {
      if (validation.code === 'password_min_length') {
        toast.error(
          renderCopyTemplate(WORKSPACE_PAGE_COPY.settings.passwordMinLengthError, {
            min: SETTINGS_PAGE_DEFAULTS.minPasswordChars,
          }),
        );
      } else {
        const mapped = mapPasswordValidationError(validation);
        if (mapped) toast.error(mapped);
      }
      return;
    }

    setSavingPassword(true);
    try {
      const result = await changePassword(newPassword);
      if (isFailedPasswordChange(result)) {
        toast.error(mapPasswordChangeError(result.errorCode, result.errorMessage));
        return;
      }
      setNewPassword('');
      setConfirmPassword('');
      toast.success(WORKSPACE_PAGE_COPY.settings.passwordUpdated);
    } finally {
      setSavingPassword(false);
    }
  };

  const onChangeEmail = async () => {
    const validation = validateEmailChangeInput({
      nextEmailRaw: newEmail,
      currentEmail: user?.email ?? '',
    });
    if (isValidationError(validation)) {
      const mapped = mapEmailValidationError(validation);
      if (mapped) toast.error(mapped);
      return;
    }

    setSavingEmail(true);
    try {
      const result = await changeEmail(newEmail);
      if (isFailedEmailChange(result)) {
        toast.error(result.errorMessage);
        return;
      }
      setNewEmail('');
      toast.success(WORKSPACE_PAGE_COPY.settings.emailChangeDualConfirm);
    } finally {
      setSavingEmail(false);
    }
  };

  const onSaveSelfServe = async () => {
    setSelfServeSaving(true);
    try {
      const nextOwnerId = selfServeSelect.trim() === '' ? null : selfServeSelect.trim();
      const updated = await saveSelfServeOwner({ ownerUserId: nextOwnerId });
      setSelfServe(prev =>
        prev
          ? {
              ...prev,
              stored_owner_user_id: updated.stored_owner_user_id,
              effective_ready: updated.effective_ready,
              effective_owner_user_id: updated.effective_owner_user_id,
              env_fallback_active: updated.env_fallback_active,
              implicit_fallback_active: updated.implicit_fallback_active,
            }
          : prev,
      );
      toast.success(WORKSPACE_PAGE_COPY.settings.assignmentUpdated);
    } catch (error) {
      toast.error(mapSelfServeSaveError(error));
    } finally {
      setSelfServeSaving(false);
    }
  };

  return {
    user,
    signOut,
    profile,
    isClient,
    isConsultant,
    isAdmin,
    mode,
    setMode,
    fullName,
    setFullName,
    savingName,
    nameChanged,
    onSaveName,
    notifyPrefs,
    setNotifyPrefs: setNotifyPrefsWithMarketingSync,
    isGuest,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    savingPassword,
    onChangePassword,
    newEmail,
    setNewEmail,
    savingEmail,
    onChangeEmail,
    clientBriefDefault,
    consultantBriefDefault,
    setClientBriefLayoutDefault: (next: 'classic' | 'wizard' | null) => {
      setClientBriefLayoutDefault(next);
      setClientBriefDefaultState(next);
    },
    setConsultantBriefLayoutDefault: (next: 'classic' | 'wizard' | null) => {
      setConsultantBriefLayoutDefault(next);
      setConsultantBriefDefaultState(next);
    },
    selfServe,
    selfServeLoading,
    selfServeSaving,
    selfServeSelect,
    setSelfServeSelect,
    onSaveSelfServe,
  };
}
