import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { SignOut, Bell, User, PaintBucket, ClipboardText, Users } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { AppShell } from '../components/AppShell';
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
        toast.error('Could not load client portal assignment');
      })
      .finally(() => {
        if (!cancelled) setSelfServeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isConsultant, profile?.id]);

  useEffect(() => {
    if (window.location.hash !== '#brief-layout') {
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
      toast.success('Profile updated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(message);
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
        return;
      }
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated');
    } finally {
      setSavingPassword(false);
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

  return (
    <AppShell title="Settings" subtitle="Manage profile, appearance, intake brief layout, and notifications">
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
            <h2 className="text-sm font-semibold">Profile</h2>
          </div>
          <label className="block text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Display name
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your name"
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
              {savingName ? 'Saving...' : 'Save'}
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
            <h2 className="text-sm font-semibold">Appearance</h2>
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
              <h2 className="text-sm font-semibold">Client portal — audit owner</h2>
            </div>
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-quaternary)' }}>
              When clients start an audit from the portal, the selected consultant becomes the audit owner (access and
              billing). With several consultants, the lead administrator picks who receives these audits.
            </p>
            {selfServeLoading ? (
              <p className="text-xs m-0" style={{ color: 'var(--text-tertiary)' }}>
                Loading…
              </p>
            ) : !selfServe ? (
              <p className="text-xs m-0" style={{ color: 'var(--text-tertiary)' }}>
                Assignment settings could not be loaded.
              </p>
            ) : (
              <>
                {!selfServe.effective_ready && (
                  <div
                    className="mb-4 px-3 py-2 rounded-lg text-xs leading-relaxed"
                    style={{
                      backgroundColor: 'rgba(242,79,29,0.08)',
                      border: '1px solid rgba(242,79,29,0.25)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Client self-serve is not ready yet: choose a consultant below (or ask your team to finish setup).
                  </div>
                )}
                {selfServe.env_fallback_active && (
                  <p className="text-xs leading-relaxed mb-3 m-0" style={{ color: 'var(--text-tertiary)' }}>
                    No consultant is saved here yet; a backup default may still apply. Setting someone below makes the
                    choice explicit for your team.
                  </p>
                )}
                {!selfServe.can_manage && (
                  <p className="text-xs leading-relaxed mb-3 m-0" style={{ color: 'var(--text-tertiary)' }}>
                    Only designated platform administrators can change this. Ask your lead administrator if you need a
                    different assignment.
                  </p>
                )}
                <label className="block text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Default consultant for client-started audits
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
                    <option value="">Not set — use backup default only</option>
                    {selfServe.consultants.map(c => {
                      const label =
                        [c.full_name?.trim(), c.email].filter(Boolean).join(' — ') || c.id.slice(0, 8) + '…';
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
                              }
                            : prev,
                        );
                        toast.success('Assignment updated');
                      } catch (e) {
                        const msg = e instanceof Error ? e.message : 'Could not save assignment';
                        toast.error(msg);
                      } finally {
                        setSelfServeSaving(false);
                      }
                    }}
                  >
                    {selfServeSaving ? 'Saving…' : 'Save assignment'}
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
            <h2 className="text-sm font-semibold">Intake brief layout</h2>
          </div>
          <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-quaternary)' }}>
            Choose how long questionnaires open by default (all sections on one page vs one step at a time).
            You can still switch layout on the brief screen for a specific audit. Clients and internal users each
            have their own saved default on this device.
          </p>

          {profile && isClient && (
            <div className="space-y-2 mb-5">
              <h3 className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Client portal (pre-audit brief)
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
                Used when you fill the brief after your audit request is approved.
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
                  All sections
                </button>
                <button
                  type="button"
                  onClick={() => {
                    writeClientBriefLayoutDefault('wizard');
                    setClientBriefDefault('wizard');
                  }}
                  style={briefLayoutBtnStyle(clientBriefDefault === 'wizard')}
                >
                  Step by step
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyClientBriefLayoutAskEachTime();
                    setClientBriefDefault(null);
                  }}
                  style={briefLayoutBtnStyle(clientBriefDefault === null)}
                >
                  Ask each time
                </button>
              </div>
            </div>
          )}

          {profile && isConsultant && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Consultant / admin (new audit & workspace)
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
                Used for the Brief step when creating an audit and for &quot;Edit intake brief&quot; in the audit
                workspace unless you pick a different layout there.
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
                  All sections
                </button>
                <button
                  type="button"
                  onClick={() => {
                    writeConsultantBriefLayoutDefault('wizard');
                    setConsultantBriefDefault('wizard');
                  }}
                  style={briefLayoutBtnStyle(consultantBriefDefault === 'wizard')}
                >
                  Step by step
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyConsultantBriefLayoutAskEachTime();
                    setConsultantBriefDefault(null);
                  }}
                  style={briefLayoutBtnStyle(consultantBriefDefault === null)}
                >
                  Ask each time
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
            <h2 className="text-sm font-semibold">Notifications</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Audit status reminders
              </span>
              <Switch
                checked={notifyPrefs.auditStatusReminders}
                onCheckedChange={checked => setNotifyPrefs(prev => ({ ...prev, auditStatusReminders: checked }))}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Product updates
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
            Signed in email
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
            {user?.email ?? 'unknown'}
          </div>
          <div className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Change password
          </div>
          <div className="space-y-2 mb-4">
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New password"
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
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
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
            className="glc-btn-primary mb-3"
            onClick={changePassword}
            disabled={savingPassword}
            style={{ opacity: savingPassword ? 0.6 : 1 }}
          >
            {savingPassword ? 'Updating...' : 'Update password'}
          </button>
          <div className="h-3" />
          <button className="glc-btn-ghost" onClick={signOut}>
            <SignOut className="w-4 h-4" />
            Sign out
          </button>
        </section>
      </div>
    </AppShell>
  );
}
