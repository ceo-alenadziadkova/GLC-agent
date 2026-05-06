import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../../../components/ui/sheet';
import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
import { PLAN_BOARD_COLUMN_HEADINGS_EN } from '../../../config/plan-board-ui-columns';
import {
  PLAN_BOARD_COLUMN_ID_MAX_UI,
  PLAN_BOARD_COLUMN_ID_UI_PATTERN,
  PLAN_BOARD_COLUMN_POLICY_MAX_COLUMNS_UI,
  PLAN_BOARD_COLUMN_TITLE_MAX_UI,
} from '../../../config/plan-board-column-policy-ui';
import { PLAN_BOARD_SEMANTIC_ORDER, type PlanBoardSemanticRole } from '../../../config/plan-board-semantics-order';
import type { PlanBoardColumnDto, PlanBoardColumnPolicyReplaceBody } from '../../../data/api/audits-orchestration';
import { usePatchPlanBoardColumnPolicyMutation } from '../../../data/api/plan-board-queries';

type ColumnRowDraft = { id: string; title: string };

function semanticsFromColumns(cols: readonly PlanBoardColumnDto[]): Record<PlanBoardSemanticRole, string> {
  const out = {} as Record<PlanBoardSemanticRole, string>;
  for (const role of PLAN_BOARD_SEMANTIC_ORDER) {
    const hit = cols.find((c) => c.semantic === role);
    out[role] = hit?.id ?? cols[0]?.id ?? '';
  }
  return out;
}

function columnRowsFromBoard(cols: readonly PlanBoardColumnDto[]): ColumnRowDraft[] {
  return cols.map((c) => ({ id: c.id, title: c.title }));
}

function buildReplacePolicy(columns: ColumnRowDraft[], semantics: Record<PlanBoardSemanticRole, string>): PlanBoardColumnPolicyReplaceBody | null {
  const trimmed = columns
    .map((r) => ({ id: r.id.trim(), title: r.title.trim() }))
    .filter((r) => r.id !== '' || r.title !== '');
  const ids = new Set<string>();
  for (const r of trimmed) {
    if (!PLAN_BOARD_COLUMN_ID_UI_PATTERN.test(r.id)) return null;
    if (r.id.length > PLAN_BOARD_COLUMN_ID_MAX_UI || r.title.length < 1 || r.title.length > PLAN_BOARD_COLUMN_TITLE_MAX_UI)
      return null;
    if (ids.has(r.id)) return null;
    ids.add(r.id);
  }
  if (trimmed.length < PLAN_BOARD_SEMANTIC_ORDER.length || trimmed.length > PLAN_BOARD_COLUMN_POLICY_MAX_COLUMNS_UI)
    return null;

  const semTargets = PLAN_BOARD_SEMANTIC_ORDER.map((k) => semantics[k]?.trim()).filter(Boolean);
  if (new Set(semTargets).size !== PLAN_BOARD_SEMANTIC_ORDER.length) return null;
  for (const t of semTargets) {
    if (!ids.has(t)) return null;
  }

  return {
    schema_version: 1,
    columns: trimmed.map((r) => ({ id: r.id, title: r.title })),
    semantics: {
      backlog: semantics.backlog.trim(),
      next_up: semantics.next_up.trim(),
      in_progress: semantics.in_progress.trim(),
      review: semantics.review.trim(),
      done: semantics.done.trim(),
      blocked: semantics.blocked.trim(),
    },
  };
}

