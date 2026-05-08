import { useCallback, useState } from 'react';

import type { StrategyInitiativeBucket } from '../config/strategy-lab';
import type { StrategyInitiative } from '../data/audit/contracts/report/report-domain.types';

export type UseStrategyInitiativeEditDrawerResult = {
  initiativeEditOpen: boolean;
  initiativeEditBucket: StrategyInitiativeBucket;
  initiativeEditTarget: StrategyInitiative | null;
  setInitiativeEditOpen: (open: boolean) => void;
  openInitiativeEditor: (bucket: StrategyInitiativeBucket, initiative: StrategyInitiative) => void;
};

/** Controls the full-screen initiative edit drawer on Strategy Lab (consultant). */
export function useStrategyInitiativeEditDrawer(): UseStrategyInitiativeEditDrawerResult {
  const [initiativeEditOpen, setInitiativeEditOpen] = useState(false);
  const [initiativeEditBucket, setInitiativeEditBucket] = useState<StrategyInitiativeBucket>('quick_wins');
  const [initiativeEditTarget, setInitiativeEditTarget] = useState<StrategyInitiative | null>(null);

  const openInitiativeEditor = useCallback((bucket: StrategyInitiativeBucket, initiative: StrategyInitiative) => {
    setInitiativeEditBucket(bucket);
    setInitiativeEditTarget(initiative);
    setInitiativeEditOpen(true);
  }, []);

  return {
    initiativeEditOpen,
    initiativeEditBucket,
    initiativeEditTarget,
    setInitiativeEditOpen,
    openInitiativeEditor,
  };
}
