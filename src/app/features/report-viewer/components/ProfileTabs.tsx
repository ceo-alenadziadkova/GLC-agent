import type { ReportProfile } from '@glc/intake-core';
import { cn } from '../../../components/ui/utils';
import type { ReportProfileUiOption } from '../domain/types';

type ProfileTabsProps = {
  options: ReportProfileUiOption[];
  profile: ReportProfile;
  onSelect: (profile: ReportProfile) => void;
};

export function ProfileTabs({ options, profile, onSelect }: ProfileTabsProps) {
  return (
    <div className="glc-soft-panel flex items-start gap-2 flex-wrap p-2">
      {options.map((option) => {
        const active = profile === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            title={option.description}
            className={cn('ds-report-profile-tab', active && 'ds-report-profile-tab--active')}
          >
            <Icon size={13} weight={active ? 'fill' : 'regular'} />
            {option.label}
          </button>
        );
      })}
      <span className="ml-auto text-xs self-center pr-1 ds-text-tertiary" >
        {options.find((option) => option.id === profile)?.description ?? ''}
      </span>
    </div>
  );
}
