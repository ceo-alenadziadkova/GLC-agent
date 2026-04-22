import { Link } from 'react-router';
import { ShieldCheck } from '@phosphor-icons/react';
import { Switch } from '../../../components/ui/switch';
import { SETTINGS_PAGE_COPY } from '../../../config/settings-page-copy.en';
import { APP_ROUTE_PATHS } from '../../../config/route-paths';
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
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface-muted)] p-3">
            <p className="m-0 text-xs font-semibold ds-text-primary">{SETTINGS_PAGE_COPY.legalConsents.requiredTitle}</p>
            <p className="mb-3 mt-1 text-xs leading-relaxed ds-text-secondary">
              {SETTINGS_PAGE_COPY.legalConsents.requiredDescription}
            </p>
            <label className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm ds-text-secondary">
                {SETTINGS_PAGE_COPY.legalConsents.requiredTos}{' '}
                <Link to={APP_ROUTE_PATHS.legalTerms} className="ds-marketing-inline-link-accent" target="_blank" rel="noreferrer">
                  {SETTINGS_PAGE_COPY.legalConsents.termsLink}
                </Link>
              </span>
              <Switch checked={legal.tosAcceptance} onCheckedChange={checked => void legal.setTosAcceptance(checked)} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm ds-text-secondary">
                {SETTINGS_PAGE_COPY.legalConsents.requiredPrivacy}{' '}
                <Link to={APP_ROUTE_PATHS.legalPrivacy} className="ds-marketing-inline-link-accent" target="_blank" rel="noreferrer">
                  {SETTINGS_PAGE_COPY.legalConsents.privacyLink}
                </Link>
              </span>
              <Switch
                checked={legal.privacyAcknowledgment}
                onCheckedChange={checked => void legal.setPrivacyAcknowledgment(checked)}
              />
            </label>
          </div>
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
