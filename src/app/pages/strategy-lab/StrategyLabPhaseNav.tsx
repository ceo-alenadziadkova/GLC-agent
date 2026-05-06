import { STRATEGY_LAB_PAGE_ANCHORS } from '../../config/strategy-lab';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { cn } from '../../components/ui/utils';

const jumpClass =
  'text-primary focus-visible:ring-ring underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2';

/**
 * In-page hash navigation for the three Strategy Lab IA phases (consultant).
 */
export function StrategyLabPhaseNav() {
  const c = STRATEGY_LAB_COPY.iaPhasesNav;
  const items = [
    { id: STRATEGY_LAB_PAGE_ANCHORS.definePhase, label: c.defineLinkLabel },
    { id: STRATEGY_LAB_PAGE_ANCHORS.shapePack, label: c.shapeLinkLabel },
    { id: STRATEGY_LAB_PAGE_ANCHORS.planSetup, label: c.publishLinkLabel },
  ] as const;

  return (
    <nav aria-label={c.ariaLabel} className="bg-muted/50 border-border border-b px-4 py-3">
      <p className="text-muted-foreground mb-3 max-w-prose text-xs leading-relaxed">{c.intro}</p>
      <ul className="flex list-none flex-wrap gap-2 p-0 m-0">
        {items.map((item, i) => (
          <li key={item.id} className="flex items-center gap-2 text-xs font-semibold">
            {i > 0 ? <span className="text-muted-foreground" aria-hidden>·</span> : null}
            <a className={cn(jumpClass)} href={`#${item.id}`}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
