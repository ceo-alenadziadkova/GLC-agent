import { Link } from 'react-router';
import { motion } from 'motion/react';
import { LOGIN_PAGE_COPY_EN as LC } from '../../../config/login-copy.en';
import { APP_ROUTE_PATHS } from '../../../config/route-paths';

type LoginAsideSectionProps = {
  reduceMotion: boolean;
  motionTransition: {
    asideEnter: {
      duration: number;
      delay: number;
      ease: readonly [number, number, number, number];
    };
    asideTitleEnter: {
      duration: number;
      delay: number;
      ease: readonly [number, number, number, number];
    };
  };
};

export function LoginAsideSection({ reduceMotion, motionTransition }: LoginAsideSectionProps) {
  return (
    <motion.aside
      className="relative hidden lg:flex lg:order-2 lg:w-full lg:min-h-screen lg:items-end lg:justify-end lg:px-10 lg:pb-10"
      initial={reduceMotion ? false : { opacity: 0, x: 16 }}
      animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
      transition={motionTransition.asideEnter}
    >
      <motion.p
        className="ds-login-aside-floating-title ds-login-aside-title pointer-events-none absolute inset-0 flex items-center justify-center px-10 text-center font-display text-lg font-bold tracking-tight text-[var(--text-primary)] lg:text-xl"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={motionTransition.asideTitleEnter}
      >
        {LC.authShellAsideTitle}
      </motion.p>

      <div className="ds-login-aside-content ds-login-layout-side-panel ds-login-aside-panel-max w-full md:p-6">
        <div className="ds-login-side-bottom">
          <ul className="ds-login-side-signals grid grid-cols-3 gap-2">
            {LC.authShellTrustSignals.map(signal => (
              <li key={signal} className="ds-login-aside-signal flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="ds-login-aside-signal-dot" aria-hidden />
                {signal}
              </li>
            ))}
          </ul>

          <p className="ds-login-aside-links ds-login-side-caption text-xs leading-relaxed text-[var(--text-quaternary)]">
            {LC.asideIntroPrefix}
            <Link to={APP_ROUTE_PATHS.snapshot} className="text-[var(--text-blue)] underline-offset-2 hover:underline">
              {LC.asideSnapshotLinkLabel}
            </Link>{' '}
            {LC.asideIntroMiddle}
            <Link to={APP_ROUTE_PATHS.brief} className="text-[var(--text-blue)] underline-offset-2 hover:underline">
              {LC.asideBriefLinkLabel}
            </Link>
            {LC.asideIntroSuffix}
          </p>
        </div>
      </div>
    </motion.aside>
  );
}
