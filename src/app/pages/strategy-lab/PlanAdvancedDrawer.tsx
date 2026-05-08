import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet';
import { PLAN_WORKSPACE_UI_COPY } from '../../config/plan-workspace-ui-copy.en';
import { useOptionalPlanAdvancedDrawer } from '../../context/PlanAdvancedDrawerContext';

/**
 * Right sheet hosting orchestration Advanced sections (registered from {@link StrategyLabOrchestrationPanel}).
 * Mount once inside {@link PlanAdvancedDrawerProvider}.
 */
export function PlanAdvancedDrawerShell() {
  const ctx = useOptionalPlanAdvancedDrawer();
  if (!ctx) return null;

  const { open, setOpen, content, previewLine } = ctx;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{PLAN_WORKSPACE_UI_COPY.advancedDrawerTitle}</SheetTitle>
          <SheetDescription className="space-y-1.5">
            <span className="block">{PLAN_WORKSPACE_UI_COPY.advancedDrawerDescription}</span>
            {previewLine && previewLine.trim() !== '' ? (
              <span className="text-muted-foreground block text-xs leading-snug">{previewLine}</span>
            ) : null}
          </SheetDescription>
        </SheetHeader>
        <div className="border-border space-y-5 border-t px-4 pb-6 pt-2">{content}</div>
      </SheetContent>
    </Sheet>
  );
}
