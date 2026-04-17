import type { ReactNode } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { cn } from '../../components/ui/utils';
import { DESIGN_SYSTEM_INTERNAL_PAGE_COPY } from '../../config/design-system-internal-page-copy.en';
import {
  CARD_GRID_CONTRACTS,
  FORM_SECTION_CONTRACTS,
  HEADER_ACTIONS_CONTRACTS,
  LAYOUT_CONTRACTS,
  PAGE_SHELL_CONTRACTS,
  SECTION_SHELL_CONTRACTS,
} from '../../../design-system/patterns';
import { REPORT_VIEWER_LAYOUT } from '../../../design-system/patterns/ReportViewer/layout';

const P = DESIGN_SYSTEM_INTERNAL_PAGE_COPY.patterns;

function ContractSourceBlock({ value }: { value: object }) {
  return (
    <pre className="m-0 p-3 rounded-md border border-border bg-muted/30 font-mono text-[length:var(--text-2xs)] ds-text-tertiary overflow-x-auto whitespace-pre-wrap break-all">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function Sandbox({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[length:var(--text-2xs)] font-medium uppercase tracking-wide ds-text-quaternary">
        {P.sandboxLabel}
      </span>
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-4">{children}</div>
    </div>
  );
}

function PatternDemoCard({
  title,
  body,
  contract,
  children,
}: {
  title: string;
  body: string;
  contract: object;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <p className="text-sm m-0 ds-text-secondary leading-relaxed">{body}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <div className="flex flex-col gap-2">
          <span className="text-[length:var(--text-2xs)] font-medium uppercase tracking-wide ds-text-quaternary">
            {P.codeLabel}
          </span>
          <ContractSourceBlock value={contract} />
        </div>
        <Sandbox>{children}</Sandbox>
      </CardContent>
    </Card>
  );
}

function PlaceholderPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-4 text-sm ds-text-secondary">
      {label}
    </div>
  );
}

