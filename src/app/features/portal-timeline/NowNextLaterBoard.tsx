import { useMemo } from 'react';

import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';

const BUCKETS = ['now', 'next', 'later'] as const;
type TimeBucket = (typeof BUCKETS)[number];

function bucketLabel(b: TimeBucket): string {
  if (b === 'now') return ORCHESTRATION_UI_COPY.nowNextLaterNow;
  if (b === 'next') return ORCHESTRATION_UI_COPY.nowNextLaterNext;
  return ORCHESTRATION_UI_COPY.nowNextLaterLater;
}

/**
 * Primary surface: group pack graph nodes by `time_bucket` (Now / Next / Later).
 */
export function NowNextLaterBoard(args: { pack: GlcOrchestrationPackView }) {
  const grouped = useMemo(() => {
    const m: Record<TimeBucket, { id: string; title: string }[]> = {
      now: [],
      next: [],
      later: [],
    };
    for (const n of args.pack.graph.nodes) {
      const b = n.time_bucket ?? 'later';
      const bucket: TimeBucket = b === 'now' || b === 'next' ? b : 'later';
      m[bucket].push({ id: n.id, title: n.title });
    }
    return m;
  }, [args.pack]);

  return (
    <div className="space-y-6" data-testid="now-next-later-board">
      {BUCKETS.map(bucket => (
        <section key={bucket} aria-label={bucketLabel(bucket)}>
          <h3 className="text-sm font-semibold ds-text-primary">{bucketLabel(bucket)}</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm ds-text-secondary">
            {grouped[bucket].length === 0 ? (
              <li className="list-none pl-0 text-xs ds-text-tertiary">{ORCHESTRATION_UI_COPY.nowNextLaterEmpty}</li>
            ) : (
              grouped[bucket].map(item => (
                <li key={item.id} className="pl-0">
                  {item.title}
                </li>
              ))
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
