import { Link, Navigate } from 'react-router';
import { AppShell } from '../components/AppShell';
import { QuestionBankStudio } from '../components/QuestionBankStudio';
import { cn } from '../components/ui/utils';
import { PAGE_SHELL_CONTRACTS } from '../../design-system/patterns/Layouts';
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
      <div className={cn(PAGE_SHELL_CONTRACTS.body, PAGE_SHELL_CONTRACTS.root)}>
        <p className="text-xs mb-4 m-0 ds-text-quaternary" >
          This tool also lives under{' '}
          <Link to="/settings#question-bank-studio" className="underline ds-text-tertiary" >
            Settings
          </Link>
          . Toggle in <span className="font-mono">src/app/config/app-feature-flags.ts</span>.
        </p>
        <QuestionBankStudio />
      </div>
    </AppShell>
  );
}
