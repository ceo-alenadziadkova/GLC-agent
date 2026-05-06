import { Link } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import { marketingHeroBillboardMotion } from '../../config/marketing-motion-variants';
import { cn } from '../../components/ui/utils';
import { Button } from '../../components/ui/button';
import { MARKETING_MOTION_EASE_BILLBOARD, MARKETING_PACKAGE_HERO_3D } from '../../config/marketing-motion';
import {
  MARKETING_COVERAGE_GRID_CELL,
  MARKETING_COVERAGE_GRID_LABEL,
} from '../../config/marketing-surface-tokens';
import workspacePackaging from '../../locales/en/marketing-workspace-packaging.en.json';

const TIER_ACTIVE_CELLS: Record<'focus' | 'context' | 'strategy', number> = {
  focus: 1,
  context: 3,
  strategy: 6,
};
const HERO_LABELS = workspacePackaging.package_hero_labels;
const COVERAGE_DOMAIN_LABELS = HERO_LABELS.domains;

const TIER_BADGE_CLASS: Record<'focus' | 'context' | 'strategy', string> = {
  focus: 'ds-marketing-package-badge-focus',
  context: 'ds-marketing-package-badge-context',
  strategy: 'ds-marketing-package-badge-strategy',
};

function TierCoverageDecor({ tier }: { tier: 'focus' | 'context' | 'strategy' }) {
  const active = TIER_ACTIVE_CELLS[tier];
  return (
    <div className="ds-marketing-glass-hero-coverage relative mx-auto mt-12" aria-hidden>
      <div className="ds-marketing-glass-hero-coverage-box">
        <p className="ds-marketing-text-muted text-xs font-semibold uppercase tracking-wider">
          {HERO_LABELS.coverageShape}
        </p>
        <div className="mt-8 grid grid-cols-3 gap-3">
          {COVERAGE_DOMAIN_LABELS.map((label, i) => (
            <motion.div
              key={label}
              className="aspect-square rounded-xl border p-2"
              style={
                i < active
                  ? { ...MARKETING_COVERAGE_GRID_CELL.base, ...MARKETING_COVERAGE_GRID_CELL.active }
                  : MARKETING_COVERAGE_GRID_CELL.base
              }
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.22, ease: [...MARKETING_MOTION_EASE_BILLBOARD] }}
            >
              <span
                className="flex h-full items-center justify-center text-center text-xs font-medium leading-tight"
                style={i < active ? MARKETING_COVERAGE_GRID_LABEL.active : MARKETING_COVERAGE_GRID_LABEL.inactive}
              >
                {label}
              </span>
            </motion.div>
          ))}
        </div>
        <span
          className={cn(
            'mt-8 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
            TIER_BADGE_CLASS[tier],
          )}
        >
          {tier}
        </span>
        <p className="ds-marketing-text-muted mt-6 text-sm leading-relaxed">
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
  const d3 = MARKETING_PACKAGE_HERO_3D;

  return (
    <div className={cn('relative -mx-4 flex flex-col items-center overflow-hidden px-4 text-center sm:-mx-6 sm:px-6', pad)}>
      <motion.div
        className="relative z-20 mx-auto flex w-full max-w-[var(--marketing-max-w-content)] flex-col items-center"
        variants={mv.container}
        initial={reduce ? false : 'hidden'}
        animate="visible"
      >
        <div className="flex min-w-0 w-full flex-col items-center">
          <motion.div
            variants={mv.item}
            className="ds-marketing-eyebrow-chip mb-8 sm:text-xs"
          >
            <div className="ds-marketing-eyebrow-shimmer" />
            <span className="relative z-10 flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-[var(--glc-blue)]" />
              {eyebrow}
            </span>
          </motion.div>
          <motion.h1 variants={mv.item} className="text-[var(--text-primary)] mt-2">
            <span className="ds-marketing-hero-display-title">{title}</span>
          </motion.h1>
          <motion.p
            variants={mv.item}
            className="ds-marketing-text-muted mt-8 max-w-[60ch] text-lg font-medium leading-relaxed sm:text-xl"
          >
            {lead}
          </motion.p>
          <motion.div variants={mv.item} className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Button
              asChild
              variant="default"
              className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full border border-white/20 bg-white/10 px-8 py-6 text-sm font-medium text-[var(--text-primary)] backdrop-blur-md transition-all duration-300 hover:bg-white/20 sm:w-auto"
            >
              <Link to="/brief" className="no-underline relative z-10 w-full sm:w-auto">
                <div className="ds-marketing-cta-glow-sweep" />
                {HERO_LABELS.startWithBrief}
              </Link>
            </Button>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="ds-marketing-package-hero-chip inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold tracking-wide">
                {HERO_LABELS.firstFindings}
              </span>
              <span className="ds-marketing-package-hero-chip inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold tracking-wide">
                {HERO_LABELS.explicitScope}
              </span>
            </div>
          </motion.div>
        </div>
        <motion.div
          variants={mv.item}
          className="ds-marketing-glass-hero-tilt-wrap relative z-10 w-full"
          style={{ perspective: d3.perspectivePx }}
        >
          <motion.div
            className="ds-marketing-glass-hero-tilt-inner"
            initial={false}
            animate={{
              rotateX: reduce ? 0 : d3.decorTiltRotateXDeg,
              scale: reduce ? 1 : d3.decorTiltScale,
            }}
            transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 0.8 }}
          >
            <TierCoverageDecor tier={tier} />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
