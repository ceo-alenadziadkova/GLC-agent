import { useCallback, useEffect, useId, useState } from 'react';

import { CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS } from '@glc/intake-core';

import { Button } from '../../components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet';
import type { StrategyInitiativeBucket } from '../../config/strategy-lab';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { PIPELINE_STRATEGY_PHASE_INDEX } from '../../config/pipeline-phase-policy';
import type { StrategyInitiative } from '../../data/audit/contracts/report/report-domain.types';
import { api } from '../../data/apiService';
import { ApiError } from '../../data/api-error';
import { toast } from 'sonner';

export type { StrategyInitiativeBucket };

function stableBoardIdentityKey(bucket: StrategyInitiativeBucket, initiativeId: string): string {
  const raw = `${bucket}:${initiativeId}`;
  return raw.length > CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS
    ? raw.slice(0, CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS)
    : raw;
}

/**
 * Consultant initiative edit surface (title, description, optional Board identity key).
 * Uses Radix Sheet (same primitive family as Strategy Lab summary) for reliable jsdom/RTL coverage.
 */
export function StrategyLabInitiativeEditDrawer({
  open,
  onOpenChange,
  auditId,
  bucket,
  initiative,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditId: string;
  bucket: StrategyInitiativeBucket;
  initiative: StrategyInitiative | null;
  onSaved: () => void;
}) {
  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [preserveBoardIdentity, setPreserveBoardIdentity] = useState(false);
  const [saving, setSaving] = useState(false);
  const descriptionFieldId = useId();

  useEffect(() => {
    if (!initiative || !open) return;
    setTitleDraft(initiative.title);
    setDescriptionDraft(initiative.description);
    const hasKey = typeof initiative.board_identity_key === 'string' && initiative.board_identity_key.length > 0;
    setPreserveBoardIdentity(hasKey);
  }, [initiative, open]);

  const handleSave = useCallback(async () => {
    if (!initiative) return;
    const id = initiative.id;
    const title = titleDraft.trim();
    const description = descriptionDraft.trim();
    if (!title || !description) {
      toast.error(STRATEGY_LAB_COPY.boardIdentity.saveInitiativeFailed);
      return;
    }

    const nextIdentityKey = preserveBoardIdentity
      ? initiative.board_identity_key && initiative.board_identity_key.length > 0
        ? initiative.board_identity_key
        : stableBoardIdentityKey(bucket, id)
      : null;

    setSaving(true);
    try {
      await api.patchPipelinePhaseResult(auditId, PIPELINE_STRATEGY_PHASE_INDEX, {
        result: {
          [bucket]: [
            {
              id,
              title,
              description,
              board_identity_key: nextIdentityKey,
            },
          ],
        },
      });
      toast.success(STRATEGY_LAB_COPY.boardIdentity.saveInitiativeOk);
      onOpenChange(false);
      onSaved();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : STRATEGY_LAB_COPY.boardIdentity.saveInitiativeFailed;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [
    auditId,
    bucket,
    descriptionDraft,
    initiative,
    onOpenChange,
    onSaved,
    preserveBoardIdentity,
    titleDraft,
  ]);

  if (!initiative) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{STRATEGY_LAB_COPY.boardIdentity.drawerTitle}</SheetTitle>
          <SheetDescription className="sr-only">{STRATEGY_LAB_COPY.boardIdentity.initiativeSectionHint}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-1 py-2">
          <div className="bg-muted/50 border-border rounded-md border px-3 py-2">
            <p className="text-muted-foreground text-xs font-medium">{STRATEGY_LAB_COPY.boardIdentity.titleLabel}</p>
            <p className="text-foreground mt-1 text-sm">{initiative.title}</p>
          </div>
          <label className="flex flex-col gap-1" htmlFor={descriptionFieldId}>
            <span className="text-muted-foreground text-xs font-medium">
              {STRATEGY_LAB_COPY.boardIdentity.descriptionLabel}
            </span>
            <textarea
              id={descriptionFieldId}
              value={descriptionDraft}
              onChange={e => setDescriptionDraft(e.target.value)}
              rows={6}
              className="bg-card text-foreground border-border min-h-[length:var(--strategy-lab-drawer-textarea-min-height)] rounded-md border px-2 py-2 text-sm"
            />
          </label>
          <label className="text-foreground flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={preserveBoardIdentity}
              onChange={e => setPreserveBoardIdentity(e.target.checked)}
              className="border-border rounded border"
            />
            <span>{STRATEGY_LAB_COPY.boardIdentity.checkboxLabel}</span>
          </label>
          <p className="text-muted-foreground text-[length:var(--text-2xs)] max-w-prose">
            {STRATEGY_LAB_COPY.boardIdentity.warningWhenOff}
          </p>
        </div>
        <SheetFooter className="mt-auto flex-row flex-wrap gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            {STRATEGY_LAB_COPY.boardIdentity.cancel}
          </Button>
          <Button type="button" variant="default" disabled={saving} onClick={() => void handleSave()}>
            {saving ? STRATEGY_LAB_COPY.boardIdentity.savingInitiative : STRATEGY_LAB_COPY.boardIdentity.saveInitiative}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
