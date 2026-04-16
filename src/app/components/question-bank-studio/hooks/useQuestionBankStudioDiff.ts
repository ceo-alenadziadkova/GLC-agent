import { useCallback, useState } from 'react';

import bankBundledRaw from '@glc/intake-core/question-bank.v1.json';

import { diffQuestionBankIdSets, extractQuestionIdsFromBankJson } from '../../../lib/question-bank-revision-diff';

export type QuestionBankStudioDiffSummary = {
  added: string[];
  removed: string[];
};

export function useQuestionBankStudioDiff(bankDiffJson: string): {
  bankDiffSummary: QuestionBankStudioDiffSummary | null;
  bankDiffError: string | null;
  runBankDiff: () => void;
} {
  const [bankDiffSummary, setBankDiffSummary] = useState<QuestionBankStudioDiffSummary | null>(null);
  const [bankDiffError, setBankDiffError] = useState<string | null>(null);

  const runBankDiff = useCallback(() => {
    try {
      const bundled = extractQuestionIdsFromBankJson(bankBundledRaw);
      const other = extractQuestionIdsFromBankJson(JSON.parse(bankDiffJson));
      const d = diffQuestionBankIdSets(bundled, other);
      setBankDiffSummary({ added: d.added, removed: d.removed });
      setBankDiffError(null);
    } catch (e) {
      setBankDiffSummary(null);
      setBankDiffError(e instanceof Error ? e.message : String(e));
    }
  }, [bankDiffJson]);

  return { bankDiffSummary, bankDiffError, runBankDiff };
}

