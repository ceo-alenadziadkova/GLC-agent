import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { SignOut, Bell, User, PaintBucket, ClipboardText, Users, TreeStructure } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { AppShell } from '../components/AppShell';
import { QuestionBankStudio } from '../components/QuestionBankStudio';
import { isQuestionBankStudioEnabled } from '../lib/question-bank-studio-flags';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { api } from '../data/apiService';
import { useAuth } from '../hooks/useAuth';
import { useGlcTheme } from '../hooks/useGlcTheme';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';
import type { ClientBriefLayoutStored } from '../lib/client-brief-layout-preference';
import {
  BRIEF_LAYOUT_PREFS_CHANGED_EVENT,
  readClientBriefLayoutDefault,
  writeClientBriefLayoutDefault,
  applyClientBriefLayoutAskEachTime,
  readConsultantBriefLayoutDefault,
  writeConsultantBriefLayoutDefault,
  applyConsultantBriefLayoutAskEachTime,
} from '../lib/client-brief-layout-preference';
import { SETTINGS_SELF_SERVE_COPY } from '../config/settings-self-serve-copy.en';
import { SETTINGS_PAGE_COPY } from '../config/settings-page-copy.en';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';
import { SETTINGS_PAGE_DEFAULTS } from '../config/settings-page-defaults';

function renderCopyTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => String(vars[key] ?? ''));
}

type NotificationPrefs = {
  auditStatusReminders: boolean;
  productUpdates: boolean;
};

const NOTIFY_PREFS_KEY = 'glc_notify_prefs_v1';

