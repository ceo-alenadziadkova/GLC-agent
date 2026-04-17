import type { PropsWithChildren } from 'react';
import { SETTINGS_UI_STYLES } from '../config/settings-ui-policy';

type SettingsCardProps = PropsWithChildren<{
  id?: string;
  className?: string;
}>;

export function SettingsCard({ id, className = 'p-5', children }: SettingsCardProps) {
  return (
    <section id={id} className={className} style={SETTINGS_UI_STYLES.sectionCard}>
      {children}
    </section>
  );
}
