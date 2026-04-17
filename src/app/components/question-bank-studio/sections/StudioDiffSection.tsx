import type { QuestionBankStudioDiffSummary } from '../hooks/useQuestionBankStudioDiff';
import { STUDIO_COPY_EN } from '../config/studio-copy.en';

type StudioDiffSectionProps = {
  bankDiffJson: string;
  bankDiffError: string | null;
  bankDiffSummary: QuestionBankStudioDiffSummary | null;
  onBankDiffJsonChange: (next: string) => void;
  onRunBankDiff: () => void;
};

export function StudioDiffSection(props: StudioDiffSectionProps) {
  const { bankDiffJson, bankDiffError, bankDiffSummary, onBankDiffJsonChange, onRunBankDiff } = props;

  return (
    <div
      className="rounded-lg px-3 py-2 space-y-2 ds-panel-canvas"
      
    >
      <div className="text-[length:var(--text-2xs)] font-semibold uppercase ds-text-tertiary" >
        {STUDIO_COPY_EN.logicDiffTitle}
      </div>
      <p className="text-[length:var(--text-2xs)] m-0 ds-text-quaternary" >
        {STUDIO_COPY_EN.logicDiffDescription}
      </p>
      <textarea
        className="w-full min-h-[72px] px-2 py-1.5 text-xs font-mono rounded-md"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-primary)',
        }}
        value={bankDiffJson}
        onChange={e => onBankDiffJsonChange(e.target.value)}
        spellCheck={false}
      />
      <button
        type="button"
        className="text-xs font-medium px-2 py-1.5 rounded-md"
        style={{
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
        }}
        onClick={onRunBankDiff}
      >
        {STUDIO_COPY_EN.logicDiffCompareButton}
      </button>
      {bankDiffError ? <p className="text-xs m-0 text-red-500">{bankDiffError}</p> : null}
      {bankDiffSummary ? (
        <div className="text-[length:var(--text-2xs)] space-y-1 font-mono ds-text-secondary" >
          <div style={{ color: 'var(--text-tertiary)' }}>
            Added ({bankDiffSummary.added.length}): {bankDiffSummary.added.length ? bankDiffSummary.added.join(', ') : '—'}
          </div>
          <div style={{ color: 'var(--text-tertiary)' }}>
            Removed ({bankDiffSummary.removed.length}):{' '}
            {bankDiffSummary.removed.length ? bankDiffSummary.removed.join(', ') : '—'}
          </div>
        </div>
      ) : null}
    </div>
  );
}
