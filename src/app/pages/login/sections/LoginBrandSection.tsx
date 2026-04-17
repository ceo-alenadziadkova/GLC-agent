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
          className="inline-flex items-center justify-center gap-3"
          style={{ textDecoration: 'none' }}
          aria-label={LC.ariaHome}
        >
          <img
            src="/logo-simple.svg"
            alt=""
            className="h-10 w-auto max-w-[min(72px,20vw)] shrink-0"
            width={68}
            height={72}
            decoding="async"
          />
          <h1
            className="font-logo leading-none"
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              letterSpacing: 'var(--tracking-tight)',
            }}
          >
            <span style={{ color: 'var(--text-primary)' }}>{LC.brandWordmarkPrimary}</span>
            <span style={{ color: 'var(--text-secondary)' }}>{LC.brandWordmarkSecondary}</span>
          </h1>
        </Link>
      </motion.div>
      <p className="glc-login-brand-tagline mt-2" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
        {loginTagline}
      </p>
    </div>
  );
}