export function PlanBoardColumnPolicySheet(props: {
  auditId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: readonly PlanBoardColumnDto[] | undefined;
}) {
  const { auditId, open, onOpenChange, columns } = props;
  const patchMutation = usePatchPlanBoardColumnPolicyMutation({ auditId });

  const [columnRows, setColumnRows] = useState<ColumnRowDraft[]>([]);
  const [semantics, setSemantics] = useState<Record<PlanBoardSemanticRole, string>>(() =>
    PLAN_BOARD_SEMANTIC_ORDER.reduce(
      (acc, k) => {
        acc[k] = '';
        return acc;
      },
      {} as Record<PlanBoardSemanticRole, string>,
    ),
  );

  useEffect(() => {
    if (!open || columns == null || columns.length === 0) return;
    setColumnRows(columnRowsFromBoard(columns));
    setSemantics(semanticsFromColumns(columns));
  }, [columns, open]);

  const columnIdOptions = useMemo(() => columnRows.map((r) => r.id.trim()).filter(Boolean), [columnRows]);

  async function handleSave(): Promise<void> {
    const policy = buildReplacePolicy(columnRows, semantics);
    if (!policy) {
      toast.error(PLAN_BOARD_COPY.boardSettingsValidationError);
      return;
    }
    try {
      await patchMutation.mutateAsync({ kind: 'replace', policy });
      toast.success(PLAN_BOARD_COPY.boardSettingsSavedToast);
      onOpenChange(false);
    } catch {
      toast.error(PLAN_BOARD_COPY.boardSettingsValidationError);
    }
  }

  async function handleReset(): Promise<void> {
    try {
      await patchMutation.mutateAsync({ kind: 'reset' });
      toast.success(PLAN_BOARD_COPY.boardSettingsResetToast);
      onOpenChange(false);
    } catch {
      toast.error(PLAN_BOARD_COPY.boardSettingsValidationError);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{PLAN_BOARD_COPY.boardSettingsTitle}</SheetTitle>
          <SheetDescription>{PLAN_BOARD_COPY.boardSettingsDescription}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 px-4 pb-4">
          <div className="space-y-3">
            <h4 className="text-foreground text-sm font-medium">{PLAN_BOARD_COPY.boardSettingsSemanticsHeading}</h4>
            <div className="space-y-3">
              {PLAN_BOARD_SEMANTIC_ORDER.map((role) => (
                <div key={role} className="space-y-1.5">
                  <Label className="text-xs font-medium">{PLAN_BOARD_COLUMN_HEADINGS_EN[role]}</Label>
                  <Select
                    value={semantics[role] || undefined}
                    onValueChange={(v) => setSemantics((s) => ({ ...s, [role]: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columnIdOptions.map((id) => (
                        <SelectItem key={`${role}-${id}`} value={id}>
                          {id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-foreground m-0 text-sm font-medium">{PLAN_BOARD_COPY.boardSettingsColumnsHeading}</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setColumnRows((rows) => [...rows, { id: '', title: '' }])}
              >
                {PLAN_BOARD_COPY.boardSettingsAddColumnCta}
              </Button>
            </div>
            <ul className="space-y-3" role="list">
              {columnRows.map((row, idx) => (
                <li key={`col-${idx}`} className="border-border space-y-2 rounded-md border p-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor={`col-id-${idx}`}>
                      id
                    </Label>
                    <Input
                      id={`col-id-${idx}`}
                      value={row.id}
                      onChange={(e) => {
                        const v = e.target.value;
                        setColumnRows((rows) => rows.map((r, i) => (i === idx ? { ...r, id: v } : r)));
                      }}
                      maxLength={PLAN_BOARD_COLUMN_ID_MAX_UI}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor={`col-title-${idx}`}>
                      title
                    </Label>
                    <Input
                      id={`col-title-${idx}`}
                      value={row.title}
                      onChange={(e) => {
                        const v = e.target.value;
                        setColumnRows((rows) => rows.map((r, i) => (i === idx ? { ...r, title: v } : r)));
                      }}
                      maxLength={PLAN_BOARD_COLUMN_TITLE_MAX_UI}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <SheetFooter className="border-border flex-col gap-2 border-t px-4 py-4 sm:flex-col">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={patchMutation.isPending}
            onClick={() => void handleReset()}
          >
            {PLAN_BOARD_COPY.boardSettingsResetCta}
          </Button>
          <div className="flex w-full gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {PLAN_BOARD_COPY.boardSettingsCancelCta}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={patchMutation.isPending}
              onClick={() => void handleSave()}
            >
              {PLAN_BOARD_COPY.boardSettingsSaveCta}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
