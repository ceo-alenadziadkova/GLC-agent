import { useSnapshotLandingController } from './snapshot-landing/hooks/useSnapshotLandingController';
import { Link } from 'react-router';
import { AnimatePresence, useReducedMotion } from 'motion/react';
import { CaretRight, UserCircle } from '@phosphor-icons/react';
import { GlcLogo } from '../components/GlcLogo';
import { SnapshotLandingHeroForm } from './snapshot-landing/components/SnapshotLandingHeroForm';
import { SnapshotLandingProgress } from './snapshot-landing/components/SnapshotLandingProgress';
import { SnapshotLandingResults } from './snapshot-landing/components/SnapshotLandingResults';
import { marketingHeroBillboardMotion } from '../config/marketing-motion-variants';
import { SNAPSHOT_LANDING_HERO_COPY } from '../config/snapshot-landing-copy.en';
import { APP_ROUTE_PATHS, buildAppRoute } from '../config/route-paths';
import { createSnapshotLandingViewModel } from './snapshot-landing/view-model/createSnapshotLandingViewModel';

export function SnapshotLanding(props?: { embedded?: boolean }) {
  const embedded = props?.embedded ?? false;

  const {
    url,
    setUrl,
    stage,
    errorMsg,
    quotaHint,
    rateLimitDetail,
    result,
    phaseIdx,
    quotaPreview,
    accountUser,
    handleSubmit,
    reset,
  } = useSnapshotLandingController();

  const reduceMotion = useReducedMotion();
  const heroMotion = marketingHeroBillboardMotion(reduceMotion);

  const {
    techEntries,
    snapshotAccess,
    snapshotShowsAccessCallout,
    snapshotAccessRobotsBlocked,
    snapshotAccessNoPages,
    snapshotAccessRobotsLimited,
    snapshotCalloutLimitations,
    snapshotCoverageCaption,
    snapshotClassificationExplainer,
    snapshotLimitations,
    snapshotInsightBlockCount,
    snapshotInsightGridClass,
    snapshotTechColClass,
    hasFullAccount,
    workspaceEmail,
  } = createSnapshotLandingViewModel({ stage, result, accountUser });

  return (
    <div
      className={embedded ? 'flex min-h-0 flex-col' : 'flex min-h-[100dvh] flex-col'}
      style={{ backgroundColor: embedded ? 'transparent' : 'var(--bg-canvas)' }}
    >
      {!embedded && (
        <>
          <div
            className="fixed inset-0 pointer-events-none"
            style={{ background: 'var(--mesh-brand)', opacity: 0.4 }}
          />
          <header
            className="relative z-10 flex items-center justify-between gap-3 px-6 py-4 mobile:px-4 mobile:py-3"
            style={{
              borderBottom: '1px solid var(--border-subtle)',
              paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
            }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Link to={APP_ROUTE_PATHS.home} className="inline-flex items-center" aria-label={SNAPSHOT_LANDING_HERO_COPY.homeAriaLabel}>
                <GlcLogo className="h-9 mobile:h-8" />
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {/* <ThemeToggle /> */}
              {hasFullAccount ? (
                <div className="flex min-w-0 max-w-[min(100%,22rem)] items-center gap-2 sm:gap-2.5">
                  <UserCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--glc-green)' }} weight="fill" />
                  <span
                    className="hidden min-w-0 truncate text-xs font-medium sm:inline sm:max-w-[10rem] md:max-w-[13rem]"
                    style={{ color: 'var(--text-secondary)' }}
                    title={workspaceEmail ?? SNAPSHOT_LANDING_HERO_COPY.signedInFallback}
                  >
                    {workspaceEmail ?? SNAPSHOT_LANDING_HERO_COPY.signedInFallback}
                  </span>
                  <Link
                    to={APP_ROUTE_PATHS.dashboard}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg text-sm font-medium mobile:min-h-11 mobile:px-2"
                    style={{ color: 'var(--glc-blue)', textDecoration: 'none' }}
                  >
                    {SNAPSHOT_LANDING_HERO_COPY.workspaceLink} <CaretRight className="h-3.5 w-3.5 shrink-0" />
                  </Link>
                </div>
              ) : (
                <Link
                  to={buildAppRoute.loginWithNext(APP_ROUTE_PATHS.snapshot)}
                  className="inline-flex items-center justify-end gap-1 rounded-lg text-sm font-medium mobile:min-h-11 mobile:min-w-11 mobile:px-2"
                  style={{ color: 'var(--glc-blue)', textDecoration: 'none' }}
                >
                  {SNAPSHOT_LANDING_HERO_COPY.signInLink} <CaretRight className="h-3.5 w-3.5 shrink-0" />
                </Link>
              )}
            </div>
          </header>
        </>
      )}

      <main
        className={`relative z-10 flex flex-1 flex-col items-center px-6 py-12 mobile:px-4 mobile:py-8 ${
          stage === 'done' ? 'justify-start pt-8 pb-14 lg:pt-10 lg:pb-16' : 'justify-center mobile:justify-start'
        }`}
      >
        <AnimatePresence mode="wait">

          {/* ── Idle / Submitting: URL form ──────────────────── */}
          {(stage === 'idle' || stage === 'submitting' || stage === 'error') && (
            <>
              <SnapshotLandingHeroForm
                key="form"
                stage={stage}
                reduceMotion={reduceMotion}
                heroMotion={heroMotion}
                url={url}
                setUrl={setUrl}
                handleSubmit={handleSubmit}
                hasFullAccount={hasFullAccount}
                errorMsg={errorMsg}
                rateLimitDetail={rateLimitDetail}
                quotaPreview={quotaPreview}
              />
            </>
          )}

          {/* ── Running: progress ────────────────────────────── */}
          {stage === 'running' && (
            <SnapshotLandingProgress
              key="running"
              phaseIdx={phaseIdx}
              quotaHint={quotaHint}
            />
          )}

          {/* ── Done: results ────────────────────────────────── */}
          {stage === 'done' && result && (
            <>
              <SnapshotLandingResults
                key="result"
                result={result}
                snapshotAccess={snapshotAccess}
                snapshotShowsAccessCallout={snapshotShowsAccessCallout}
                snapshotAccessRobotsBlocked={snapshotAccessRobotsBlocked}
                snapshotAccessNoPages={snapshotAccessNoPages}
                snapshotAccessRobotsLimited={snapshotAccessRobotsLimited}
                snapshotCalloutLimitations={snapshotCalloutLimitations}
                snapshotClassificationExplainer={snapshotClassificationExplainer}
                snapshotCoverageCaption={snapshotCoverageCaption}
                snapshotLimitations={snapshotLimitations}
                snapshotInsightBlockCount={snapshotInsightBlockCount}
                snapshotInsightGridClass={snapshotInsightGridClass}
                snapshotTechColClass={snapshotTechColClass}
                techEntries={techEntries}
                quotaHint={quotaHint}
                reset={reset}
              />
            </>
          )}

        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer
        className="relative z-10 px-6 py-4 text-center mobile:px-4"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {SNAPSHOT_LANDING_HERO_COPY.footerDisclaimer} ·{' '}
          {hasFullAccount ? (
            <Link to={APP_ROUTE_PATHS.dashboard} style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>
              {SNAPSHOT_LANDING_HERO_COPY.footerWorkspace}
            </Link>
          ) : (
            <Link to={buildAppRoute.loginWithNext(APP_ROUTE_PATHS.snapshot)} style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>
              {SNAPSHOT_LANDING_HERO_COPY.footerSignIn}
            </Link>
          )}
        </p>
        <p className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
          {SNAPSHOT_LANDING_HERO_COPY.footerNoWebsite}{' '}
          <Link
            to={APP_ROUTE_PATHS.discovery}
            style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}
          >
            {SNAPSHOT_LANDING_HERO_COPY.footerDiscoveryLink}
          </Link>
          {' '}{SNAPSHOT_LANDING_HERO_COPY.footerDiscoverySuffix}
        </p>
      </footer>
    </div>
  );
}
