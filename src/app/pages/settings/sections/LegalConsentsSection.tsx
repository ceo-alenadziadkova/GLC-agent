import { ShieldCheck } from '@phosphor-icons/react';
import { Switch } from '../../../components/ui/switch';
import { SETTINGS_PAGE_COPY } from '../../../config/settings-page-copy.en';
import { SettingsCard } from '../components/SettingsCard';
import { useLegalConsentsSettings } from '../hooks/useLegalConsentsSettings';

type LegalConsentsSectionProps = {
  enabled: boolean;
};

export function LegalConsentsSection({ enabled }: LegalConsentsSectionProps) {
  const legal = useLegalConsentsSettings(enabled);

  if (!enabled) return null;

  return (
    <SettingsCard id="legal-consents">
      <div className="mb-2 flex items-center gap-2 ds-text-primary">
        <ShieldCheck className="h-4 w-4" aria-hidden />
        <h2 className="text-sm font-semibold">{SETTINGS_PAGE_COPY.legalConsents.title}</h2>
      </div>
      <p className="mb-4 text-xs leading-relaxed ds-text-quaternary">{SETTINGS_PAGE_COPY.legalConsents.description}</p>
      {legal.loading ? (
        <p className="m-0 text-xs ds-text-tertiary">{SETTINGS_PAGE_COPY.legalConsents.loading}</p>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm ds-text-secondary">{SETTINGS_PAGE_COPY.legalConsents.productAnalytics}</span>
            <Switch
              checked={legal.productAnalytics}
              onCheckedChange={checked => void legal.setProductAnalytics(checked)}
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm ds-text-secondary">{SETTINGS_PAGE_COPY.legalConsents.caseStudy}</span>
            <Switch checked={legal.caseStudyUse} onCheckedChange={checked => void legal.setCaseStudyUse(checked)} />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm ds-text-secondary">{SETTINGS_PAGE_COPY.legalConsents.evaluationInternal}</span>
            <Switch
              checked={legal.evaluationInternal}
              onCheckedChange={checked => void legal.setEvaluationInternal(checked)}
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm ds-text-secondary">{SETTINGS_PAGE_COPY.legalConsents.dpa}</span>
            <Switch checked={legal.dpaAcceptance} onCheckedChange={checked => void legal.setDpaAcceptance(checked)} />
          </label>
        </div>
      )}
    </SettingsCard>
  );
}
