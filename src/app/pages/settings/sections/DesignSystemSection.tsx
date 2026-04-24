import { Link } from 'react-router';
import { Palette } from '@phosphor-icons/react';
import { APP_ROUTE_PATHS } from '../../../config/route-paths';
import { SETTINGS_PAGE_COPY } from '../../../config/settings-page-copy.en';
import { SettingsCard } from '../components/SettingsCard';

export function DesignSystemSection() {
  return (
    <SettingsCard>
      <div className="mb-2 flex items-center gap-2 text-[var(--text-primary)]">
        <Palette className="w-4 h-4" />
        <h2 className="text-sm font-semibold">{SETTINGS_PAGE_COPY.designSystem.title}</h2>
      </div>
      <p className="m-0 mb-3 text-xs text-[var(--text-secondary)]">
        {SETTINGS_PAGE_COPY.designSystem.description}
      </p>
      <Link
        to={APP_ROUTE_PATHS.adminDesignSystem}
        className="inline-flex items-center rounded-md border border-[var(--border-default)] px-3 py-2 text-xs font-semibold no-underline text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)]"
      >
        {SETTINGS_PAGE_COPY.designSystem.open}
      </Link>
    </SettingsCard>
  );
}
