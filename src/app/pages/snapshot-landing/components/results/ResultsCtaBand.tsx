import { ArrowRight } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { APP_ROUTE_PATHS } from '../../../../config/route-paths';
import { SNAPSHOT_LANDING_HERO_COPY } from '../../../../config/snapshot-landing-copy.en';
import { Button } from '../../../../components/ui/button';

export function ResultsCtaBand(props: { quotaHint: string; reset: () => void }) {
  const { quotaHint, reset } = props;

  return (
    <div
      className="glc-snapshot-cta-band overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--overlay-white-09)] bg-[var(--gradient-ink-rich)] p-6 text-center shadow-[var(--shadow-ink)] mobile:p-5 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:p-8 lg:text-left"
    >
      <div className="relative z-[1] min-w-0 flex-1">
        {quotaHint && (
          <p className="mb-3 text-xs text-white/55 lg:mb-2">
            {quotaHint}
          </p>
        )}
        <h3
          className="text-[length:var(--text-xl)] [font-family:var(--font-display)] font-bold tracking-[var(--tracking-tight)] text-[var(--text-inverse)]"
        >
          {SNAPSHOT_LANDING_HERO_COPY.fullPictureTitle}
        </h3>
        <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-white/75 lg:mt-2">
          {SNAPSHOT_LANDING_HERO_COPY.fullPictureBody}
        </p>
      </div>
      <div className="relative z-[1] mt-5 flex w-full shrink-0 flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:mt-0 lg:w-auto lg:flex-col lg:items-stretch">
        <Button asChild variant="default" className="w-auto min-w-[12rem] justify-center mobile:min-h-12 mobile:w-full lg:w-full">
          <Link to={APP_ROUTE_PATHS.proPackage}>
            {SNAPSHOT_LANDING_HERO_COPY.viewProPackageCta} <ArrowRight className="ml-1 inline h-4 w-4" />
          </Link>
        </Button>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg py-2 text-sm font-medium mobile:min-h-11"
          style={{
            color: 'var(--overlay-white-85)',
            background: 'var(--overlay-white-08)',
            border: '1px solid var(--overlay-white-14)',
            cursor: 'pointer',
          }}
        >
          {SNAPSHOT_LANDING_HERO_COPY.analyzeAnotherUrl}
        </button>
      </div>
    </div>
  );
}
