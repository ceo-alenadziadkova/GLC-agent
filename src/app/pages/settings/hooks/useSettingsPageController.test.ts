import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';

const settingsCtx = vi.hoisted(() => {
  const selfServeLoadFixture = {
    stored_owner_user_id: 'owner-1',
    effective_owner_user_id: 'owner-1',
    effective_ready: true,
    env_fallback_active: false,
    implicit_fallback_active: false,
    consultants: [{ id: 'c1', full_name: 'Consultant', email: 'c@example.com' }],
    can_manage: true,
  };

  const selfServePatchFixture = {
    ok: true,
    stored_owner_user_id: 'owner-2' as string | null,
    effective_ready: true,
    effective_owner_user_id: 'owner-2',
    env_fallback_active: false,
    implicit_fallback_active: false,
  };

  return {
    user: { email: 'user@example.com' },
    signOut: vi.fn(),
    profile: { id: 'p1', full_name: 'Ada Lovelace' },
    refetch: vi.fn().mockResolvedValue(undefined),
    isClient: false,
    isConsultant: true,
    mode: 'system' as const,
    setMode: vi.fn(),
    saveProfileName: vi.fn().mockResolvedValue(undefined),
    loadSelfServeOwner: vi.fn().mockResolvedValue(selfServeLoadFixture),
    saveSelfServeOwner: vi.fn().mockResolvedValue(selfServePatchFixture),
    changePassword: vi.fn().mockResolvedValue({ ok: true }),
    changeEmail: vi.fn().mockResolvedValue({ ok: true }),
    readNotifyPrefs: vi.fn(() => ({
      auditStatusReminders: true,
      productUpdates: false,
    })),
    readBriefLayoutPrefs: vi.fn(() => ({
      clientDefault: null as null,
      consultantDefault: null as null,
    })),
    writeNotifyPrefs: vi.fn(),
    subscribeBriefLayoutPrefsChanged: vi.fn((_listener: () => void) => vi.fn()),
    setClientBriefLayoutDefault: vi.fn(),
    setConsultantBriefLayoutDefault: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    selfServeLoadFixture,
    selfServePatchFixture,
  };
});

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: settingsCtx.user,
    signOut: settingsCtx.signOut,
  }),
}));

vi.mock('../../../hooks/useProfile', () => ({
  useProfile: () => ({
    profile: settingsCtx.profile,
    refetch: settingsCtx.refetch,
    isClient: settingsCtx.isClient,
    isConsultant: settingsCtx.isConsultant,
  }),
}));

