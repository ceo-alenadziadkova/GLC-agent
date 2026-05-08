import { useEffect, useMemo, useState } from 'react';

import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../components/ui/drawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import type { PlanBoardCardDto } from '../../data/api/orchestration-types';
import {
  usePlanBoardCardCommentsQuery,
  usePlanBoardCardEventsQuery,
  usePostPlanBoardCardCommentMutation,
} from '../../data/api/plan-board-queries';

type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type PlanTicketDetailsDraft = {
  title: string;
  ticket_description: string;
  assignee: string;
  assignee_user_id: string;
  labels: string;
  story_points: string;
  priority: TicketPriority;
  lane: string;
  delivery_area: string;
  start_date: string;
  due_date: string;
  end_date: string;
  to_column: string;
};

export function buildPlanTicketDetailsDraft(
  card: PlanBoardCardDto,
  fallbackColumnId?: string | null | undefined,
): PlanTicketDetailsDraft {
  return {
    title: card.title ?? card.canonical_node_key ?? card.id,
    ticket_description: card.ticket_description ?? '',
    assignee: card.assignee ?? '',
    assignee_user_id: card.assignee_user_id ?? '',
    labels: (card.labels ?? []).join(', '),
    story_points: card.story_points != null ? String(card.story_points) : '',
    priority: card.priority ?? 'medium',
    lane: card.lane ?? '',
    delivery_area: card.delivery_area ?? '',
    start_date: card.start_date ?? '',
    due_date: card.due_date ?? '',
    end_date: card.end_date ?? '',
    to_column: card.column_id ?? fallbackColumnId ?? '',
  };
}

