import { Users } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/button';
import { SETTINGS_PAGE_COPY } from '../../../config/settings-page-copy.en';
import { SETTINGS_SELF_SERVE_COPY } from '../../../config/settings-self-serve-copy.en';
import type { SelfServePayload } from '../domain/settings.types';
import { SettingsCard } from '../components/SettingsCard';

type SelfServeSectionProps = {
  selfServeLoading: boolean;
  selfServe: SelfServePayload | null;
  selfServeSelect: string;
  selfServeSaving: boolean;
  onSelfServeSelectChange: (value: string) => void;
  onSave: () => void;
};

function getConsultantLabel(item: { full_name: string | null; email: string | null; id: string }): string {
  return (
    [item.full_name?.trim(), item.email].filter(Boolean).join(' — ') ||
    `${SETTINGS_PAGE_COPY.selfServe.fallbackUserIdLabelPrefix} ${item.id.slice(0, 8)}…`
  );
}

export function SelfServeSection({
  selfServeLoading,
  selfServe,
  selfServeSelect,
  selfServeSaving,
  onSelfServeSelectChange,
  onSave,
}: SelfServeSectionProps) {
  return (
    <SettingsCard>
      <div className="mb-2 flex items-center gap-2 text-[var(--text-primary)]">
        <Users className="w-4 h-4" />
        <h2 className="text-sm font-semibold">{SETTINGS_PAGE_COPY.selfServe.title}</h2>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-[var(--text-quaternary)]">
        {SETTINGS_PAGE_COPY.selfServe.description}
      </p>
      {selfServeLoading ? (
        <p className="m-0 text-xs text-[var(--text-tertiary)]">
          {SETTINGS_PAGE_COPY.selfServe.loading}
        </p>
      ) : !selfServe ? (
        <p className="m-0 text-xs text-[var(--text-tertiary)]">
          {SETTINGS_PAGE_COPY.selfServe.loadFailed}
        </p>
      ) : (
        <>
          {!selfServe.effective_ready && (
            <div className="mb-4 rounded-lg border border-[var(--score-2-border)] bg-[var(--glc-orange-muted)] px-3 py-2 text-xs leading-relaxed text-[var(--text-secondary)]">
              {SETTINGS_PAGE_COPY.selfServe.notReady}
            </div>
          )}
          {selfServe.implicit_fallback_active && (
            <div className="mb-3 space-y-2">
              <div className="rounded-lg border border-[var(--callout-info-border)] bg-[var(--callout-info-bg)] px-3 py-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                <p className="m-0 mb-1 font-semibold text-[var(--text-primary)]">
                  {SETTINGS_SELF_SERVE_COPY.implicitFallbackCalloutTitle}
                </p>
                <p className="m-0 text-[var(--text-secondary)]">
                  {SETTINGS_SELF_SERVE_COPY.implicitFallbackCalloutBody}
                </p>
              </div>
              <p className="m-0 text-xs leading-relaxed text-[var(--text-tertiary)]">
                {SETTINGS_SELF_SERVE_COPY.implicitFallbackHintShort}
              </p>
            </div>
          )}
          {!selfServe.can_manage && (
            <p className="m-0 mb-3 text-xs leading-relaxed text-[var(--text-tertiary)]">
              {SETTINGS_PAGE_COPY.selfServe.adminOnly}
            </p>
          )}
          <label className="mb-2 block text-xs text-[var(--text-tertiary)]">
            {SETTINGS_PAGE_COPY.selfServe.defaultConsultantLabel}
          </label>
          <div className="flex flex-col gap-3 mobile:flex-row mobile:items-center">
            <select
              className="ds-settings-field-input w-full px-3 py-2 text-sm mobile:flex-1"
              value={selfServeSelect}
              onChange={e => onSelfServeSelectChange(e.target.value)}
              disabled={!selfServe.can_manage || selfServeSaving}
            >
              <option value="">{SETTINGS_PAGE_COPY.selfServe.notSetFallback}</option>
              {selfServe.consultants.map(c => (
                <option key={c.id} value={c.id}>
                  {getConsultantLabel(c)}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="default"
              className="whitespace-nowrap disabled:opacity-[0.55]"
              disabled={!selfServe.can_manage || selfServeSaving || selfServeSelect === (selfServe.stored_owner_user_id ?? '')}
              onClick={onSave}
            >
              {selfServeSaving ? SETTINGS_PAGE_COPY.selfServe.savingAssignment : SETTINGS_PAGE_COPY.selfServe.saveAssignment}
            </Button>
          </div>
        </>
      )}
    </SettingsCard>
  );
}
