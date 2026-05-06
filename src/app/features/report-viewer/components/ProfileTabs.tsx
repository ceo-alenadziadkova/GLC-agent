import type { KeyboardEvent } from 'react';
import type { ReportProfile } from '@glc/intake-core';
import { cn } from '../../../components/ui/utils';
import { REPORT_VIEWER_COPY } from '../config/report-viewer.copy.en';
import type { ReportProfileUiOption } from '../domain/types';

type ProfileTabsProps = {
  options: ReportProfileUiOption[];
  profile: ReportProfile;
  onSelect: (profile: ReportProfile) => void;
};

export function ProfileTabs({ options, profile, onSelect }: ProfileTabsProps) {
  if (options.length === 0) {
    return (
      <div className="glc-soft-panel p-2 text-xs ds-text-tertiary" role="status" aria-live="polite">
        {REPORT_VIEWER_COPY.analysisView.profileUnavailable}
      </div>
    );
  }

  const activeOption = options.find((option) => option.id === profile);

  function getIndexByProfile(nextProfile: ReportProfile): number {
    return options.findIndex((option) => option.id === nextProfile);
  }

  function getNextProfile(current: ReportProfile, step: -1 | 1): ReportProfile {
    const currentIndex = getIndexByProfile(current);
    const fallbackIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (fallbackIndex + step + options.length) % options.length;
    return options[nextIndex]?.id ?? current;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, optionId: ReportProfile): void {
    if (options.length === 0) return;
    const focusTabByProfile = (nextProfile: ReportProfile): void => {
      window.requestAnimationFrame(() => {
        const tabElement = document.getElementById(`report-profile-tab-${nextProfile}`);
        if (tabElement instanceof HTMLButtonElement) {
          tabElement.focus();
        }
      });
    };
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const nextProfile = getNextProfile(optionId, 1);
      onSelect(nextProfile);
      focusTabByProfile(nextProfile);
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const nextProfile = getNextProfile(optionId, -1);
      onSelect(nextProfile);
      focusTabByProfile(nextProfile);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      const firstProfile = options[0]?.id;
      if (firstProfile) {
        onSelect(firstProfile);
        focusTabByProfile(firstProfile);
      }
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      const lastProfile = options[options.length - 1]?.id;
      if (lastProfile) {
        onSelect(lastProfile);
        focusTabByProfile(lastProfile);
      }
    }
  }

  return (
    <div
      className="glc-soft-panel flex items-start gap-2 flex-wrap p-2"
      role="tablist"
      aria-label="Report viewing profiles"
    >
      {options.map((option) => {
        const active = profile === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            onKeyDown={(event) => handleKeyDown(event, option.id)}
            title={option.description}
            className={cn('ds-report-profile-tab', active && 'ds-report-profile-tab--active')}
            role="tab"
            aria-selected={active}
            aria-controls={`report-profile-panel-${option.id}`}
            id={`report-profile-tab-${option.id}`}
            tabIndex={active ? 0 : -1}
          >
            <Icon size={13} weight={active ? 'fill' : 'regular'} />
            {option.label}
          </button>
        );
      })}
      <span className="ml-auto text-xs self-center pr-1 ds-text-tertiary">
        {activeOption?.description ?? ''}
      </span>
    </div>
  );
}