export function PlanTicketDetailsPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: PlanBoardCardDto | null;
  auditId: string;
  canMutateCard: boolean;
  columnOptions: readonly { id: string; title: string }[];
  busy?: boolean;
  onSave: (cardId: string, draft: PlanTicketDetailsDraft) => Promise<void>;
}) {
  const { open, onOpenChange, card, canMutateCard, columnOptions, busy = false, onSave } = props;
  const [draft, setDraft] = useState<PlanTicketDetailsDraft | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const eventQuery = usePlanBoardCardEventsQuery({
    auditId: props.auditId,
    cardId: card?.id,
    enabled: open && card != null,
    limit: 60,
  });
  const commentsQuery = usePlanBoardCardCommentsQuery({
    auditId: props.auditId,
    cardId: card?.id,
    enabled: open && card != null,
    limit: 120,
  });
  const postCommentMutation = usePostPlanBoardCardCommentMutation({ auditId: props.auditId });

  useEffect(() => {
    if (!card) {
      setDraft(null);
      return;
    }
    setDraft(buildPlanTicketDetailsDraft(card, columnOptions[0]?.id ?? null));
  }, [card, columnOptions]);

  const title = card?.title ?? card?.canonical_node_key ?? card?.id ?? 'Ticket';
  const hasColumnOptions = columnOptions.length > 0;
  const validationErrors = useMemo(() => {
    if (!draft) return [];
    const out: string[] = [];
    if (draft.title.trim().length < 2) out.push('Title must contain at least 2 characters.');
    if (draft.start_date && draft.due_date && draft.due_date < draft.start_date) {
      out.push('Due date must be on or after start date.');
    }
    if (draft.start_date && draft.end_date && draft.end_date < draft.start_date) {
      out.push('End date must be on or after start date.');
    }
    if (draft.due_date && draft.end_date && draft.end_date < draft.due_date) {
      out.push('End date must be on or after due date.');
    }
    const labelsCount = draft.labels
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean).length;
    if (labelsCount > 24) out.push('Up to 24 labels are allowed.');
    if (draft.story_points.trim() !== '') {
      const n = Number(draft.story_points);
      if (!Number.isFinite(n) || n < 0 || n > 999) {
        out.push('Story points must be a number in range 0..999.');
      }
    }
    return out;
  }, [draft]);

  const saveDisabled =
    !canMutateCard ||
    busy ||
    !card ||
    !draft ||
    !hasColumnOptions ||
    validationErrors.length > 0;

  const selectedColumnTitle = useMemo(() => {
    if (!draft) return '';
    return columnOptions.find((c) => c.id === draft.to_column)?.title ?? draft.to_column;
  }, [columnOptions, draft]);

  async function handleSave() {
    if (!card || !draft || saveDisabled) return;
    await onSave(card.id, draft);
    onOpenChange(false);
  }

  async function handlePostComment() {
    if (!card) return;
    const body = commentBody.trim();
    if (!body) return;
    await postCommentMutation.mutateAsync({
      cardId: card.id,
      body,
      source_surface: 'board',
    });
    setCommentBody('');
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="max-w-xl">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>
            {selectedColumnTitle ? `Workflow column: ${selectedColumnTitle}` : 'Edit ticket fields'}
          </DrawerDescription>
        </DrawerHeader>
        {card && draft ? (
          <div
            className="space-y-3 px-4 pb-4"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                void handleSave();
              }
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="plan-ticket-edit-title" className="text-xs">
                Title
              </Label>
              <Input
                id="plan-ticket-edit-title"
                value={draft.title}
                onChange={(e) => setDraft((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                disabled={!canMutateCard || busy}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-ticket-edit-description" className="text-xs">
                Description
              </Label>
              <Input
                id="plan-ticket-edit-description"
                value={draft.ticket_description}
                onChange={(e) => setDraft((prev) => (prev ? { ...prev, ticket_description: e.target.value } : prev))}
                disabled={!canMutateCard || busy}
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="plan-ticket-edit-assignee" className="text-xs">
                  Assignee
                </Label>
                <Input
                  id="plan-ticket-edit-assignee"
                  value={draft.assignee}
                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, assignee: e.target.value } : prev))}
                  disabled={!canMutateCard || busy}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="plan-ticket-edit-assignee-user-id" className="text-xs">
                  Assignee user id
                </Label>
                <Input
                  id="plan-ticket-edit-assignee-user-id"
                  value={draft.assignee_user_id}
                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, assignee_user_id: e.target.value } : prev))}
                  disabled={!canMutateCard || busy}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="plan-ticket-edit-labels" className="text-xs">
                  Labels (comma separated)
                </Label>
                <Input
                  id="plan-ticket-edit-labels"
                  value={draft.labels}
                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, labels: e.target.value } : prev))}
                  disabled={!canMutateCard || busy}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="plan-ticket-edit-story-points" className="text-xs">
                  Story points
                </Label>
                <Input
                  id="plan-ticket-edit-story-points"
                  value={draft.story_points}
                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, story_points: e.target.value } : prev))}
                  disabled={!canMutateCard || busy}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="plan-ticket-edit-priority" className="text-xs">
                  Priority
                </Label>
                <select
                  id="plan-ticket-edit-priority"
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev ? { ...prev, priority: e.target.value as TicketPriority } : prev,
                    )
                  }
                  disabled={!canMutateCard || busy}
                  className="h-8 w-full rounded border border-[var(--border-default)] bg-[var(--surface-base)] px-2 text-xs"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="plan-ticket-edit-lane" className="text-xs">
                  Lane
                </Label>
                <Input
                  id="plan-ticket-edit-lane"
                  value={draft.lane}
                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, lane: e.target.value } : prev))}
                  disabled={!canMutateCard || busy}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="plan-ticket-edit-domain" className="text-xs">
                  Domain
                </Label>
                <Input
                  id="plan-ticket-edit-domain"
                  value={draft.delivery_area}
                  onChange={(e) =>
                    setDraft((prev) => (prev ? { ...prev, delivery_area: e.target.value } : prev))
                  }
                  disabled={!canMutateCard || busy}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="plan-ticket-edit-start-date" className="text-xs">
                  Start date
                </Label>
                <Input
                  id="plan-ticket-edit-start-date"
                  type="date"
                  value={draft.start_date}
                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, start_date: e.target.value } : prev))}
                  disabled={!canMutateCard || busy}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="plan-ticket-edit-due-date" className="text-xs">
                  Due date
                </Label>
                <Input
                  id="plan-ticket-edit-due-date"
                  type="date"
                  value={draft.due_date}
                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, due_date: e.target.value } : prev))}
                  disabled={!canMutateCard || busy}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="plan-ticket-edit-end-date" className="text-xs">
                  End date
                </Label>
                <Input
                  id="plan-ticket-edit-end-date"
                  type="date"
                  value={draft.end_date}
                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, end_date: e.target.value } : prev))}
                  disabled={!canMutateCard || busy}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-ticket-edit-column" className="text-xs">
                Status column
              </Label>
              <select
                id="plan-ticket-edit-column"
                value={draft.to_column}
                onChange={(e) => setDraft((prev) => (prev ? { ...prev, to_column: e.target.value } : prev))}
                disabled={!canMutateCard || busy}
                className="h-8 w-full rounded border border-[var(--border-default)] bg-[var(--surface-base)] px-2 text-xs"
              >
                {columnOptions.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={saveDisabled}
                onClick={() => void handleSave()}
              >
                Save ticket changes
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
                Close
              </Button>
            </div>
            {validationErrors.length > 0 ? (
              <ul className="space-y-1 text-[length:var(--text-2xs)] text-[var(--status-error-fg)]" aria-live="polite">
                {validationErrors.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <h4 className="text-xs font-semibold">Activity</h4>
              {eventQuery.isPending ? (
                <p className="text-muted-foreground mt-2 text-[length:var(--text-2xs)]">Loading events…</p>
              ) : eventQuery.data && eventQuery.data.length > 0 ? (
                <ul className="mt-2 space-y-1 text-[length:var(--text-2xs)]">
                  {eventQuery.data.slice(0, 12).map((evt) => (
                    <li key={evt.id} className="text-muted-foreground">
                      <span className="font-medium text-foreground">{evt.action}</span>{' '}
                      · {new Date(evt.created_at).toLocaleString()}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground mt-2 text-[length:var(--text-2xs)]">No activity yet.</p>
              )}
            </div>
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <h4 className="text-xs font-semibold">Comments</h4>
              <div className="mt-2 flex gap-2">
                <Input
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Add comment"
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={postCommentMutation.isPending || !card || commentBody.trim() === ''}
                  onClick={() => void handlePostComment()}
                >
                  Add
                </Button>
              </div>
              {commentsQuery.isPending ? (
                <p className="text-muted-foreground mt-2 text-[length:var(--text-2xs)]">Loading comments…</p>
              ) : commentsQuery.data && commentsQuery.data.length > 0 ? (
                <ul className="mt-2 space-y-2 text-[length:var(--text-2xs)]">
                  {commentsQuery.data.slice(0, 10).map((comment) => (
                    <li key={comment.id} className="rounded border border-[var(--border-default)] p-2">
                      <p className="text-foreground">{comment.body}</p>
                      <p className="text-muted-foreground mt-1">{new Date(comment.created_at).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground mt-2 text-[length:var(--text-2xs)]">No comments yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
