import { useEffect } from 'react';
import { discoverApi } from '../../../data/api/discover';
import {
  setDiscoveryUiFragmentQuestions,
  type DiscoveryQuestion,
} from '../../../lib/discovery-flow';
import type { IntakeVersionTuple } from '../../../data/auditTypes';

export function useDiscoveryUiFragment(params: {
  onIntakeVersionsResolved: (versions: IntakeVersionTuple) => void;
}): void {
  const { onIntakeVersionsResolved } = params;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await discoverApi.getUiFragment();
        if (cancelled || !data?.questions?.length) return;
        if (data.intake_versions) {
          onIntakeVersionsResolved(data.intake_versions);
        }
        const mapped: DiscoveryQuestion[] = data.questions.map(question => ({
          id: question.id,
          question: question.question,
          hint: question.hint,
          type: question.type,
          options: question.options,
          optional: question.optional,
        }));
        setDiscoveryUiFragmentQuestions(mapped);
      } catch {
        // Bundled fallback in discovery-flow remains active.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onIntakeVersionsResolved]);
}
