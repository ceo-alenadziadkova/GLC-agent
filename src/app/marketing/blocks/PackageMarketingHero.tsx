import { Link } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import { marketingHeroBillboardMotion } from '../../config/marketing-motion-variants';
import { cn } from '../../components/ui/utils';
import { Button } from '../../components/ui/button';
import workspacePackaging from '../../data/marketing-workspace-packaging.en.json';

const TIER_ACTIVE_CELLS: Record<'focus' | 'context' | 'strategy', number> = {
  focus: 1,
  context: 3,
  strategy: 6,
};
const HERO_LABELS = workspacePackaging.package_hero_labels;
const COVERAGE_DOMAIN_LABELS = HERO_LABELS.domains;

function TierCoverageDecor({ tier }: { tier: 'focus' | 'context' | 'strategy' }) {
  const active = TIER_ACTIVE_CELLS[tier];
  const badgeClass =
    tier === 'focus'
      ? 'ds-marketing-package-badge-focus'
      : tier === 'context'
        ? 'ds-marketing-package-badge-context'
        : 'ds-marketing-package-badge-strategy';
  return (
    <div className="relative ds-package-marketing-hero-cover" aria-hidden>
      <div className="ds-package-marketing-hero-card rounded-[var(--radius-2xl)] border p-6 shadow-[var(--shadow-xs)]">
        <p className="text-[length:var(--text-2xs)] font-semibold uppercase tracking-wider ds-text-tertiary" >
          {HERO_LABELS.coverageShape}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {COVERAGE_DOMAIN_LABELS.map((label, i) => (
            <motion.div
              key={label}
              className={cn(
                'aspect-square rounded-md border p-1 ds-marketing-coverage-cell',
                i < active && 'ds-marketing-coverage-cell--active',
              )}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className={cn(
                  'flex h-full items-center justify-center text-center text-[length:var(--text-2xs)] font-semibold leading-tight',
                  i < active ? 'ds-marketing-coverage-label-active' : 'ds-marketing-coverage-label-inactive',
                )}
              >
                {label}
              </span>
            </motion.div>
          ))}
        </div>
        <span
          className={cn(
            'mt-4 inline-flex rounded-full border px-2.5 py-1 text-[length:var(--text-2xs)] font-semibold uppercase tracking-wide',
            badgeClass,
          )}
        >
          {tier}
        </span>
        <p className="mt-4 text-xs leading-relaxed ds-text-tertiary" >
          {HERO_LABELS.illustrativeGridNote}
        </p>
      </div>
    </div>
  );
}

/**
 * Premium marketing hero for Focus / Context / Strategy package landing pages.
 */
export function PackageMarketingHero({
  tier,
  eyebrow,
  title,
  lead,
  heroPaddingClassName,
}: {
  tier: 'focus' | 'context' | 'strategy';
  eyebrow: string;
  title: string;
  lead: string;
  /** Overrides default vertical padding (per PACKAGE_PAGE_LAYOUT). */
  heroPaddingClassName?: string;
}) {
  const reduce = useReducedMotion();
  const mv = marketingHeroBillboardMotion(reduce);
  const pad =
    heroPaddingClassName ?? 'pb-12 pt-4 sm:pb-16 sm:pt-8';

  return (
    <div className={cn('relative -mx-4 overflow-hidden px-4 sm:-mx-6 sm:px-6', pad)}>
      <motion.div
        className="relative ds-package-marketing-hero-grid"
        variants={mv.container}
        initial={reduce ? false : 'hidden'}
        animate="visible"
      >
        <div className="min-w-0 max-w-4xl">
          <motion.p
            variants={mv.item}
            className="ds-home-hero-eyebrow-chip mb-5 inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold uppercase ds-tracking-marketing-eyebrow sm:text-xs"
          >
            {eyebrow}
          </motion.p>
          <motion.h1
            variants={mv.item}
            className="ds-package-marketing-hero-title"
          >
            {title}
          </motion.h1>
          <motion.p
            variants={mv.item}
            className="mt-6 max-w-[65ch] text-base leading-[1.65] sm:text-lg ds-text-secondary"
          >
            {lead}
          </motion.p>
          <motion.div variants={mv.item} className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
            <Button
              asChild
              variant="default"
              className="ds-cta-primary inline-flex w-full items-center justify-center gap-2 text-sm font-semibold sm:w-auto"
            >
              <Link to="/brief" className="no-underline">
                {HERO_LABELS.startWithBrief}
              </Link>
            </Button>
            <div className="flex flex-wrap gap-2">
              <span className="ds-marketing-package-hero-chip inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold">
                {HERO_LABELS.firstFindings}
              </span>
              <span className="ds-marketing-package-hero-chip inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold">
                {HERO_LABELS.explicitScope}
              </span>
            </div>
          </motion.div>
        </div>
        <motion.div variants={mv.item}>
          <TierCoverageDecor tier={tier} />
        </motion.div>
      </motion.div>
    </div>
  );
}
