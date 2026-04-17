import { User } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/button';
import { SETTINGS_PAGE_COPY } from '../../../config/settings-page-copy.en';
import { SettingsCard } from '../components/SettingsCard';

type ProfileSectionProps = {
  fullName: string;
  onFullNameChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  disabled: boolean;
};

export function ProfileSection({ fullName, onFullNameChange, onSave, saving, disabled }: ProfileSectionProps) {
  return (
    <SettingsCard>
      <div className="mb-4 flex items-center gap-2 text-[var(--text-primary)]">
        <User className="w-4 h-4" />
        <h2 className="text-sm font-semibold">{SETTINGS_PAGE_COPY.profile.title}</h2>
      </div>
      <label className="mb-2 block text-xs text-[var(--text-tertiary)]">
        {SETTINGS_PAGE_COPY.profile.displayName}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={fullName}
          onChange={e => onFullNameChange(e.target.value)}
          placeholder={SETTINGS_PAGE_COPY.profile.yourNamePlaceholder}
          className="ds-settings-field-input flex-1 px-3 py-2 text-sm"
        />
        <Button
          type="button"
          variant="default"
          className="disabled:opacity-60"
          onClick={onSave}
          disabled={saving || disabled}
        >
          {saving ? SETTINGS_PAGE_COPY.profile.saving : SETTINGS_PAGE_COPY.profile.save}
        </Button>
      </div>
    </SettingsCard>
  );
}
