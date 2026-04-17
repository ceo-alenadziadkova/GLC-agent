import { Link } from 'react-router';
import { motion } from 'motion/react';
import { LOGIN_PAGE_COPY_EN as LC } from '../../../config/login-copy.en';
import { APP_ROUTE_PATHS } from '../../../config/route-paths';

type LoginBrandSectionProps = {
  loginTagline: string;
  motionTransition: {
    duration: number;
    delay: number;
    ease: readonly [number, number, number, number];
  };
};

export function LoginBrandSection({ loginTagline, motionTransition }: LoginBrandSectionProps) {
  return (
    <div className="glc-login-brand text-center mb-8 md:text-left">
      <motion.div
        initial={{ scale: 0.75, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={motionTransition}
        className="mb-4"
      >
        <Link
          to={APP_ROUTE_PATHS.home}
          className="inline-flex items-center justify-center gap-3 no-underline"
          aria-label={LC.ariaHome}
        >
          <img
            src="/logo-simple.svg"
            alt=""
            className="ds-login-brand-logo-max h-10 w-auto shrink-0"
            width={68}
            height={72}
            decoding="async"
          />
          <h1
            className="font-logo text-[length:var(--text-2xl)] leading-none font-bold tracking-[var(--tracking-tight)]"
          >
            <span className="text-[var(--text-primary)]">{LC.brandWordmarkPrimary}</span>
            <span className="text-[var(--text-secondary)]">{LC.brandWordmarkSecondary}</span>
          </h1>
        </Link>
      </motion.div>
      <p className="glc-login-brand-tagline mt-2 text-[length:var(--text-sm)] text-[var(--text-secondary)]">
        {loginTagline}
      </p>
    </div>
  );
}
