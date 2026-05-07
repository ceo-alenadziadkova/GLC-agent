import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';

export function BoardColumnShell(props: {
  columnId: string;
  heading: string;
  laneMixCaption?: string | null;
  workflowHint?: string | null;
  children?: ReactNode;
}) {
  const { columnId, heading, laneMixCaption, workflowHint, children } = props;
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  return (
    <section
      ref={setNodeRef}
      aria-label={heading}
      className={`bg-card border-border flex min-h-[12rem] min-w-[11rem] flex-col rounded-lg border ${isOver ? 'ring-muted ring-2 ring-offset-2' : ''}`}
    >
      <header className="border-border border-b px-3 py-2">
        <h2 className="text-foreground text-sm font-semibold">{heading}</h2>
        {laneMixCaption ? <p className="text-muted-foreground mt-1 text-xs leading-snug">{laneMixCaption}</p> : null}
        {workflowHint ? <p className="mt-1 text-xs text-[var(--status-warning-fg)]">{workflowHint}</p> : null}
      </header>
      <ul className="flex flex-col gap-2 p-3">{children}</ul>
    </section>
  );
}
