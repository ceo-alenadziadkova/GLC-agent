import * as Sentry from '@sentry/node';

import { SYSTEM_DEFAULTS } from './system-defaults.js';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  if (!process.env.SENTRY_DSN) return;

  const defaultRate = SYSTEM_DEFAULTS.observability.sentryTracesSampleRateDefault;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    /** Ops exception: `SENTRY_TRACES_SAMPLE_RATE` overrides CONFIG default (see server/.env.example). */
    tracesSampleRate: Number(
      process.env.SENTRY_TRACES_SAMPLE_RATE ?? String(defaultRate),
    ),
    sendDefaultPii: false,
  });
  initialized = true;
}

export { Sentry };