vi.mock('../../../hooks/useGlcTheme', () => ({
  useGlcTheme: () => ({
    mode: settingsCtx.mode,
    setMode: settingsCtx.setMode,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => settingsCtx.toastSuccess(...args),
    error: (...args: unknown[]) => settingsCtx.toastError(...args),
  },
}));

vi.mock('../services/settings-profile.service', () => ({
  saveProfileName: (...args: unknown[]) => settingsCtx.saveProfileName(...args),
}));

vi.mock('../services/settings-self-serve.service', () => ({
  loadSelfServeOwner: () => settingsCtx.loadSelfServeOwner(),
  saveSelfServeOwner: (...args: unknown[]) => settingsCtx.saveSelfServeOwner(...args),
}));

vi.mock('../services/settings-auth.service', () => ({
  changePassword: (...args: unknown[]) => settingsCtx.changePassword(...args),
  changeEmail: (...args: unknown[]) => settingsCtx.changeEmail(...args),
}));

vi.mock('../services/settings-local-preferences.service', () => ({
  readNotifyPrefs: () => settingsCtx.readNotifyPrefs(),
  readBriefLayoutPrefs: () => settingsCtx.readBriefLayoutPrefs(),
  writeNotifyPrefs: (...args: unknown[]) => settingsCtx.writeNotifyPrefs(...args),
  subscribeBriefLayoutPrefsChanged: (listener: () => void) => settingsCtx.subscribeBriefLayoutPrefsChanged(listener),
  setClientBriefLayoutDefault: (...args: unknown[]) => settingsCtx.setClientBriefLayoutDefault(...args),
  setConsultantBriefLayoutDefault: (...args: unknown[]) => settingsCtx.setConsultantBriefLayoutDefault(...args),
}));

import { useSettingsPageController } from './useSettingsPageController';
import { SETTINGS_UI_POLICY } from '../config/settings-ui-policy';

describe('useSettingsPageController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsCtx.user = { email: 'user@example.com' };
    settingsCtx.profile = { id: 'p1', full_name: 'Ada Lovelace' };
    settingsCtx.isClient = false;
    settingsCtx.isConsultant = true;
    settingsCtx.refetch.mockResolvedValue(undefined);
    settingsCtx.saveProfileName.mockResolvedValue(undefined);
    settingsCtx.loadSelfServeOwner.mockResolvedValue(settingsCtx.selfServeLoadFixture);
    settingsCtx.saveSelfServeOwner.mockResolvedValue(settingsCtx.selfServePatchFixture);
    settingsCtx.changePassword.mockResolvedValue({ ok: true });
    settingsCtx.changeEmail.mockResolvedValue({ ok: true });
    window.history.replaceState({}, '', '/settings');
  });

  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState({}, '', '/');
  });

  it('syncs fullName from profile', async () => {
    const { result } = renderHook(() => useSettingsPageController());
    await waitFor(() => expect(result.current.fullName).toBe('Ada Lovelace'));
  });

  it('onSaveName is a no-op when name unchanged', async () => {
    const { result } = renderHook(() => useSettingsPageController());
    await waitFor(() => expect(result.current.fullName).toBe('Ada Lovelace'));
    await act(async () => {
      await result.current.onSaveName();
    });
    expect(settingsCtx.saveProfileName).not.toHaveBeenCalled();
    expect(settingsCtx.toastSuccess).not.toHaveBeenCalled();
  });

  it('onSaveName persists, refetches, and toasts on success', async () => {
    const { result } = renderHook(() => useSettingsPageController());
    await waitFor(() => expect(result.current.fullName).toBe('Ada Lovelace'));
    await act(async () => {
      result.current.setFullName('Grace Hopper');
    });
    await act(async () => {
      await result.current.onSaveName();
    });
    expect(settingsCtx.saveProfileName).toHaveBeenCalledWith({ fullName: 'Grace Hopper' });
    expect(settingsCtx.refetch).toHaveBeenCalled();
    expect(settingsCtx.toastSuccess).toHaveBeenCalledWith(WORKSPACE_PAGE_COPY.settings.profileUpdated);
  });

  it('onChangePassword shows validation toast for short password', async () => {
    const { result } = renderHook(() => useSettingsPageController());
    await act(async () => {
      result.current.setNewPassword('short');
      result.current.setConfirmPassword('short');
      await result.current.onChangePassword();
    });
    expect(settingsCtx.changePassword).not.toHaveBeenCalled();
    expect(settingsCtx.toastError).toHaveBeenCalled();
  });

  it('onChangePassword clears fields and toasts on success', async () => {
    const { result } = renderHook(() => useSettingsPageController());
    await act(async () => {
      result.current.setNewPassword('password1');
      result.current.setConfirmPassword('password1');
    });
    await act(async () => {
      await result.current.onChangePassword();
    });
    expect(settingsCtx.changePassword).toHaveBeenCalledWith('password1');
    expect(result.current.newPassword).toBe('');
    expect(result.current.confirmPassword).toBe('');
    expect(settingsCtx.toastSuccess).toHaveBeenCalledWith(WORKSPACE_PAGE_COPY.settings.passwordUpdated);
  });

  it('onChangeEmail toasts on invalid input', async () => {
    const { result } = renderHook(() => useSettingsPageController());
    await act(async () => {
      result.current.setNewEmail('not-an-email');
      await result.current.onChangeEmail();
    });
    expect(settingsCtx.changeEmail).not.toHaveBeenCalled();
    expect(settingsCtx.toastError).toHaveBeenCalled();
  });

  it('does not load self-serve when user is not consultant', async () => {
    settingsCtx.isConsultant = false;
    renderHook(() => useSettingsPageController());
    await act(async () => {
      await Promise.resolve();
    });
    expect(settingsCtx.loadSelfServeOwner).not.toHaveBeenCalled();
  });

  it('loads self-serve for consultant', async () => {
    const { result } = renderHook(() => useSettingsPageController());
    await waitFor(() => expect(settingsCtx.loadSelfServeOwner).toHaveBeenCalled());
    await waitFor(() => expect(result.current.selfServeLoading).toBe(false));
    expect(result.current.selfServe).toEqual(settingsCtx.selfServeLoadFixture);
    expect(result.current.selfServeSelect).toBe('owner-1');
  });

  it('onSaveSelfServe patches owner and merges response', async () => {
    const { result } = renderHook(() => useSettingsPageController());
    await waitFor(() => expect(result.current.selfServe).not.toBeNull());
    await act(async () => {
      result.current.setSelfServeSelect('owner-2');
    });
    await act(async () => {
      await result.current.onSaveSelfServe();
    });
    expect(settingsCtx.saveSelfServeOwner).toHaveBeenCalledWith({ ownerUserId: 'owner-2' });
    expect(settingsCtx.toastSuccess).toHaveBeenCalledWith(WORKSPACE_PAGE_COPY.settings.assignmentUpdated);
    expect(result.current.selfServe?.stored_owner_user_id).toBe('owner-2');
  });

  it('persists notify prefs when they change', async () => {
    const { result } = renderHook(() => useSettingsPageController());
    await act(async () => {
      result.current.setNotifyPrefs(prev => ({ ...prev, productUpdates: true }));
    });
    await waitFor(() =>
      expect(settingsCtx.writeNotifyPrefs).toHaveBeenCalledWith(
        expect.objectContaining({ productUpdates: true }),
      ),
    );
  });

  it('setClientBriefLayoutDefault delegates to preference service', async () => {
    const { result } = renderHook(() => useSettingsPageController());
    await act(async () => {
      result.current.setClientBriefLayoutDefault('wizard');
    });
    expect(settingsCtx.setClientBriefLayoutDefault).toHaveBeenCalledWith('wizard');
    expect(result.current.clientBriefDefault).toBe('wizard');
  });

  it('schedules scroll to brief-layout when hash matches anchor', async () => {
    vi.useFakeTimers();
    window.history.replaceState(
      {},
      '',
      `/settings${SETTINGS_UI_POLICY.hashes.briefLayoutAnchor}`,
    );

    const scrollIntoView = vi.fn();
    const spy = vi.spyOn(document, 'getElementById').mockReturnValue({ scrollIntoView } as unknown as HTMLElement);

    renderHook(() => useSettingsPageController());

    await act(async () => {
      vi.advanceTimersByTime(SETTINGS_UI_POLICY.timingsMs.initialAnchorScroll + 10);
    });

    expect(spy).toHaveBeenCalledWith('brief-layout');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    spy.mockRestore();
  });
});
