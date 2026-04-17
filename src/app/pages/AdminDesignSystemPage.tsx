import { useMemo } from 'react';
import { AppShell } from '../components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DESIGN_SYSTEM_INTERNAL_PAGE_COPY } from '../config/design-system-internal-page-copy.en';
import { DESIGN_SYSTEM_INTERNAL_MANIFEST } from '../data/design-system-internal-manifest';

const COPY = DESIGN_SYSTEM_INTERNAL_PAGE_COPY;
const MANIFEST = DESIGN_SYSTEM_INTERNAL_MANIFEST;

function MachineManifestScript({ json }: { json: string }) {
  return (
    <script
      id="glc-design-system-internal-manifest"
      type="application/json"
      // JSON.stringify output is safe for text/script context (no HTML unescaped).
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

export function AdminDesignSystemPage() {
  const json = useMemo(() => JSON.stringify(MANIFEST, null, 2), []);

  const docEntries = Object.entries(COPY.docLinks) as [keyof typeof COPY.docLinks, string][];

  return (
    <AppShell title={COPY.title} subtitle={COPY.subtitle}>
      <main className="px-7 py-6 max-w-4xl flex flex-col gap-6">
        <p className="text-sm m-0 ds-text-secondary leading-relaxed">{COPY.intro}</p>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">{COPY.sections.spec.heading}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm ds-text-secondary leading-relaxed flex flex-col gap-3 pt-0">
            <p className="m-0">{COPY.sections.spec.body}</p>
            <ul className="m-0 pl-5 list-disc font-mono text-xs ds-text-tertiary space-y-1">
              {docEntries.map(([key, path]) => (
                <li key={key}>
                  <span className="sr-only">{key}</span>
                  {path}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">{COPY.sections.tokens.heading}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm ds-text-secondary leading-relaxed pt-0">
            <p className="m-0">{COPY.sections.tokens.body}</p>
            <ul className="mt-3 mb-0 pl-5 list-disc font-mono text-xs ds-text-tertiary space-y-1">
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
            <ul className="mt-3 mb-0 pl-5 list-disc font-mono text-xs ds-text-tertiary space-y-1">
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
            <dl className="mt-4 m-0 grid gap-2 font-mono text-xs ds-text-tertiary">
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
                  <p className="m-0 font-mono text-xs font-semibold ds-text-primary">{b.id}</p>
                  <p className="mt-1 mb-2 m-0">{b.summary}</p>
                  <ul className="m-0 pl-5 list-disc font-mono text-xs ds-text-tertiary space-y-1">
                    {b.paths.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <section aria-labelledby="ds-internal-machine-heading" className="flex flex-col gap-2">
          <h2 id="ds-internal-machine-heading" className="text-base font-semibold m-0 scroll-mt-8">
            {COPY.machineBlockTitle}
          </h2>
          <p className="text-xs m-0 ds-text-quaternary">{COPY.machineBlockHint}</p>
          <pre className="m-0 p-4 rounded-lg border border-border bg-muted/40 text-xs font-mono overflow-x-auto ds-admin-design-system-json-scroll whitespace-pre-wrap break-words">
            {json}
          </pre>
        </section>

        <MachineManifestScript json={json} />
      </main>
    </AppShell>
  );
}
