import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NEW_AUDIT_WIZARD_STEPS } from '../wizard-config/wizard-constants';

export type WizardStep = 0 | 1 | 2 | 3;
export type BasicsSubStep = 0 | 1;

export function useWizardStepState(params: {
  seedStep?: number;
  noPublicWebsite: boolean;
  url: string;
  onBeforeVisualStepChange?: () => void;
}) {
  const [step, setStep] = useState<WizardStep>(() => {
    const seed = params.seedStep ?? 0;
    return seed >= NEW_AUDIT_WIZARD_STEPS.min && seed <= NEW_AUDIT_WIZARD_STEPS.max
      ? (seed as WizardStep)
      : 0;
  });
  const [basicsSubStep, setBasicsSubStep] = useState<BasicsSubStep>(0);
  const prevStepForSiteSplitRef = useRef<WizardStep>(step);

  const useBasicsSiteScanSplit = useMemo(
    () => !params.noPublicWebsite && params.url.trim().length > 0,
    [params.noPublicWebsite, params.url],
  );

  const visualWizardIndex = useMemo(() => {
    if (!useBasicsSiteScanSplit) return step;
    if (step === 0) return basicsSubStep;
    return step + 1;
  }, [useBasicsSiteScanSplit, step, basicsSubStep]);

  const stepIndicatorVariant: 'four' | 'five' = useBasicsSiteScanSplit ? 'five' : 'four';

  useEffect(() => {
    if (step === 0 && prevStepForSiteSplitRef.current > 0) {
      setBasicsSubStep(0);
    }
    prevStepForSiteSplitRef.current = step;
  }, [step]);

  const handleWizardStepIndicatorClick = useCallback(
    (visual: number) => {
      params.onBeforeVisualStepChange?.();
      if (!useBasicsSiteScanSplit) {
        setStep(visual as WizardStep);
        return;
      }
      if (visual <= 1) {
        setStep(0);
        setBasicsSubStep(visual as BasicsSubStep);
        return;
      }
      setStep((visual - 1) as WizardStep);
    },
    [useBasicsSiteScanSplit, params.onBeforeVisualStepChange],
  );

  const handleSiteCheckContinueToBrief = useCallback(() => {
    setStep(1);
  }, []);

  const handleSiteCheckBackToBasicsForm = useCallback(() => {
    setBasicsSubStep(0);
  }, []);

  return {
    step,
    setStep,
    basicsSubStep,
    setBasicsSubStep,
    useBasicsSiteScanSplit,
    visualWizardIndex,
    stepIndicatorVariant,
    handleWizardStepIndicatorClick,
    handleSiteCheckContinueToBrief,
    handleSiteCheckBackToBasicsForm,
  };
}
