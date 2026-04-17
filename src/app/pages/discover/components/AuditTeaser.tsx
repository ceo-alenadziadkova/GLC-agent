import type { CSSProperties } from 'react';
import type { Icon } from '@phosphor-icons/react';
import {
  Gear,
  ChartLine,
  MagnifyingGlass,
  Robot,
} from '@phosphor-icons/react';
import { DISCOVERY_RESULTS_TEASER } from '@glc/intake-core';
import { DISCOVERY_INDUSTRY_TEASER_ICONS } from '../../../lib/discovery-industry-teaser-icons';
import discoverResultsUi from '../../../data/discover-page-results-ui.en.json';

export function AuditTeaser({ industry }: { industry: string | null }) {
  const industryCopy = DISCOVERY_RESULTS_TEASER.industryTeaser;
  const specific =
    industry && industryCopy[industry]
      ? {
          Icon: DISCOVERY_INDUSTRY_TEASER_ICONS[industry] ?? Robot,
          text: industryCopy[industry] as string,
        }
      : null;
  const teaserIcons = [Gear, ChartLine, MagnifyingGlass] as const;
  const bullets: { Icon: Icon; text: string }[] = discoverResultsUi.teaserBullets.map((text, index) => ({
    Icon: teaserIcons[index] ?? Robot,
    text,
  }));
  bullets.push(specific ?? { Icon: Robot, text: DISCOVERY_RESULTS_TEASER.defaultFourthBullet });
  const teaserUi = discoverResultsUi.teaser;

  return (
    <div
      className="min-w-0 max-w-full overflow-hidden rounded-2xl p-5 sm:p-6 ds-audit-teaser-panel"
      style={
        {
          ['--audit-teaser-panel-bg' as string]: teaserUi.panelBackground,
          ['--audit-teaser-panel-border' as string]: teaserUi.panelBorder,
          ['--audit-teaser-section-label' as string]: teaserUi.sectionLabel,
          ['--audit-teaser-bullet-text' as string]: teaserUi.bulletText,
        } as CSSProperties
      }
    >
      <p className="font-semibold uppercase tracking-widest mb-4 break-words ds-audit-teaser-section-label">
        {discoverResultsUi.teaserHeading}
      </p>
      <div className="space-y-4">
        {bullets.map(({ Icon, text }, index) => (
          <div key={index} className="flex min-w-0 items-start gap-3">
            <Icon size={18} weight="fill" className="mt-0.5 shrink-0" color={teaserUi.bulletIcon} />
            <p className="min-w-0 break-words text-pretty ds-audit-teaser-bullet-text">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
