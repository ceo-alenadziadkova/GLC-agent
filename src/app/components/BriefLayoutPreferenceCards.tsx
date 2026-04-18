import type { ReactNode } from 'react';
import type { ClientBriefLayoutStored } from '../lib/client-brief-layout-preference';
import { cn } from './ui/utils';

type Props = {
  onSelect: (mode: ClientBriefLayoutStored) => void;
  /** When re-opening the chooser, no option is selected until the user picks again. */
  selected: ClientBriefLayoutStored | null;
};

/**
 * Pick between all sections on one page vs step-by-step bank wizard.
 * Used in client portal and consultant flows (New Audit, Audit Workspace).
 * Decorative mockups use CSS only (no emoji).
 */
export function BriefLayoutPreferenceCards({ onSelect, selected }: Props) {
  return (
    <div
      className="space-y-3"
      role="group"
      aria-label="Brief layout preference"
    >
      <p className="text-foreground text-sm font-medium">
        Choose how you would like to fill this brief
      </p>
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3">
        <LayoutOptionCard
          title="All sections at once"
          description="Every section on one scrollable page. Best if you prefer the full picture."
          selected={selected === 'classic'}
          onSelect={() => onSelect('classic')}
          mock={<ClassicLayoutMock />}
        />
        <LayoutOptionCard
          title="Step by step"
          description="One question at a time with clear progress. Best if you like a guided flow."
          selected={selected === 'wizard'}
          onSelect={() => onSelect('wizard')}
          mock={<WizardLayoutMock />}
        />
      </div>
    </div>
  );
}

function LayoutOptionCard({
  title,
  description,
  selected,
  onSelect,
  mock,
}: {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  mock: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'rounded-xl p-4 text-left outline-none transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info cursor-pointer',
        selected
          ? 'border-2 border-info/50 bg-info/10 shadow-xs'
          : 'border border-border bg-muted',
      )}
    >
      <div
        className="mx-auto mb-3 h-[88px] max-w-[200px] overflow-hidden rounded-lg border bg-card"
        aria-hidden
      >
        {mock}
      </div>
      <div className="text-foreground text-sm font-semibold">
        {title}
      </div>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        {description}
      </p>
    </button>
  );
}

function ClassicLayoutMock() {
  return (
    <div className="h-full flex flex-col gap-1 p-2 overflow-hidden">
      <div className="h-1.5 w-[40%] rounded-sm shrink-0 bg-[var(--overlay-white-35)]" />
      <div className="bg-border h-2 w-[88%] rounded-sm shrink-0" />
      <div className="bg-border h-2 w-[72%] rounded-sm shrink-0" />
      <div className="mt-1 h-1.5 w-[35%] rounded-sm shrink-0 bg-[var(--callout-info-border)]" />
      <div className="bg-border h-2 w-[80%] rounded-sm shrink-0" />
      <div className="bg-border h-2 w-[65%] rounded-sm shrink-0" />
      <div className="flex-1 min-h-0 flex justify-end pt-0.5">
        <div className="bg-border w-1 rounded-full" />
      </div>
    </div>
  );
}

function WizardLayoutMock() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 p-2">
      <div className="bg-muted h-8 w-[85%] rounded-md border" />
      <div className="flex gap-1.5 items-center">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--glc-blue)]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--border-default)]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--border-default)]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--border-default)]" />
      </div>
    </div>
  );
}
