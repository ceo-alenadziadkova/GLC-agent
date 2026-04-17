import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Callout } from '../../components/ui/callout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { DESIGN_SYSTEM_INTERNAL_PAGE_COPY } from '../../config/design-system-internal-page-copy.en';
import {
  DS_INTERNAL_COLOR_GROUPS,
  DS_INTERNAL_RADIUS_SCALE,
  DS_INTERNAL_SHADOW_SCALE,
  DS_INTERNAL_SPACING_SCALE,
  DS_INTERNAL_TYPOGRAPHY_BODY,
  DS_INTERNAL_TYPOGRAPHY_SCALE,
} from '../../config/design-system-internal-showcase-data';
import { DESIGN_SYSTEM_INTERNAL_MANIFEST } from '../../data/design-system-internal-manifest';
import { cn } from '../../components/ui/utils';
import { AdminDesignSystemPatternsShowcase } from './AdminDesignSystemPatternsShowcase';

const COPY = DESIGN_SYSTEM_INTERNAL_PAGE_COPY;
const MANIFEST = DESIGN_SYSTEM_INTERNAL_MANIFEST;

function MachineManifestScript({ json }: { json: string }) {
  return (
    <script
      id="glc-design-system-internal-manifest"
      type="application/json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="text-[length:var(--text-xs)] font-semibold uppercase tracking-wider ds-text-quaternary m-0 scroll-mt-24">
      {children}
    </h3>
  );
}

