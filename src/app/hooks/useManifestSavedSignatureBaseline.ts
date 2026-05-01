import { useCallback, useState } from 'react';

import {
  type OrchestrationChangeScenario,
  type OrchestrationSeasonPreset,
} from '../config/orchestration-roadmap-manifest';
import { manifestChangeSignatureFromPayload } from '../lib/manifest-change-signature';
import { useManifestChangeSignatureFromDraftInputs } from './useManifestChangeSignatureFromDraftInputs';

export type ManifestSavedSignatureBaselineInputs = {
  scenario: OrchestrationChangeScenario;
  season: OrchestrationSeasonPreset;
  planHorizonStart: string;
  planHorizonEnd: string;
};

/**
 * Shared manifest digest + saved baseline for Strategy Lab panel and portal manifest wizard.
 * Keeps `hasUnsavedManifestChanges` consistent with the same signing path everywhere.
 */
export function useManifestSavedSignatureBaseline(deps: ManifestSavedSignatureBaselineInputs) {
  const currentManifestSignature = useManifestChangeSignatureFromDraftInputs(deps);
  const [savedManifestSignature, setSavedManifestSignature] = useState<string | null>(null);

  const hasUnsavedManifestChanges =
    savedManifestSignature !== null && savedManifestSignature !== currentManifestSignature;

  const applySignatureFromManifestPayload = useCallback(
    (payload: Parameters<typeof manifestChangeSignatureFromPayload>[0]) => {
      setSavedManifestSignature(manifestChangeSignatureFromPayload(payload));
    },
    [],
  );

  const markDraftAsSavedBaseline = useCallback(() => {
    setSavedManifestSignature(currentManifestSignature);
  }, [currentManifestSignature]);

  const clearSavedSignature = useCallback(() => {
    setSavedManifestSignature(null);
  }, []);

  return {
    currentManifestSignature,
    savedManifestSignature,
    setSavedManifestSignature,
    hasUnsavedManifestChanges,
    applySignatureFromManifestPayload,
    markDraftAsSavedBaseline,
    clearSavedSignature,
  };
}
