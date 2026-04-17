import { PaintBucket } from '@phosphor-icons/react';
import type { GlcThemeMode } from '../../../lib/glc-theme';
import { SETTINGS_PAGE_COPY } from '../../../config/settings-page-copy.en';
import { OptionPill } from '../components/OptionPill';
import { SettingsCard } from '../components/SettingsCard';

type AppearanceSectionProps = {
  mode: GlcThemeMode;
  onModeChange: (nextMode: GlcThemeMode) => void;
};

const THEME_MODES: GlcThemeMode[] = ['system', 'light', 'dark'];

export function AppearanceSection({ mode, onModeChange }: AppearanceSectionProps) {
  return (
    <SettingsCard>
      <div className="mb-4 flex items-center gap-2 text-[var(--text-primary)]">
        <PaintBucket className="w-4 h-4" />
        <h2 className="text-sm font-semibold">{SETTINGS_PAGE_COPY.appearance.title}</h2>
      </div>
      <div className="flex items-center gap-2">
        {THEME_MODES.map(themeMode => (
          <OptionPill
            key={themeMode}
            active={mode === themeMode}
            className="px-3 py-2 text-xs font-medium"
            onClick={() => onModeChange(themeMode)}
            style={{ textTransform: 'capitalize' }}
          >
            {themeMode}
          </OptionPill>
        ))}
      </div>
    </SettingsCard>
  );
}
