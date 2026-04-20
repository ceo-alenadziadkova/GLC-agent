import { Bell } from '@phosphor-icons/react';
import type { Dispatch, SetStateAction } from 'react';
import { Switch } from '../../../components/ui/switch';
import { SETTINGS_PAGE_COPY } from '../../../config/settings-page-copy.en';
import type { NotificationPrefs } from '../domain/settings.types';
import { SettingsCard } from '../components/SettingsCard';

type NotificationsSectionProps = {
  notifyPrefs: NotificationPrefs;
  setNotifyPrefs: Dispatch<SetStateAction<NotificationPrefs>>;
  showExecutionTraceToggle: boolean;
};

export function NotificationsSection({
  notifyPrefs,
  setNotifyPrefs,
  showExecutionTraceToggle,
}: NotificationsSectionProps) {
  return (
    <SettingsCard id="notifications">
      <div className="mb-4 flex items-center gap-2 text-[var(--text-primary)]">
        <Bell className="w-4 h-4" />
        <h2 className="text-sm font-semibold">{SETTINGS_PAGE_COPY.notifications.title}</h2>
      </div>
      <div className="space-y-3">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-[var(--text-secondary)]">
            {SETTINGS_PAGE_COPY.notifications.auditStatusReminders}
          </span>
          <Switch
            checked={notifyPrefs.auditStatusReminders}
            onCheckedChange={checked => setNotifyPrefs(prev => ({ ...prev, auditStatusReminders: checked }))}
          />
        </label>
        <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div>
            <span className="text-sm text-[var(--text-secondary)]">
              {SETTINGS_PAGE_COPY.notifications.productUpdates}
            </span>
            <p className="m-0 mt-0.5 text-[length:var(--text-2xs)] text-[var(--text-quaternary)]">
              {SETTINGS_PAGE_COPY.notifications.productUpdatesHint}
            </p>
          </div>
          <Switch
            checked={notifyPrefs.productUpdates}
            onCheckedChange={checked => setNotifyPrefs(prev => ({ ...prev, productUpdates: checked }))}
          />
        </label>
        {showExecutionTraceToggle ? (
          <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div>
              <span className="text-sm text-[var(--text-secondary)]">
                {SETTINGS_PAGE_COPY.notifications.showExecutionTracePanels}
              </span>
              <p className="m-0 mt-0.5 text-[length:var(--text-2xs)] text-[var(--text-quaternary)]">
                {SETTINGS_PAGE_COPY.notifications.showExecutionTracePanelsHint}
              </p>
            </div>
            <Switch
              checked={notifyPrefs.showExecutionTracePanels}
              onCheckedChange={checked =>
                setNotifyPrefs(prev => ({ ...prev, showExecutionTracePanels: checked }))}
            />
          </label>
        ) : null}
      </div>
    </SettingsCard>
  );
}
