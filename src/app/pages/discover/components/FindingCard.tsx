import type { Icon } from '@phosphor-icons/react';
import {
  CurrencyCircleDollar,
  Clock,
  Eye,
  Warning,
  TrendUp,
} from '@phosphor-icons/react';
import type { DiscoveryFinding } from '../../../lib/discovery-flow';
import discoverResultsUi from '../../../data/discover-page-results-ui.en.json';
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
      className="min-w-0 max-w-full overflow-hidden rounded-2xl p-5 sm:p-6 md:p-7"
      style={{
        background: isHigh ? fc.highBackground : fc.mediumBackground,
        border: isHigh ? `1px solid ${fc.highBorder}` : `1px solid ${fc.mediumBorder}`,
        boxSizing: 'border-box',
      }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span
          className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-lg"
          style={{
            background: fc.zoneBadgeBackground,
            color: isHigh ? fc.zoneTextHigh : fc.zoneTextMedium,
            border: `1px solid ${fc.zoneBadgeBorder}`,
          }}
        >
          {finding.zone}
        </span>
        {isHigh && (
          <Warning
            size={16}
            weight="fill"
            className="flex-shrink-0"
            style={{ color: fc.warningIcon }}
            aria-hidden
          />
        )}
      </div>
      <h2
        className="mb-3 break-words text-pretty"
        style={{ fontSize: '1.25rem', fontWeight: 600, color: fc.headline, lineHeight: 1.38 }}
      >
        {finding.headline}
      </h2>
      <div className="mx-auto w-full max-w-[65ch] space-y-4">
        {splitFindingDetail(finding.detail).map((chunk, index) => (
          <p
            key={index}
            className="break-words text-pretty"
            style={{
              fontSize: '1.125rem',
              color: fc.body,
              lineHeight: 1.8,
              overflowWrap: 'anywhere',
            }}
          >
            {chunk}
          </p>
        ))}
      </div>
      <div
        className="mt-5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 sm:px-3.5 sm:py-3"
        style={{
          background: fc.hookRowBackground,
          border: `1px solid ${fc.hookRowBorder}`,
        }}
      >
        <meta.Icon size={20} weight="fill" style={{ color: meta.color, opacity: 1 }} aria-hidden />
        <span style={{ fontSize: '0.875rem', color: meta.color, fontWeight: 700, letterSpacing: '0.02em' }}>
          {meta.label}
        </span>
      </div>
    </div>
  );
}
