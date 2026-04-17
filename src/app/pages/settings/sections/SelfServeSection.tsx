import { Users } from '@phosphor-icons/react';
import { SETTINGS_PAGE_COPY } from '../../../config/settings-page-copy.en';
import { SETTINGS_SELF_SERVE_COPY } from '../../../config/settings-self-serve-copy.en';
import type { SelfServePayload } from '../domain/settings.types';
import { SETTINGS_UI_STYLES } from '../config/settings-ui-policy';
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
      <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
        <Users className="w-4 h-4" />
        <h2 className="text-sm font-semibold">{SETTINGS_PAGE_COPY.selfServe.title}</h2>
      </div>
      <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-quaternary)' }}>
        {SETTINGS_PAGE_COPY.selfServe.description}
      </p>
      {selfServeLoading ? (
        <p className="text-xs m-0" style={{ color: 'var(--text-tertiary)' }}>
          {SETTINGS_PAGE_COPY.selfServe.loading}
        </p>
      ) : !selfServe ? (
        <p className="text-xs m-0" style={{ color: 'var(--text-tertiary)' }}>
          {SETTINGS_PAGE_COPY.selfServe.loadFailed}
        </p>
      ) : (
        <>
          {!selfServe.effective_ready && (
            <div
              className="mb-4 px-3 py-2 rounded-lg text-xs leading-relaxed"
              style={{
                backgroundColor: 'var(--glc-orange-muted)',
                border: '1px solid rgba(242,79,29,0.25)',
                color: 'var(--text-secondary)',
              }}
            >
              {SETTINGS_PAGE_COPY.selfServe.notReady}
            </div>
          )}
          {selfServe.implicit_fallback_active && (
            <div className="mb-3 space-y-2">
              <div
                className="px-3 py-2 rounded-lg text-xs leading-relaxed"
                style={{
                  backgroundColor: 'var(--callout-info-bg)',
                  border: '1px solid var(--callout-info-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <p className="font-semibold m-0 mb-1" style={{ color: 'var(--text-primary)' }}>
                  {SETTINGS_SELF_SERVE_COPY.implicitFallbackCalloutTitle}
                </p>
                <p className="m-0" style={{ color: 'var(--text-secondary)' }}>
                  {SETTINGS_SELF_SERVE_COPY.implicitFallbackCalloutBody}
                </p>
              </div>
              <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--text-tertiary)' }}>
                {SETTINGS_SELF_SERVE_COPY.implicitFallbackHintShort}
              </p>
            </div>
          )}
          {!selfServe.can_manage && (
            <p className="text-xs leading-relaxed mb-3 m-0" style={{ color: 'var(--text-tertiary)' }}>
              {SETTINGS_PAGE_COPY.selfServe.adminOnly}
            </p>
          )}
          <label className="block text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
            {SETTINGS_PAGE_COPY.selfServe.defaultConsultantLabel}
          </label>
          <div className="flex flex-col gap-3 mobile:flex-row mobile:items-center">
            <select
              className="w-full mobile:flex-1 px-3 py-2 text-sm"
              style={SETTINGS_UI_STYLES.fieldInput}
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
            <button
              type="button"
              className="glc-btn-primary whitespace-nowrap"
              disabled={!selfServe.can_manage || selfServeSaving || selfServeSelect === (selfServe.stored_owner_user_id ?? '')}
              style={{
                opacity:
                  !selfServe.can_manage || selfServeSaving || selfServeSelect === (selfServe.stored_owner_user_id ?? '')
                    ? 0.55
                    : 1,
              }}
              onClick={onSave}
            >
              {selfServeSaving ? SETTINGS_PAGE_COPY.selfServe.savingAssignment : SETTINGS_PAGE_COPY.selfServe.saveAssignment}
            </button>
          </div>
        </>
      )}
    </SettingsCard>
  );
}
