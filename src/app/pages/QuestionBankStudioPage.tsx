import { Link, Navigate } from 'react-router';
import { AppShell } from '../components/AppShell';
import { QuestionBankStudio } from '../components/QuestionBankStudio';
import { isQuestionBankStudioEnabled } from '../lib/question-bank-studio-flags';

/**
 * Internal full-page entry (consultant + feature flag). Embed in Settings remains supported.
 */
export function QuestionBankStudioPage() {
  if (!isQuestionBankStudioEnabled()) {
    return <Navigate to="/settings" replace />;
  }

  return (
    <AppShell title="Question Bank Studio" subtitle="Internal canon map — consultants only">
      <div className="px-7 py-6">
        <p className="text-xs mb-4 m-0" style={{ color: 'var(--text-quaternary)' }}>
          This tool also lives under{' '}
          <Link to="/settings#question-bank-studio" className="underline" style={{ color: 'var(--text-tertiary)' }}>
            Settings
          </Link>
          . Disable via env <span className="font-mono">VITE_QUESTION_BANK_STUDIO=0</span>.
        </p>
        <QuestionBankStudio />
      </div>
    </AppShell>
  );
}
