import { useEffect, useState } from 'react';
import { SETTINGS_UI_POLICY } from '../config/settings-ui-policy';
import type { SettingsTab } from '../domain/settings.types';

function readTabFromHash(): SettingsTab {
  if (typeof window === 'undefined') return 'general';
  return window.location.hash.replace(/^#/, '') === SETTINGS_UI_POLICY.hashes.bankStudio ? 'bank-studio' : 'general';
}

export function useSettingsTabs(studioTabEnabled: boolean) {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>(readTabFromHash);

  useEffect(() => {
    if (!studioTabEnabled) return;
    if (readTabFromHash() === 'bank-studio') {
      setSettingsTab('bank-studio');
    }
  }, [studioTabEnabled]);

  const onSettingsTabChange = (value: string) => {
    const next: SettingsTab = value === 'bank-studio' ? 'bank-studio' : 'general';
    setSettingsTab(next);
    const base = window.location.pathname + window.location.search;
    if (next === 'bank-studio') {
      window.history.replaceState(null, '', `${base}#${SETTINGS_UI_POLICY.hashes.bankStudio}`);
    } else {
      window.history.replaceState(null, '', base);
    }
  };

  return {
    settingsTab,
    onSettingsTabChange,
  };
}
