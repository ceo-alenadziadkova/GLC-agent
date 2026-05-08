import type { ReactNode } from 'react';
import { ArrowsClockwise, MapTrifold } from '@phosphor-icons/react';

import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';

export type PortalPlanLoadingLayout = 'roadmap' | 'center' | 'embedded';

/**
 * Shared loading affordances for Plan surfaces (Roadmap Gantt + Timeline).
 * Keeps skeletons, aria-busy/live, and typography aligned across portal routes.
 */
export function PortalPlanLoadingState(props: {
  layout: PortalPlanLoadingLayout;
  /** Primary line (e.g. loading audit vs loading timeline). */
  headline: string;
  /** Secondary line — defaults to shared plan-surface detail copy. */
  detail?: string;
}) {
  const { layout, headline, detail = ORCHESTRATION_UI_COPY.planSurfaceLoadingDetail } = props;

  if (layout === 'roadmap') {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8" aria-busy="true" role="status" aria-live="polite">
        <div className="h-40 w-full animate-pulse rounded-xl border border-border bg-muted/60" />
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-24 animate-pulse rounded-md bg-muted/60" />
          <div className="h-9 w-32 animate-pulse rounded-md bg-muted/60" />
          <div className="h-9 w-40 animate-pulse rounded-md bg-muted/60" />
        </div>
        <div className="flex flex-col items-center justify-center gap-2 pt-8 text-sm ds-text-secondary">
          <MapTrifold className="h-8 w-8 opacity-70" aria-hidden />
          <p className="text-center font-medium ds-text-primary">{headline}</p>
          <p className="text-center">{detail}</p>
        </div>
      </div>
    );
  }

  if (layout === 'center') {
    return (
      <div
        className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 px-4 py-12 text-sm ds-text-secondary"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <MapTrifold className="h-8 w-8 opacity-70" aria-hidden />
        <p className="text-center font-medium ds-text-primary">{headline}</p>
        <p className="text-center">{detail}</p>
        <ArrowsClockwise className="mt-2 h-6 w-6 animate-spin ds-text-brand" aria-hidden />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[length:var(--portal-plan-loading-min-height)] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-8 text-sm ds-text-secondary"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex w-full max-w-lg flex-col gap-2">
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted-foreground/20" aria-hidden />
        <div className="h-3 w-full animate-pulse rounded bg-muted-foreground/15" aria-hidden />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted-foreground/15" aria-hidden />
      </div>
      <div className="flex items-center gap-2">
        <ArrowsClockwise className="h-5 w-5 animate-spin ds-text-brand" aria-hidden />
        <span className="text-center">{headline}</span>
      </div>
      <span className="max-w-md text-center text-xs ds-text-tertiary">{detail}</span>
    </div>
  );
}

export function PortalPlanErrorState(props: { message: string; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl space-y-3 px-4 py-8" role="alert">
      <p className="text-sm ds-text-score-1">{props.message}</p>
      {props.children}
    </div>
  );
}

export function PortalPlanEmptyCallout(props: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-12 text-center text-sm ds-text-secondary"
      role="status"
      aria-live="polite"
    >
      <MapTrifold className="text-muted-foreground h-10 w-10 shrink-0" aria-hidden />
      <p className="text-base font-semibold ds-text-primary">{props.title}</p>
      <p className="max-w-prose text-sm">{props.body}</p>
      {props.children ? <div className="flex flex-wrap items-center justify-center gap-2">{props.children}</div> : null}
    </div>
  );
}
