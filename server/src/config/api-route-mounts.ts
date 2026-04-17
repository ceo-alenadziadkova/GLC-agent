/**
 * Express `app.use(prefix, router)` table — single source for API mounts (`server/src/index.ts`).
 * Contract: every path in `@glc/api-paths` (`API_PATHS`) must fall under one of these prefixes.
 */

import type { Express, Router } from 'express';
import { API_HTTP_PATH_PREFIX } from './api-http-paths.js';
import { auditsRouter } from '../routes/audits.js';
import { pipelineRouter } from '../routes/pipeline.js';
import { reportsRouter } from '../routes/reports.js';
import { logRouter } from '../routes/log.js';
import { snapshotRouter } from '../routes/snapshot.js';
import { intakeRouter } from '../routes/intake/index.js';
import { intakeTraceToolRouter } from '../routes/intake-trace-tool.js';
import { discoverRouter } from '../routes/discover.js';
import { marketingRouter } from '../routes/marketing-brief.js';
import { auditRequestsRouter } from '../routes/audit-requests.js';
import { analyticsRouter } from '../routes/analytics.js';
import { benchmarksRouter } from '../routes/benchmarks.js';
import { notificationsRouter } from '../routes/notifications.js';
import { profileRouter } from '../routes/profile.js';
import { platformRouter } from '../routes/platform.js';
import { publicBrandRouter } from '../routes/public-brand.js';
import { briefPublicRouter } from '../routes/brief-public.js';

export type ApiRouteMountEntry = { prefix: string; router: Router };

/** Order matches previous `index.ts` (multiple routers may share `/api/audits`). */
export const API_ROUTE_MOUNT_ENTRIES: readonly ApiRouteMountEntry[] = [
  { prefix: API_HTTP_PATH_PREFIX.public, router: publicBrandRouter },
  { prefix: API_HTTP_PATH_PREFIX.profile, router: profileRouter },
  { prefix: API_HTTP_PATH_PREFIX.platform, router: platformRouter },
  { prefix: API_HTTP_PATH_PREFIX.briefPublic, router: briefPublicRouter },
  { prefix: API_HTTP_PATH_PREFIX.snapshot, router: snapshotRouter },
  { prefix: API_HTTP_PATH_PREFIX.intake, router: intakeRouter },
  { prefix: API_HTTP_PATH_PREFIX.intakeTraceTool, router: intakeTraceToolRouter },
  { prefix: API_HTTP_PATH_PREFIX.discover, router: discoverRouter },
  { prefix: API_HTTP_PATH_PREFIX.marketing, router: marketingRouter },
  { prefix: API_HTTP_PATH_PREFIX.auditRequests, router: auditRequestsRouter },
  { prefix: API_HTTP_PATH_PREFIX.analytics, router: analyticsRouter },
  { prefix: API_HTTP_PATH_PREFIX.benchmarks, router: benchmarksRouter },
  { prefix: API_HTTP_PATH_PREFIX.notifications, router: notificationsRouter },
  { prefix: API_HTTP_PATH_PREFIX.audits, router: auditsRouter },
  { prefix: API_HTTP_PATH_PREFIX.audits, router: pipelineRouter },
  { prefix: API_HTTP_PATH_PREFIX.audits, router: reportsRouter },
  { prefix: API_HTTP_PATH_PREFIX.log, router: logRouter },
];

export function expressApiMountPrefixesUnique(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { prefix } of API_ROUTE_MOUNT_ENTRIES) {
    if (!seen.has(prefix)) {
      seen.add(prefix);
      out.push(prefix);
    }
  }
  return out;
}

export function mountApiRouters(app: Express): void {
  for (const { prefix, router } of API_ROUTE_MOUNT_ENTRIES) {
    app.use(prefix, router);
  }
}