export function AdminDesignSystemPatternsShowcase() {
  return (
    <div className="flex flex-col gap-10 m-0">
      <p className="text-sm m-0 ds-text-secondary leading-relaxed max-w-3xl">{P.intro}</p>

      <section className="flex flex-col gap-4" aria-label={P.layout.heading}>
        <PatternDemoCard
          title={P.layout.heading}
          body={P.layout.body}
          contract={LAYOUT_CONTRACTS}
        >
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[length:var(--text-2xs)] ds-text-quaternary">container.page</span>
                <div className={cn(LAYOUT_CONTRACTS.container.page, 'rounded-lg border border-border px-3 py-6')}>
                  <PlaceholderPanel label="max-w-7xl column" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[length:var(--text-2xs)] ds-text-quaternary">container.content</span>
                <div className={cn(LAYOUT_CONTRACTS.container.content, 'rounded-lg border border-border px-3 py-6')}>
                  <PlaceholderPanel label="max-w-5xl column" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[length:var(--text-2xs)] ds-text-quaternary">spacing.sectionFlow</span>
              <div className={cn(LAYOUT_CONTRACTS.spacing.sectionFlow, 'rounded-lg border border-border p-3')}>
                <PlaceholderPanel label="Block 1" />
                <PlaceholderPanel label="Block 2" />
              </div>
            </div>
          </div>
        </PatternDemoCard>
      </section>

      <section className="flex flex-col gap-4" aria-label={P.pageShell.heading}>
        <PatternDemoCard
          title={P.pageShell.heading}
          body={P.pageShell.body}
          contract={PAGE_SHELL_CONTRACTS}
        >
          <div className={PAGE_SHELL_CONTRACTS.root}>
            <div className={cn(PAGE_SHELL_CONTRACTS.body, PAGE_SHELL_CONTRACTS.sectionStack)}>
              <PlaceholderPanel label="First stacked section" />
              <PlaceholderPanel label="Second stacked section" />
            </div>
          </div>
        </PatternDemoCard>
      </section>

      <section className="flex flex-col gap-4" aria-label={P.sectionShell.heading}>
        <PatternDemoCard
          title={P.sectionShell.heading}
          body={P.sectionShell.body}
          contract={SECTION_SHELL_CONTRACTS}
        >
          <section className={SECTION_SHELL_CONTRACTS.root}>
            <div className={SECTION_SHELL_CONTRACTS.heading}>
              <h4 className="m-0 min-w-0 text-base font-semibold ds-text-primary truncate">Section title</h4>
              <Badge variant="secondary">Meta</Badge>
            </div>
            <div className={SECTION_SHELL_CONTRACTS.content}>
              <PlaceholderPanel label="Primary content" />
              <PlaceholderPanel label="Secondary content" />
            </div>
          </section>
        </PatternDemoCard>
      </section>

      <section className="flex flex-col gap-4" aria-label={P.cardGrid.heading}>
        <PatternDemoCard
          title={P.cardGrid.heading}
          body={P.cardGrid.body}
          contract={CARD_GRID_CONTRACTS}
        >
          <div className="flex flex-col gap-8">
            {(Object.keys(CARD_GRID_CONTRACTS) as (keyof typeof CARD_GRID_CONTRACTS)[]).map((key) => (
              <div key={key} className="flex flex-col gap-2">
                <span className="font-mono text-[length:var(--text-2xs)] ds-text-quaternary">{key}</span>
                <div className={CARD_GRID_CONTRACTS[key]}>
                  <PlaceholderPanel label="Card A" />
                  <PlaceholderPanel label="Card B" />
                  <PlaceholderPanel label="Card C" />
                </div>
              </div>
            ))}
          </div>
        </PatternDemoCard>
      </section>

      <section className="flex flex-col gap-4" aria-label={P.formSection.heading}>
        <PatternDemoCard
          title={P.formSection.heading}
          body={P.formSection.body}
          contract={FORM_SECTION_CONTRACTS}
        >
          <div className={FORM_SECTION_CONTRACTS.root}>
            <div className={FORM_SECTION_CONTRACTS.fields}>
              <Input type="text" placeholder="Field one" />
              <Input type="text" placeholder="Field two" />
            </div>
            <div className={FORM_SECTION_CONTRACTS.actions}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
              <Button type="button" variant="default">
                Save
              </Button>
            </div>
          </div>
        </PatternDemoCard>
      </section>

      <section className="flex flex-col gap-4" aria-label={P.headerActions.heading}>
        <PatternDemoCard
          title={P.headerActions.heading}
          body={P.headerActions.body}
          contract={HEADER_ACTIONS_CONTRACTS}
        >
          <div className={HEADER_ACTIONS_CONTRACTS.root}>
            <div className={HEADER_ACTIONS_CONTRACTS.titleBlock}>
              <h4 className="m-0 text-lg font-semibold ds-text-primary">Workspace title</h4>
              <p className="m-0 text-sm ds-text-secondary">Subtitle or context line that can wrap on small screens.</p>
            </div>
            <div className={HEADER_ACTIONS_CONTRACTS.actions}>
              <Button type="button" variant="outline" size="sm">
                Export
              </Button>
              <Button type="button" size="sm">
                Primary
              </Button>
            </div>
          </div>
        </PatternDemoCard>
      </section>

      <section className="flex flex-col gap-4" aria-label={P.reportViewer.heading}>
        <PatternDemoCard
          title={P.reportViewer.heading}
          body={P.reportViewer.body}
          contract={REPORT_VIEWER_LAYOUT}
        >
          <div className={REPORT_VIEWER_LAYOUT.findingsGrid}>
            <PlaceholderPanel label="Finding card slot" />
            <PlaceholderPanel label="Finding card slot" />
            <PlaceholderPanel label="Finding card slot" />
            <PlaceholderPanel label="Finding card slot" />
          </div>
        </PatternDemoCard>
      </section>
    </div>
  );
}
