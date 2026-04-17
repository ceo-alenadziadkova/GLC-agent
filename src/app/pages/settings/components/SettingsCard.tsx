import type { PropsWithChildren } from 'react';
import { cn } from '../../../components/ui/utils';

type SettingsCardProps = PropsWithChildren<{
  id?: string;
  className?: string;
}>;

export function SettingsCard({ id, className = 'p-5', children }: SettingsCardProps) {
  return (
    <section id={id} className={cn('ds-settings-section-card', className)}>
      {children}
    </section>
  );
}
