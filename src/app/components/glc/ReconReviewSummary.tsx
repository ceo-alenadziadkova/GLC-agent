import { useMemo, useState } from 'react';
import type { ReconData } from '../../data/auditTypes';
import type { PipelineMonitorCopy } from '../../config/pipeline-monitor-copy';
import { RECON_REVIEW_SUMMARY_POLICY } from '../../config/recon-review-summary-policy';
import { Callout } from '../../../design-system/ui';
import { SectionLabel } from './SectionLabel';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

export type ReconReviewSummaryCopy = PipelineMonitorCopy['reviewModal']['recon'];

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

function formatListLabel(label: string, value: string | null | undefined): { label: string; value: string } | null {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return null;
  return { label, value: v };
}

export function ReconReviewSummary({
  recon,
  copy,
  showCrawlerTruncationWarning,
}: {
  recon: ReconData | null;
  copy: ReconReviewSummaryCopy;
  showCrawlerTruncationWarning: boolean;
}) {
  const [showAllPages, setShowAllPages] = useState(false);

  const pages = recon?.pages_crawled ?? [];
  const totalPages = pages.length;
  const visibleLimit = RECON_REVIEW_SUMMARY_POLICY.initialCrawledPagesVisible;
  const visiblePages = showAllPages || totalPages <= visibleLimit ? pages : pages.slice(0, visibleLimit);

  const techEntries = useMemo(() => {
    const stack = recon?.tech_stack ?? {};
    return Object.entries(stack).filter(([, values]) => Array.isArray(values) && values.length > 0);
  }, [recon?.tech_stack]);

  const socialEntries = useMemo(() => {
    const sp = recon?.social_profiles ?? {};
    return Object.entries(sp).filter(([, url]) => typeof url === 'string' && url.trim().length > 0);
  }, [recon?.social_profiles]);

  const hasContacts =
    (recon?.contact_info?.emails?.length ?? 0) > 0 ||
    (recon?.contact_info?.phones?.length ?? 0) > 0 ||
    (recon?.contact_info?.addresses?.length ?? 0) > 0;

  const profileRows = useMemo(() => {
    if (!recon) return [];
    return [
      formatListLabel(copy.labelCompany, recon.company_name),
      formatListLabel(copy.labelIndustry, recon.industry),
      formatListLabel(copy.labelLocation, recon.location),
      recon.languages?.length
        ? { label: copy.labelLanguages, value: recon.languages.join(', ') }
        : null,
    ].filter((row): row is { label: string; value: string } => row != null);
  }, [recon, copy]);

  if (!recon) {
    return (
      <Callout intent="warning" title={copy.missingDataTitle}>
        {copy.missingDataBody}
      </Callout>
    );
  }

  return (
    <div className="space-y-4">
      <Callout intent="info" title={copy.introTitle}>
        {copy.introBody}
      </Callout>

      {showCrawlerTruncationWarning ? (
        <Callout intent="warning" title={copy.truncationWarningTitle}>
          {copy.truncationWarningBody}
        </Callout>
      ) : null}

      <Callout intent="neutral" title={copy.extractionNoteTitle}>
        {copy.extractionNoteBody}
      </Callout>

      {profileRows.length > 0 ? (
        <div className="glc-card rounded-xl border p-4">
          <SectionLabel className="mb-2.5">{copy.sectionProfile}</SectionLabel>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            {profileRows.map(row => (
              <div key={row.label} className="min-w-0 sm:col-span-1">
                <dt className="text-muted-foreground text-[length:var(--text-2xs)] font-semibold uppercase tracking-wide">
                  {row.label}
                </dt>
                <dd className="text-foreground mt-0.5 text-sm leading-snug break-words">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div className="glc-card rounded-xl border p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <SectionLabel>{copy.sectionCrawl}</SectionLabel>
          <span className="text-muted-foreground text-xs font-medium">
            {interpolate(copy.crawlCount, { count: totalPages })}
          </span>
        </div>
        {totalPages === 0 ? (
          <p className="text-muted-foreground text-xs">{copy.emptyPages}</p>
        ) : (
          <>
            <div
              className={cn(
                'space-y-2 overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-2',
                RECON_REVIEW_SUMMARY_POLICY.crawledPagesListMaxHeightClassName,
              )}
            >
              {visiblePages.map(page => {
                const chips = page.structured_data ?? [];
                const maxChips = RECON_REVIEW_SUMMARY_POLICY.maxStructuredDataChipsPerPage;
                const shownChips = chips.slice(0, maxChips);
                const moreChips = chips.length - shownChips.length;
                const h1Lines = (page.h1 ?? []).slice(0, RECON_REVIEW_SUMMARY_POLICY.maxH1LinesPerPage);
                const meta =
                  typeof page.meta_description === 'string' && page.meta_description.trim().length > 0
                    ? page.meta_description.trim()
                    : copy.pageMetaNone;
                return (
                  <div
                    key={page.url}
                    className="border-[var(--border-subtle)] space-y-1.5 border-b pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-foreground text-sm font-semibold underline-offset-2 hover:underline"
                      >
                        {page.title?.trim() || page.url}
                      </a>
                      <p className="text-muted-foreground mt-0.5 break-all text-[length:var(--text-2xs)]">{page.url}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="font-mono text-[length:var(--text-2xs)]">
                        {interpolate(copy.httpStatusLabel, { status: page.status })}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">{meta}</p>
                    {h1Lines.length > 0 ? (
                      <ul className="text-muted-foreground list-inside list-disc text-xs leading-relaxed">
                        {h1Lines.map((line, i) => (
                          <li key={`${page.url}-h1-${i}`} className="break-words">
                            {line}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {shownChips.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {shownChips.map(chip => (
                          <Badge key={`${page.url}-${chip}`} variant="outline" className="text-[length:var(--text-2xs)]">
                            {chip}
                          </Badge>
                        ))}
                        {moreChips > 0 ? (
                          <Badge variant="outline" className="text-[length:var(--text-2xs)]">
                            {interpolate(copy.structuredDataMore, { count: moreChips })}
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {totalPages > visibleLimit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-auto px-2 py-1 text-xs font-semibold"
                onClick={() => setShowAllPages(v => !v)}
              >
                {showAllPages
                  ? copy.showFewerPages
                  : interpolate(copy.showMorePages, { count: totalPages })}
              </Button>
            ) : null}
          </>
        )}
      </div>

      <div className="glc-card rounded-xl border p-4">
        <SectionLabel className="mb-2.5">{copy.sectionTech}</SectionLabel>
        {techEntries.length === 0 ? (
          <p className="text-muted-foreground text-xs">{copy.emptyTech}</p>
        ) : (
          <div className="space-y-2">
            {techEntries.map(([category, values]) => (
              <div key={category}>
                <p className="text-foreground text-xs font-semibold capitalize">{category.replaceAll('_', ' ')}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {values.map(v => (
                    <Badge key={`${category}-${v}`} variant="secondary" className="text-[length:var(--text-2xs)]">
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glc-card rounded-xl border p-4">
        <SectionLabel className="mb-2.5">{copy.sectionContact}</SectionLabel>
        {!hasContacts && socialEntries.length === 0 ? (
          <p className="text-muted-foreground text-xs">{copy.emptyContact}</p>
        ) : (
          <div className="space-y-2 text-xs">
            {recon.contact_info?.emails?.length ? (
              <div>
                <p className="text-muted-foreground font-semibold">{copy.labelEmail}</p>
                <ul className="text-foreground mt-0.5 list-inside list-disc break-all">
                  {recon.contact_info.emails.map(e => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {recon.contact_info?.phones?.length ? (
              <div>
                <p className="text-muted-foreground font-semibold">{copy.labelPhone}</p>
                <ul className="text-foreground mt-0.5 list-inside list-disc">
                  {recon.contact_info.phones.map(p => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {recon.contact_info?.addresses?.length ? (
              <div>
                <p className="text-muted-foreground font-semibold">{copy.labelAddress}</p>
                <ul className="text-foreground mt-0.5 list-inside list-disc">
                  {recon.contact_info.addresses.map(a => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {socialEntries.length > 0 ? (
              <div>
                <p className="text-muted-foreground font-semibold">{copy.labelSocial}</p>
                <ul className="mt-0.5 space-y-1">
                  {socialEntries.map(([network, url]) => (
                    <li key={network}>
                      <span className="text-foreground capitalize">{network.replaceAll('_', ' ')}: </span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--glc-blue)] break-all underline-offset-2 hover:underline"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {recon.brief?.trim() ? (
        <div className="glc-card rounded-xl border p-4">
          <SectionLabel className="mb-2">{copy.sectionBrief}</SectionLabel>
          <pre className="text-muted-foreground max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-sans text-xs leading-relaxed">
            {recon.brief.trim()}
          </pre>
        </div>
      ) : null}

      {recon.interview_answers?.trim() ? (
        <div className="glc-card rounded-xl border p-4">
          <SectionLabel className="mb-2">{copy.sectionInterview}</SectionLabel>
          <pre className="text-muted-foreground max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-sans text-xs leading-relaxed">
            {recon.interview_answers.trim()}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
