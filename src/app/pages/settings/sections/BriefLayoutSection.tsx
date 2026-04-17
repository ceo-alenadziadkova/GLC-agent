import { ClipboardText } from '@phosphor-icons/react';
import { SETTINGS_PAGE_COPY } from '../../../config/settings-page-copy.en';
import { OptionPill } from '../components/OptionPill';
import { SettingsCard } from '../components/SettingsCard';

type BriefLayoutSectionProps = {
  showClient: boolean;
  showConsultant: boolean;
  clientBriefDefault: 'classic' | 'wizard' | null;
  consultantBriefDefault: 'classic' | 'wizard' | null;
  onClientChange: (next: 'classic' | 'wizard' | null) => void;
  onConsultantChange: (next: 'classic' | 'wizard' | null) => void;
};

export function BriefLayoutSection({
  showClient,
  showConsultant,
  clientBriefDefault,
  consultantBriefDefault,
  onClientChange,
  onConsultantChange,
}: BriefLayoutSectionProps) {
  return (
    <SettingsCard id="brief-layout">
      <div className="mb-2 flex items-center gap-2 text-[var(--text-primary)]">
        <ClipboardText className="w-4 h-4" />
        <h2 className="text-sm font-semibold">{SETTINGS_PAGE_COPY.briefLayout.title}</h2>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-[var(--text-quaternary)]">
        {SETTINGS_PAGE_COPY.briefLayout.description}
      </p>

      {showClient && (
        <div className="space-y-2 mb-5">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)]">
            {SETTINGS_PAGE_COPY.briefLayout.clientTitle}
          </h3>
          <p className="text-xs leading-relaxed text-[var(--text-quaternary)]">
            {SETTINGS_PAGE_COPY.briefLayout.clientDescription}
          </p>
          <div className="flex flex-wrap gap-2">
            <OptionPill active={clientBriefDefault === 'classic'} onClick={() => onClientChange('classic')}>
              {SETTINGS_PAGE_COPY.briefLayout.classic}
            </OptionPill>
            <OptionPill active={clientBriefDefault === 'wizard'} onClick={() => onClientChange('wizard')}>
              {SETTINGS_PAGE_COPY.briefLayout.wizard}
            </OptionPill>
            <OptionPill active={clientBriefDefault === null} onClick={() => onClientChange(null)}>
              {SETTINGS_PAGE_COPY.briefLayout.askEachTime}
            </OptionPill>
          </div>
        </div>
      )}

      {showConsultant && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)]">
            {SETTINGS_PAGE_COPY.briefLayout.consultantTitle}
          </h3>
          <p className="text-xs leading-relaxed text-[var(--text-quaternary)]">
            {SETTINGS_PAGE_COPY.briefLayout.consultantDescription}
          </p>
          <div className="flex flex-wrap gap-2">
            <OptionPill active={consultantBriefDefault === 'classic'} onClick={() => onConsultantChange('classic')}>
              {SETTINGS_PAGE_COPY.briefLayout.classic}
            </OptionPill>
            <OptionPill active={consultantBriefDefault === 'wizard'} onClick={() => onConsultantChange('wizard')}>
              {SETTINGS_PAGE_COPY.briefLayout.wizard}
            </OptionPill>
            <OptionPill active={consultantBriefDefault === null} onClick={() => onConsultantChange(null)}>
              {SETTINGS_PAGE_COPY.briefLayout.askEachTime}
            </OptionPill>
          </div>
        </div>
      )}
    </SettingsCard>
  );
}
