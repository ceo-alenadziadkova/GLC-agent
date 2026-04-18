import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { SETTINGS_UI_POLICY } from '../config/settings-ui-policy';
import { useSettingsTabs } from './useSettingsTabs';

describe('useSettingsTabs', () => {
  const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

  beforeEach(() => {
    replaceStateSpy.mockClear();
    window.history.replaceState({}, '', '/settings');
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('initial tab is general when hash is empty', () => {
    const { result } = renderHook(() => useSettingsTabs(true));
    expect(result.current.settingsTab).toBe('general');
  });

  it('initial tab is bank-studio when hash matches studio slug', () => {
    window.history.replaceState({}, '', `/settings#${SETTINGS_UI_POLICY.hashes.bankStudio}`);
    const { result } = renderHook(() => useSettingsTabs(true));
    expect(result.current.settingsTab).toBe('bank-studio');
  });

  it('onSettingsTabChange sets bank-studio and updates history hash', () => {
    const { result } = renderHook(() => useSettingsTabs(true));
    act(() => {
      result.current.onSettingsTabChange('bank-studio');
    });
    expect(result.current.settingsTab).toBe('bank-studio');
    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      '',
      expect.stringContaining(`#${SETTINGS_UI_POLICY.hashes.bankStudio}`),
    );
  });

  it('onSettingsTabChange sets general and strips hash', () => {
    window.history.replaceState({}, '', `/settings#${SETTINGS_UI_POLICY.hashes.bankStudio}`);
    const { result } = renderHook(() => useSettingsTabs(true));
    act(() => {
      result.current.onSettingsTabChange('general');
    });
    expect(result.current.settingsTab).toBe('general');
    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/settings');
  });

  it('when studio becomes enabled and hash is studio, tab stays bank-studio', () => {
    window.history.replaceState({}, '', `/settings#${SETTINGS_UI_POLICY.hashes.bankStudio}`);
    const { result, rerender } = renderHook(({ enabled }: { enabled: boolean }) => useSettingsTabs(enabled), {
      initialProps: { enabled: false },
    });
    expect(result.current.settingsTab).toBe('bank-studio');
    rerender({ enabled: true });
    expect(result.current.settingsTab).toBe('bank-studio');
  });
});
