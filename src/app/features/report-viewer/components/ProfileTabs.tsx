import type { ReportProfile } from '@glc/intake-core';
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ds-letterspace-tight-01"
            style={{
              fontSize: 'var(--space-3)',
              fontWeight: active ? 700 : 500,
              fontFamily: 'var(--font-display)',
              color: active ? 'var(--primary-foreground)' : 'var(--text-secondary)',
              background: active ? 'var(--gradient-accent)' : 'transparent',
              border: active ? 'none' : 'var(--border-width-default) solid transparent',
              boxShadow: active ? 'var(--shadow-orange-tab)' : 'none',
              cursor: 'pointer',
            }}
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