export function AdminDesignSystemShowcasePanels({ json }: { json: string }) {
  const docEntries = useMemo(
    () => Object.entries(COPY.docLinks) as [keyof typeof COPY.docLinks, string][],
    [],
  );

  return (
    <div className={cn('ds-pattern-page-shell-body max-w-6xl mx-auto w-full flex flex-col gap-6')}>
      <Tabs defaultValue="foundation" className="flex flex-col gap-6">
        <TabsList className="w-full max-w-full h-auto min-h-9 flex flex-wrap justify-start gap-1 p-1 sm:flex-nowrap sm:overflow-x-auto">
          <TabsTrigger value="overview" className="shrink-0">
            {COPY.tabs.overview}
          </TabsTrigger>
          <TabsTrigger value="foundation" className="shrink-0">
            {COPY.tabs.foundation}
          </TabsTrigger>
          <TabsTrigger value="primitives" className="shrink-0">
            {COPY.tabs.primitives}
          </TabsTrigger>
          <TabsTrigger value="patterns" className="shrink-0">
            {COPY.tabs.patterns}
          </TabsTrigger>
          <TabsTrigger value="tooling" className="shrink-0">
            {COPY.tabs.tooling}
          </TabsTrigger>
          <TabsTrigger value="machine" className="shrink-0">
            {COPY.tabs.machine}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-6 m-0">
          <p className="text-sm m-0 ds-text-secondary leading-relaxed max-w-3xl">{COPY.intro}</p>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">{COPY.sections.spec.heading}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm ds-text-secondary leading-relaxed flex flex-col gap-3 pt-0">
              <p className="m-0">{COPY.sections.spec.body}</p>
              <ul className="m-0 pl-5 list-disc font-mono text-[length:var(--text-2xs)] ds-text-tertiary space-y-1">
                {docEntries.map(([key, path]) => (
                  <li key={key}>
                    <span className="sr-only">{key}</span>
                    {path}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="foundation" className="flex flex-col gap-12 m-0">
          <section className="flex flex-col gap-6" aria-labelledby="ds-internal-colors">
            <SectionHeading id="ds-internal-colors">Color</SectionHeading>
            <p className="text-sm m-0 ds-text-secondary max-w-3xl">{COPY.foundation.colorsIntro}</p>
            <div className="flex flex-col gap-10">
              {DS_INTERNAL_COLOR_GROUPS.map((group) => (
                <div key={group.id} className="flex flex-col gap-3">
                  <h4 className="text-sm font-semibold m-0 ds-text-primary">{group.title}</h4>
                  <div className="ds-admin-design-system-showcase-grid">
                    {group.items.map((item) => (
                      <div key={item.id} className="flex flex-col gap-1.5 min-w-0">
                        <div className="ds-admin-design-system-swatch">
                          <div
                            className="ds-admin-design-system-swatch-sample"
                            style={{ '--ds-internal-swatch-fill': item.cssVar } as CSSProperties}
                          />
                        </div>
                        <p className="ds-admin-design-system-swatch-label">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          <section className="flex flex-col gap-4" aria-labelledby="ds-internal-typography">
            <SectionHeading id="ds-internal-typography">Typography</SectionHeading>
            <p className="text-sm m-0 ds-text-secondary max-w-3xl">{COPY.foundation.typographyIntro}</p>
            <div className="flex flex-col gap-4">
              {DS_INTERNAL_TYPOGRAPHY_SCALE.map((row) => (
                <div key={row.id} className="flex flex-col gap-1.5 border-b border-border pb-4 last:border-b-0 last:pb-0">
                  <span className="font-mono text-[length:var(--text-2xs)] ds-text-quaternary">{row.key}</span>
                  <p
                    className="ds-admin-design-system-type-sample"
                    style={
                      {
                        '--ds-internal-type-ff': DS_INTERNAL_TYPOGRAPHY_BODY.fontFamily,
                        '--ds-internal-type-fs': row.cssVar,
                        '--ds-internal-type-lh': DS_INTERNAL_TYPOGRAPHY_BODY.lineHeight,
                      } as CSSProperties
                    }
                  >
                    The quick brown fox jumps over the lazy dog. 0123456789
                  </p>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          <section className="flex flex-col gap-4" aria-labelledby="ds-internal-spacing">
            <SectionHeading id="ds-internal-spacing">Spacing</SectionHeading>
            <p className="text-sm m-0 ds-text-secondary max-w-3xl">{COPY.foundation.spacingIntro}</p>
            <div className="flex flex-wrap items-end gap-4">
              {DS_INTERNAL_SPACING_SCALE.map((row) => (
                <div key={row.id} className="flex flex-col items-center gap-2">
                  <div className="ds-admin-design-system-spacing-bar" style={{ width: row.cssVar }} />
                  <span className="font-mono text-[length:var(--text-2xs)] ds-text-quaternary">{row.key}</span>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          <section className="flex flex-col gap-4" aria-labelledby="ds-internal-radius">
            <SectionHeading id="ds-internal-radius">Radius</SectionHeading>
            <p className="text-sm m-0 ds-text-secondary max-w-3xl">{COPY.foundation.radiusIntro}</p>
            <div className="ds-admin-design-system-showcase-grid">
              {DS_INTERNAL_RADIUS_SCALE.map((row) => (
                <div key={row.id} className="flex flex-col gap-2 min-w-0">
                  <div
                    className="ds-admin-design-system-radius-demo"
                    style={{ '--ds-internal-radius-demo': row.cssVar } as CSSProperties}
                  />
                  <span className="font-mono text-[length:var(--text-2xs)] ds-text-quaternary">{row.key}</span>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          <section className="flex flex-col gap-4" aria-labelledby="ds-internal-shadows">
            <SectionHeading id="ds-internal-shadows">Shadows</SectionHeading>
            <p className="text-sm m-0 ds-text-secondary max-w-3xl">{COPY.foundation.shadowsIntro}</p>
            <div className="ds-admin-design-system-showcase-grid">
              {DS_INTERNAL_SHADOW_SCALE.map((row) => (
                <div key={row.id} className="flex flex-col gap-2 min-w-0">
                  <div
                    className="ds-admin-design-system-shadow-tile"
                    style={{ '--ds-internal-shadow-demo': row.cssVar } as CSSProperties}
                  />
                  <span className="font-mono text-[length:var(--text-2xs)] ds-text-quaternary break-all">{row.key}</span>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="primitives" className="flex flex-col gap-8 m-0">
          <p className="text-sm m-0 ds-text-secondary max-w-3xl">{COPY.primitives.intro}</p>

          <section aria-labelledby="ds-prim-buttons" className="flex flex-col gap-3">
            <SectionHeading id="ds-prim-buttons">{COPY.primitives.buttons}</SectionHeading>
            <div className="flex flex-wrap gap-3 items-center">
              <Button type="button" variant="default">
                Default
              </Button>
              <Button type="button" variant="secondary">
                Secondary
              </Button>
              <Button type="button" variant="outline">
                Outline
              </Button>
              <Button type="button" variant="ghost">
                Ghost
              </Button>
              <Button type="button" variant="destructive">
                Destructive
              </Button>
              <Button type="button" variant="link">
                Link
              </Button>
              <Button type="button" variant="default" size="sm">
                Small
              </Button>
              <Button type="button" variant="default" size="lg">
                Large
              </Button>
              <Button type="button" variant="default" disabled>
                Disabled
              </Button>
            </div>
          </section>

          <section aria-labelledby="ds-prim-badges" className="flex flex-col gap-3">
            <SectionHeading id="ds-prim-badges">{COPY.primitives.badges}</SectionHeading>
            <div className="flex flex-wrap gap-3 items-center">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </section>

          <section aria-labelledby="ds-prim-inputs" className="flex flex-col gap-3">
            <SectionHeading id="ds-prim-inputs">{COPY.primitives.inputs}</SectionHeading>
            <div className="flex flex-col gap-3 max-w-md">
              <Input type="text" placeholder="Text input" />
              <Input type="text" placeholder="Disabled" disabled />
            </div>
          </section>

          <section aria-labelledby="ds-prim-callouts" className="flex flex-col gap-3">
            <SectionHeading id="ds-prim-callouts">{COPY.primitives.callouts}</SectionHeading>
            <div className="grid gap-3 sm:grid-cols-2">
              <Callout intent="neutral" title="Neutral">
                Supporting copy for neutral intent.
              </Callout>
              <Callout intent="info" title="Info">
                Supporting copy for informational intent.
              </Callout>
              <Callout intent="warning" title="Warning">
                Supporting copy for warning intent.
              </Callout>
              <Callout intent="danger" title="Danger">
                Supporting copy for danger intent.
              </Callout>
              <Callout intent="success" title="Success">
                Supporting copy for success intent.
              </Callout>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="patterns" className="m-0">
          <AdminDesignSystemPatternsShowcase />
        </TabsContent>

        <TabsContent value="tooling" className="flex flex-col gap-6 m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">{COPY.sections.tokens.heading}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm ds-text-secondary leading-relaxed pt-0">
              <p className="m-0">{COPY.sections.tokens.body}</p>
              <ul className="mt-3 mb-0 pl-5 list-disc font-mono text-[length:var(--text-2xs)] ds-text-tertiary space-y-1">
                <li>{MANIFEST.canonicalRepoPaths.cssTokenSource}</li>
                <li>{MANIFEST.canonicalRepoPaths.tsTokenFacades}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">{COPY.sections.components.heading}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm ds-text-secondary leading-relaxed pt-0">
              <p className="m-0">{COPY.sections.components.body}</p>
              <ul className="mt-3 mb-0 pl-5 list-disc font-mono text-[length:var(--text-2xs)] ds-text-tertiary space-y-1">
                {MANIFEST.canonicalRepoPaths.uiPrimitives.map((p) => (
                  <li key={p}>{p}</li>
                ))}
                <li>{MANIFEST.canonicalRepoPaths.patterns}</li>
                <li>{MANIFEST.canonicalRepoPaths.patternCssBridges}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">{COPY.sections.enforcement.heading}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm ds-text-secondary leading-relaxed pt-0">
              <p className="m-0">{COPY.sections.enforcement.body}</p>
              <dl className="mt-4 m-0 grid gap-2 font-mono text-[length:var(--text-2xs)] ds-text-tertiary">
                {Object.entries(MANIFEST.enforcementCommands).map(([k, cmd]) => (
                  <div key={k} className="flex flex-col gap-0.5">
                    <dt className="font-sans text-[length:var(--text-2xs)] uppercase tracking-wide ds-text-quaternary">
                      {k}
                    </dt>
                    <dd className="m-0">{cmd}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">{COPY.sections.hardcode.heading}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm ds-text-secondary leading-relaxed pt-0 flex flex-col gap-4">
              <p className="m-0">{COPY.sections.hardcode.body}</p>
              <ul className="m-0 pl-0 list-none flex flex-col gap-4">
                {MANIFEST.knownHardcodeOrDriftBuckets.map((b) => (
                  <li key={b.id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
                    <p className="m-0 font-mono text-[length:var(--text-2xs)] font-semibold ds-text-primary">{b.id}</p>
                    <p className="mt-1 mb-2 m-0">{b.summary}</p>
                    <ul className="m-0 pl-5 list-disc font-mono text-[length:var(--text-2xs)] ds-text-tertiary space-y-1">
                      {b.paths.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="machine" className="flex flex-col gap-3 m-0">
          <h2 className="text-base font-semibold m-0 scroll-mt-8">{COPY.machineBlockTitle}</h2>
          <p className="text-[length:var(--text-2xs)] m-0 ds-text-quaternary">{COPY.machineBlockHint}</p>
          <pre className="m-0 p-4 rounded-lg border border-border bg-muted/40 text-[length:var(--text-2xs)] font-mono overflow-x-auto ds-admin-design-system-json-scroll whitespace-pre-wrap break-words">
            {json}
          </pre>
          <MachineManifestScript json={json} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
