import { useCallback } from 'react';

import type { StrategyInitiativeBucket } from '../config/strategy-lab';
import type { StrategyInitiative } from '../data/audit/contracts/report/report-domain.types';
import { useInitiativeDetailsMutation } from './useInitiativeDetailsMutation';
import { useInitiativeTitleMutation } from './useInitiativeTitleMutation';

type UseStrategyInitiativeInlineEditsOptions = {
  auditId?: string;
};

/** Shape-mode inline edit adapter for initiative title/description/board identity fields. */
export function useStrategyInitiativeInlineEdits({ auditId }: UseStrategyInitiativeInlineEditsOptions) {
  const initiativeTitleMutation = useInitiativeTitleMutation({ auditId });
  const initiativeDetailsMutation = useInitiativeDetailsMutation({ auditId });

  const isMutatingInitiative =
    initiativeTitleMutation.isPending || initiativeDetailsMutation.isPending;

  const commitInitiativeTitle = useCallback(
    async (args: { bucket: StrategyInitiativeBucket; initiative: StrategyInitiative; title: string }) => {
      await initiativeTitleMutation.mutateAsync(args);
    },
    [initiativeTitleMutation],
  );

  const commitInitiativeDescription = useCallback(
    async (args: { bucket: StrategyInitiativeBucket; initiative: StrategyInitiative; description: string }) => {
      await initiativeDetailsMutation.mutateAsync(args);
    },
    [initiativeDetailsMutation],
  );

  const commitInitiativeBoardIdentityPreference = useCallback(
    async (args: {
      bucket: StrategyInitiativeBucket;
      initiative: StrategyInitiative;
      preserveBoardIdentity: boolean;
    }) => {
      await initiativeDetailsMutation.mutateAsync(args);
    },
    [initiativeDetailsMutation],
  );

  return {
    isMutatingInitiative,
    commitInitiativeTitle,
    commitInitiativeDescription,
    commitInitiativeBoardIdentityPreference,
  };
}
