import type { CSSProperties } from 'react';
import type { Icon } from '@phosphor-icons/react';
import {
  CurrencyCircleDollar,
  Clock,
  Eye,
  Warning,
  TrendUp,
} from '@phosphor-icons/react';
import { DISCOVER_HOOK_ACCENT_TOKEN } from '../../../config/discover-hook-accent-tokens';
import type { DiscoveryFinding } from '../../../lib/discovery-flow';
import discoverResultsUi from '../../../locales/en/discover-page-results-ui.en.json';
import { splitFindingDetail } from '../services';

const HOOK_ICONS: Record<DiscoveryFinding['hook'], Icon> = {
  revenue: CurrencyCircleDollar,
  time: Clock,
  visibility: Eye,
  risk: Warning,
  scale: TrendUp,
};

const hookMetaJson = discoverResultsUi.hookMeta as Record<
  DiscoveryFinding['hook'],
  { label: string; color: string }
>;

const HOOK_META: Record<
  DiscoveryFinding['hook'],
  { Icon: Icon; label: string; color: string }
> = {
  revenue: { Icon: HOOK_ICONS.revenue, ...hookMetaJson.revenue },
  time: { Icon: HOOK_ICONS.time, ...hookMetaJson.time },
  visibility: { Icon: HOOK_ICONS.visibility, ...hookMetaJson.visibility },
  risk: { Icon: HOOK_ICONS.risk, ...hookMetaJson.risk },
  scale: { Icon: HOOK_ICONS.scale, ...hookMetaJson.scale },
};

export function FindingCard({ finding }: { finding: DiscoveryFinding }) {
  const isHigh = finding.impact === 'high';
  const meta = HOOK_META[finding.hook];
  const fc = discoverResultsUi.findingCard;
  return (
    <div
      className="ds-discover-finding-card min-w-0 max-w-full overflow-hidden p-5 sm:p-6 md:p-7"
      style={
        {
          ['--finding-card-bg']: isHigh ? fc.highBackground : fc.mediumBackground,
          ['--finding-card-border-color']: isHigh ? fc.highBorder : fc.mediumBorder,
        } as CSSProperties
      }
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span
          className="ds-discover-finding-zone-badge text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-lg"
          style={
            {
              ['--zone-badge-bg']: fc.zoneBadgeBackground,
              ['--zone-badge-border-color']: fc.zoneBadgeBorder,
              ['--zone-badge-text-color']: isHigh ? fc.zoneTextHigh : fc.zoneTextMedium,
            } as CSSProperties
          }
        >
          {finding.zone}
        </span>
        {isHigh && (
          <Warning
            size={16}
            weight="fill"
            className="shrink-0 text-[var(--warning-icon-color)]"
            style={{ ['--warning-icon-color']: fc.warningIcon } as CSSProperties}
            aria-hidden
          />
        )}
      </div>
      <h2
        className="mb-3 break-words text-pretty text-[length:var(--text-xl)] font-semibold leading-[1.38] text-[var(--finding-headline-color)]"
        style={{ ['--finding-headline-color']: fc.headline } as CSSProperties}
      >
        {finding.headline}
      </h2>
      <div className="mx-auto w-full max-w-[65ch] space-y-4">
        {splitFindingDetail(finding.detail).map((chunk, index) => (
          <p
            key={index}
            className="break-words text-pretty text-[length:var(--discover-finding-detail-size)] leading-[var(--leading-discover-finding-detail)] text-[var(--finding-body-color)]"
            style={{ ['--finding-body-color']: fc.body } as CSSProperties}
          >
            {chunk}
          </p>
        ))}
      </div>
      <div
        className="ds-discover-finding-hook-row mt-5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 sm:px-3.5 sm:py-3"
        style={
          {
            ['--hook-row-bg']: fc.hookRowBackground,
            ['--hook-row-border-color']: fc.hookRowBorder,
            ['--hook-accent']: DISCOVER_HOOK_ACCENT_TOKEN[finding.hook],
          } as CSSProperties
        }
      >
        <meta.Icon size={20} weight="fill" className="text-[var(--hook-accent)]" aria-hidden />
        <span className="text-[length:var(--discover-finding-hook-label-size)] font-bold tracking-[var(--tracking-discover-finding-hook)] text-[var(--hook-accent)]">
          {meta.label}
        </span>
      </div>
    </div>
  );
}
