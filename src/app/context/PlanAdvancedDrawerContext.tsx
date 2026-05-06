import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type PlanAdvancedDrawerContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  content: ReactNode | null;
  setContent: (node: ReactNode | null) => void;
  previewLine: string | null;
  setPreviewLine: (line: string | null) => void;
  /** True when orchestration panel registered advanced UI (Shape mode). */
  hasAdvancedContent: boolean;
};

const PlanAdvancedDrawerContext = createContext<PlanAdvancedDrawerContextValue | null>(null);

/**
 * Wraps Plan define/shape studio so orchestration "Advanced" sections can render in a sheet
 * and open from {@link StrategyPlanningChrome} overflow.
 */
export function PlanAdvancedDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<ReactNode | null>(null);
  const [previewLine, setPreviewLine] = useState<string | null>(null);

  const hasAdvancedContent = content != null;

  const value = useMemo(
    (): PlanAdvancedDrawerContextValue => ({
      open,
      setOpen,
      content,
      setContent,
      previewLine,
      setPreviewLine,
      hasAdvancedContent,
    }),
    [open, content, previewLine, hasAdvancedContent],
  );

  return <PlanAdvancedDrawerContext.Provider value={value}>{children}</PlanAdvancedDrawerContext.Provider>;
}

/** Returns null when not under {@link PlanAdvancedDrawerProvider} (e.g. isolated panel tests). */
export function useOptionalPlanAdvancedDrawer(): PlanAdvancedDrawerContextValue | null {
  return useContext(PlanAdvancedDrawerContext);
}

/** Requires provider — use only from chrome when parent guarantees provider. */
export function usePlanAdvancedDrawer(): PlanAdvancedDrawerContextValue {
  const ctx = useContext(PlanAdvancedDrawerContext);
  if (!ctx) {
    throw new Error('usePlanAdvancedDrawer requires PlanAdvancedDrawerProvider');
  }
  return ctx;
}