function readNotifyPrefs(): NotificationPrefs {
  const fallback: NotificationPrefs = {
    auditStatusReminders: true,
    productUpdates: false,
  };
  try {
    const raw = localStorage.getItem(NOTIFY_PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      auditStatusReminders: parsed.auditStatusReminders ?? fallback.auditStatusReminders,
      productUpdates: parsed.productUpdates ?? fallback.productUpdates,
    };
  } catch {
    return fallback;
  }
}

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { profile, refetch, isClient, isConsultant } = useProfile();
  const { mode, setMode } = useGlcTheme();

  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [notifyPrefs, setNotifyPrefs] = useState<NotificationPrefs>(readNotifyPrefs);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [clientBriefDefault, setClientBriefDefault] = useState<ClientBriefLayoutStored | null>(() =>
    readClientBriefLayoutDefault(),
  );
  const [consultantBriefDefault, setConsultantBriefDefault] = useState<ClientBriefLayoutStored | null>(() =>
    readConsultantBriefLayoutDefault(),
  );

  type SelfServePayload = Awaited<ReturnType<typeof api.getPlatformSelfServeOwner>>;
  const [selfServe, setSelfServe] = useState<SelfServePayload | null>(null);
  const [selfServeLoading, setSelfServeLoading] = useState(false);
  const [selfServeSaving, setSelfServeSaving] = useState(false);
  const [selfServeSelect, setSelfServeSelect] = useState<string>('');

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
  }, [profile?.full_name]);

  useEffect(() => {
    setClientBriefDefault(readClientBriefLayoutDefault());
    setConsultantBriefDefault(readConsultantBriefLayoutDefault());
  }, [profile?.id]);

  useEffect(() => {
    const sync = () => {
      setClientBriefDefault(readClientBriefLayoutDefault());
      setConsultantBriefDefault(readConsultantBriefLayoutDefault());
    };
    window.addEventListener(BRIEF_LAYOUT_PREFS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(BRIEF_LAYOUT_PREFS_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!isConsultant) {
      setSelfServe(null);
      return;
    }
    let cancelled = false;
    setSelfServeLoading(true);
    api
      .getPlatformSelfServeOwner()
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
    if (window.location.hash !== SETTINGS_PAGE_DEFAULTS.scrollAnchorHash) {
      return;
    }
    const t = window.setTimeout(() => {
      document.getElementById('brief-layout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    localStorage.setItem(NOTIFY_PREFS_KEY, JSON.stringify(notifyPrefs));
  }, [notifyPrefs]);

  const normalizedName = useMemo(() => {
    const trimmed = fullName.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [fullName]);

  const nameChanged = (profile?.full_name ?? null) !== normalizedName;

  const saveName = async () => {
    if (!nameChanged) {
      return;
    }
    setSavingName(true);
    try {
      await api.patchProfile({ full_name: normalizedName });
      await refetch();
      toast.success(WORKSPACE_PAGE_COPY.settings.profileUpdated);
    } catch (error) {
      const message = error instanceof Error ? error.message : WORKSPACE_PAGE_COPY.settings.profileUpdateFailed;
      toast.error(message);
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < SETTINGS_PAGE_DEFAULTS.minPasswordChars) {
      toast.error(
        renderCopyTemplate(WORKSPACE_PAGE_COPY.settings.passwordMinLengthError, {
          min: SETTINGS_PAGE_DEFAULTS.minPasswordChars,
        }),
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(WORKSPACE_PAGE_COPY.settings.passwordMismatch);
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        const msg = (error.message ?? '').toLowerCase();
        if (msg.includes('reauth') || msg.includes('recent') || msg.includes('session')) {
          toast.error(WORKSPACE_PAGE_COPY.settings.passwordReauthRequired);
        } else {
          toast.error(error.message);
        }
        return;
      }
      setNewPassword('');
      setConfirmPassword('');
      toast.success(WORKSPACE_PAGE_COPY.settings.passwordUpdated);
    } finally {
      setSavingPassword(false);
    }
  };

  const changeEmail = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      toast.error(WORKSPACE_PAGE_COPY.settings.emailInvalid);
      return;
    }
    if (trimmed === (user?.email ?? '').toLowerCase()) {
      toast.error(WORKSPACE_PAGE_COPY.settings.emailAlreadyCurrent);
      return;
    }
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: trimmed });
      if (error) {
        toast.error(error.message);
        return;
      }
      setNewEmail('');
      toast.success(WORKSPACE_PAGE_COPY.settings.emailChangeDualConfirm);
    } finally {
      setSavingEmail(false);
    }
  };

  const studioTabEnabled = isQuestionBankStudioEnabled() && isConsultant;

  const [settingsTab, setSettingsTab] = useState<'general' | 'bank-studio'>(() => {
    if (
      typeof window !== 'undefined' &&
      window.location.hash.replace(/^#/, '') === SETTINGS_PAGE_DEFAULTS.questionBankStudioHash
    ) {
      return 'bank-studio';
    }
    return 'general';
  });

  useEffect(() => {
    if (!studioTabEnabled) return;
    if (window.location.hash.replace(/^#/, '') === SETTINGS_PAGE_DEFAULTS.questionBankStudioHash) {
      setSettingsTab('bank-studio');
    }
  }, [studioTabEnabled]);

  const onSettingsTabChange = (value: string) => {
    const next = value === 'bank-studio' ? 'bank-studio' : 'general';
    setSettingsTab(next);
    const base = window.location.pathname + window.location.search;
    if (next === 'bank-studio') {
      window.history.replaceState(null, '', `${base}#${SETTINGS_PAGE_DEFAULTS.questionBankStudioHash}`);
    } else {
      window.history.replaceState(null, '', base);
    }
  };

  const briefLayoutBtnStyle = (active: boolean): CSSProperties => ({
    borderRadius: 'var(--radius-md)',
    border: active ? '1px solid var(--glc-blue)' : '1px solid var(--border-default)',
    color: active ? 'var(--glc-blue)' : 'var(--text-secondary)',
    backgroundColor: active ? 'rgba(28,189,255,0.08)' : 'transparent',
    padding: '6px 10px',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
  });

  const generalSections = (
    <div className="px-7 py-6 space-y-5">
        <section
          className="p-5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
            <User className="w-4 h-4" />
            <h2 className="text-sm font-semibold">{SETTINGS_PAGE_COPY.profile.title}</h2>
          </div>
          <label className="block text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
            {SETTINGS_PAGE_COPY.profile.displayName}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder={SETTINGS_PAGE_COPY.profile.yourNamePlaceholder}
              className="flex-1 px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              className="glc-btn-primary"
              onClick={saveName}
              disabled={savingName || !nameChanged}
              style={{ opacity: savingName || !nameChanged ? 0.6 : 1 }}
            >
              {savingName ? SETTINGS_PAGE_COPY.profile.saving : SETTINGS_PAGE_COPY.profile.save}
            </button>
          </div>
        </section>

        <section
          className="p-5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
            <PaintBucket className="w-4 h-4" />
            <h2 className="text-sm font-semibold">{SETTINGS_PAGE_COPY.appearance.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {(['system', 'light', 'dark'] as const).map(themeMode => (
              <button
                key={themeMode}
                className="px-3 py-2 text-xs font-medium"
                onClick={() => setMode(themeMode)}
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: mode === themeMode ? '1px solid var(--glc-blue)' : '1px solid var(--border-default)',
                  color: mode === themeMode ? 'var(--glc-blue)' : 'var(--text-secondary)',
                  backgroundColor: mode === themeMode ? 'rgba(28,189,255,0.08)' : 'transparent',
                  textTransform: 'capitalize',
                }}
              >
                {themeMode}
              </button>
            ))}
          </div>
        </section>

        {profile && isConsultant && (
          <section
            className="p-5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
              <Users className="w-4 h-4" />
              <h2 className="text-sm font-semibold">{SETTINGS_PAGE_COPY.selfServe.title}</h2>
            </div>
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-quaternary)' }}>
              {SETTINGS_PAGE_COPY.selfServe.description}
            </p>
            {selfServeLoading ? (
              <p className="text-xs m-0" style={{ color: 'var(--text-tertiary)' }}>
                {SETTINGS_PAGE_COPY.selfServe.loading}
              </p>
            ) : !selfServe ? (
              <p className="text-xs m-0" style={{ color: 'var(--text-tertiary)' }}>
                {SETTINGS_PAGE_COPY.selfServe.loadFailed}
              </p>
            ) : (
              <>
                {!selfServe.effective_ready && (
                  <div
                    className="mb-4 px-3 py-2 rounded-lg text-xs leading-relaxed"
                    style={{
                      backgroundColor: 'var(--glc-orange-muted)',
                      border: '1px solid rgba(242,79,29,0.25)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {SETTINGS_PAGE_COPY.selfServe.notReady}
                  </div>
                )}
                {selfServe.implicit_fallback_active && (
                  <div className="mb-3 space-y-2">
                    <div
                      className="px-3 py-2 rounded-lg text-xs leading-relaxed"
                      style={{
                        backgroundColor: 'var(--callout-info-bg)',
                        border: '1px solid var(--callout-info-border)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <p className="font-semibold m-0 mb-1" style={{ color: 'var(--text-primary)' }}>
                        {SETTINGS_SELF_SERVE_COPY.implicitFallbackCalloutTitle}
                      </p>
                      <p className="m-0" style={{ color: 'var(--text-secondary)' }}>
                        {SETTINGS_SELF_SERVE_COPY.implicitFallbackCalloutBody}
                      </p>
                    </div>
                    <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--text-tertiary)' }}>
                      {SETTINGS_SELF_SERVE_COPY.implicitFallbackHintShort}
                    </p>
                  </div>
                )}
                {!selfServe.can_manage && (
                  <p className="text-xs leading-relaxed mb-3 m-0" style={{ color: 'var(--text-tertiary)' }}>
                    {SETTINGS_PAGE_COPY.selfServe.adminOnly}
                  </p>
                )}
                <label className="block text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  {SETTINGS_PAGE_COPY.selfServe.defaultConsultantLabel}
                </label>
                <div className="flex flex-col gap-3 mobile:flex-row mobile:items-center">
                  <select
                    className="w-full mobile:flex-1 px-3 py-2 text-sm"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                    }}
                    value={selfServeSelect}
                    onChange={e => setSelfServeSelect(e.target.value)}
                    disabled={!selfServe.can_manage || selfServeSaving}
                  >
                    <option value="">{SETTINGS_PAGE_COPY.selfServe.notSetFallback}</option>
                    {selfServe.consultants.map(c => {
                      const label =
                        [c.full_name?.trim(), c.email].filter(Boolean).join(' — ') ||
                        `${SETTINGS_PAGE_COPY.selfServe.fallbackUserIdLabelPrefix} ${c.id.slice(0, 8)}…`;
                      return (
                        <option key={c.id} value={c.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    className="glc-btn-primary whitespace-nowrap"
                    disabled={
                      !selfServe.can_manage ||
                      selfServeSaving ||
                      selfServeSelect === (selfServe.stored_owner_user_id ?? '')
                    }
                    style={{
                      opacity:
                        !selfServe.can_manage ||
                        selfServeSaving ||
                        selfServeSelect === (selfServe.stored_owner_user_id ?? '')
                          ? 0.55
                          : 1,
                    }}
                    onClick={async () => {
                      setSelfServeSaving(true);
                      try {
                        const next = selfServeSelect.trim() === '' ? null : selfServeSelect.trim();
                        const updated = await api.patchPlatformSelfServeOwner({ owner_user_id: next });
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
                      } catch (e) {
                        const msg =
                          e instanceof Error ? e.message : WORKSPACE_PAGE_COPY.settings.assignmentUpdateFailed;
                        toast.error(msg);
                      } finally {
                        setSelfServeSaving(false);
                      }
                    }}
                  >
                    {selfServeSaving ? SETTINGS_PAGE_COPY.selfServe.savingAssignment : SETTINGS_PAGE_COPY.selfServe.saveAssignment}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        <section
          id="brief-layout"
          className="p-5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
            <ClipboardText className="w-4 h-4" />
            <h2 className="text-sm font-semibold">{SETTINGS_PAGE_COPY.briefLayout.title}</h2>
          </div>
          <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-quaternary)' }}>
            {SETTINGS_PAGE_COPY.briefLayout.description}
          </p>

          {profile && isClient && (
            <div className="space-y-2 mb-5">
              <h3 className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {SETTINGS_PAGE_COPY.briefLayout.clientTitle}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
                {SETTINGS_PAGE_COPY.briefLayout.clientDescription}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    writeClientBriefLayoutDefault('classic');
                    setClientBriefDefault('classic');
                  }}
                  style={briefLayoutBtnStyle(clientBriefDefault === 'classic')}
                >
                  {SETTINGS_PAGE_COPY.briefLayout.classic}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    writeClientBriefLayoutDefault('wizard');
                    setClientBriefDefault('wizard');
                  }}
                  style={briefLayoutBtnStyle(clientBriefDefault === 'wizard')}
                >
                  {SETTINGS_PAGE_COPY.briefLayout.wizard}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyClientBriefLayoutAskEachTime();
                    setClientBriefDefault(null);
                  }}
                  style={briefLayoutBtnStyle(clientBriefDefault === null)}
                >
                  {SETTINGS_PAGE_COPY.briefLayout.askEachTime}
                </button>
              </div>
            </div>
          )}

          {profile && isConsultant && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {SETTINGS_PAGE_COPY.briefLayout.consultantTitle}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
                {SETTINGS_PAGE_COPY.briefLayout.consultantDescription}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    writeConsultantBriefLayoutDefault('classic');
                    setConsultantBriefDefault('classic');
                  }}
                  style={briefLayoutBtnStyle(consultantBriefDefault === 'classic')}
                >
                  {SETTINGS_PAGE_COPY.briefLayout.classic}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    writeConsultantBriefLayoutDefault('wizard');
                    setConsultantBriefDefault('wizard');
                  }}
                  style={briefLayoutBtnStyle(consultantBriefDefault === 'wizard')}
                >
                  {SETTINGS_PAGE_COPY.briefLayout.wizard}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyConsultantBriefLayoutAskEachTime();
                    setConsultantBriefDefault(null);
                  }}
                  style={briefLayoutBtnStyle(consultantBriefDefault === null)}
                >
                  {SETTINGS_PAGE_COPY.briefLayout.askEachTime}
                </button>
              </div>
            </div>
          )}
        </section>

        <section
          id="notifications"
          className="p-5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
            <Bell className="w-4 h-4" />
            <h2 className="text-sm font-semibold">{SETTINGS_PAGE_COPY.notifications.title}</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {SETTINGS_PAGE_COPY.notifications.auditStatusReminders}
              </span>
              <Switch
                checked={notifyPrefs.auditStatusReminders}
                onCheckedChange={checked => setNotifyPrefs(prev => ({ ...prev, auditStatusReminders: checked }))}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {SETTINGS_PAGE_COPY.notifications.productUpdates}
              </span>
              <Switch
                checked={notifyPrefs.productUpdates}
                onCheckedChange={checked => setNotifyPrefs(prev => ({ ...prev, productUpdates: checked }))}
              />
            </label>
          </div>
        </section>

        <section
          className="p-5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
            {SETTINGS_PAGE_COPY.account.signedInEmail}
          </div>
          <div
            className="text-sm mb-4 px-3 py-2"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {user?.email ?? SETTINGS_PAGE_COPY.account.unknownEmail}
          </div>
          <div className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
            {SETTINGS_PAGE_COPY.account.changeEmail}
          </div>
          <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-quaternary)' }}>
            {SETTINGS_PAGE_COPY.account.changeEmailDescription}
          </p>
          <div className="flex flex-col gap-2 mb-5 mobile:flex-row mobile:items-center">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder={SETTINGS_PAGE_COPY.account.newEmailPlaceholder}
              autoComplete="email"
              className="w-full mobile:flex-1 px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="button"
              className="glc-btn-primary whitespace-nowrap"
              disabled={savingEmail || !newEmail.trim()}
              style={{ opacity: savingEmail || !newEmail.trim() ? 0.55 : 1 }}
              onClick={() => void changeEmail()}
            >
              {savingEmail ? SETTINGS_PAGE_COPY.account.sendingEmailChange : SETTINGS_PAGE_COPY.account.requestEmailChange}
            </button>
          </div>
          <div className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
            {SETTINGS_PAGE_COPY.account.changePassword}
          </div>
          <form
            onSubmit={e => {
              e.preventDefault();
              void changePassword();
            }}
          >
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={user?.email ?? ''}
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
            />
            <div className="space-y-2 mb-4">
              <input
                type="password"
                name="new-password"
                autoComplete="new-password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={SETTINGS_PAGE_COPY.account.newPasswordPlaceholder}
                className="w-full px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                }}
              />
              <input
                type="password"
                name="confirm-new-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={SETTINGS_PAGE_COPY.account.confirmNewPasswordPlaceholder}
                className="w-full px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <button
              type="submit"
              className="glc-btn-primary mb-3"
              disabled={savingPassword}
              style={{ opacity: savingPassword ? 0.6 : 1 }}
            >
              {savingPassword ? SETTINGS_PAGE_COPY.account.updatingPassword : SETTINGS_PAGE_COPY.account.updatePassword}
            </button>
          </form>
          <div className="h-3" />
          <button className="glc-btn-ghost" onClick={signOut}>
            <SignOut className="w-4 h-4" />
            {SETTINGS_PAGE_COPY.account.signOut}
          </button>
        </section>
    </div>
  );

  return (
    <AppShell title={SETTINGS_PAGE_COPY.page.title} subtitle={SETTINGS_PAGE_COPY.page.subtitle}>
      {studioTabEnabled ? (
        <Tabs value={settingsTab} onValueChange={onSettingsTabChange} className="w-full">
          <div className="px-7 pt-6 pb-0">
            <TabsList
              className="!bg-transparent !h-auto !p-0 flex flex-wrap gap-2 justify-start rounded-none"
              style={{ background: 'transparent' }}
            >
              <TabsTrigger
                value="general"
                className="!shadow-none rounded-md border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] data-[state=active]:border-[var(--glc-blue)] data-[state=active]:text-[var(--glc-blue)] data-[state=active]:bg-[rgba(28,189,255,0.08)]"
              >
                {SETTINGS_PAGE_COPY.page.generalTab}
              </TabsTrigger>
              <TabsTrigger
                value="bank-studio"
                className="!shadow-none rounded-md border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] data-[state=active]:border-[var(--glc-blue)] data-[state=active]:text-[var(--glc-blue)] data-[state=active]:bg-[rgba(28,189,255,0.08)] flex items-center gap-1.5"
              >
                <TreeStructure size={16} weight="bold" />
                {SETTINGS_PAGE_COPY.page.questionBankStudioTab}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="general" className="mt-0">
            {generalSections}
          </TabsContent>
          <TabsContent value="bank-studio" className="mt-0">
            <div className="px-7 py-6">
              <p className="text-[11px] m-0 mb-3" style={{ color: 'var(--text-quaternary)' }}>
                {SETTINGS_PAGE_COPY.page.studioFullPageViewPrefix}{' '}
                <Link to="/admin/question-bank-studio" className="underline" style={{ color: 'var(--text-tertiary)' }}>
                  /admin/question-bank-studio
                </Link>{' '}
                {SETTINGS_PAGE_COPY.page.studioFullPageViewSuffix}
              </p>
              <QuestionBankStudio />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        generalSections
      )}
    </AppShell>
  );
}
