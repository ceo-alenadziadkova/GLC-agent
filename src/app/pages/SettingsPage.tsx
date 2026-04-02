import { useEffect, useMemo, useState } from 'react';
import { SignOut, Bell, User, PaintBucket } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { AppShell } from '../components/AppShell';
import { Switch } from '../components/ui/switch';
import { api } from '../data/apiService';
import { useAuth } from '../hooks/useAuth';
import { useGlcTheme } from '../hooks/useGlcTheme';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';

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
  const { profile, refetch } = useProfile();
  const { mode, setMode } = useGlcTheme();

  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [notifyPrefs, setNotifyPrefs] = useState<NotificationPrefs>(readNotifyPrefs);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
  }, [profile?.full_name]);

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

  return (
    <AppShell title="Settings" subtitle="Manage profile, appearance, and notifications">
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
