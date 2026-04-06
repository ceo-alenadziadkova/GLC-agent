import type { ReactNode } from 'react';
import type { ClientBriefLayoutStored } from '../lib/client-brief-layout-preference';

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
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
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
      className="text-left rounded-xl p-4 transition-all outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        border: selected
          ? '2px solid rgba(28,189,255,0.45)'
          : '1px solid var(--border-subtle)',
        backgroundColor: selected ? 'rgba(28,189,255,0.06)' : 'var(--bg-muted)',
        boxShadow: selected ? 'var(--shadow-xs)' : 'none',
        cursor: 'pointer',
        outlineColor: 'var(--glc-blue)',
      }}
    >
      <div
        className="rounded-lg mb-3 overflow-hidden mx-auto"
        style={{
          height: 88,
          maxWidth: 200,
          border: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
        aria-hidden
      >
        {mock}
      </div>
      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
        {title}
      </div>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
        {description}
      </p>
    </button>
  );
}

function ClassicLayoutMock() {
  return (
    <div className="h-full flex flex-col gap-1 p-2 overflow-hidden">
      <div className="h-1.5 rounded-sm shrink-0" style={{ background: 'rgba(28,189,255,0.35)', width: '40%' }} />
      <div className="h-2 rounded-sm shrink-0" style={{ background: 'var(--border-default)', width: '88%' }} />
      <div className="h-2 rounded-sm shrink-0" style={{ background: 'var(--border-default)', width: '72%' }} />
      <div className="h-1.5 rounded-sm shrink-0 mt-1" style={{ background: 'rgba(28,189,255,0.25)', width: '35%' }} />
      <div className="h-2 rounded-sm shrink-0" style={{ background: 'var(--border-default)', width: '80%' }} />
      <div className="h-2 rounded-sm shrink-0" style={{ background: 'var(--border-default)', width: '65%' }} />
      <div className="flex-1 min-h-0 flex justify-end pt-0.5">
        <div
          className="w-1 rounded-full"
          style={{ background: 'var(--border-subtle)' }}
        />
      </div>
    </div>
  );
}

function WizardLayoutMock() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 p-2">
      <div
        className="w-[85%] h-8 rounded-md"
        style={{ border: '1px solid var(--border-default)', background: 'var(--bg-muted)' }}
      />
      <div className="flex gap-1.5 items-center">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--glc-blue)' }} />
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--border-default)' }} />
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--border-default)' }} />
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--border-default)' }} />
      </div>
    </div>
  );
}
