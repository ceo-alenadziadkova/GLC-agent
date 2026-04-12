/**
 * Row limits and thresholds for GET /api/analytics/dashboard.
 * Static product defaults — adjust here to keep query shapes in sync.
 */

export const ANALYTICS_DASHBOARD_LIMITS = {
  /** Audits in `review` status (action queue) */
  reviewGatesList: 20,
  /** Stale `created` audits older than slaRiskMinAgeDays */
  slaRisksList: 20,
  /** Minimum age in days for an audit to appear in SLA risks */
  slaRiskMinAgeDays: 5,
  /** Recent failed audits */
  recentFailuresList: 10,
  /** Submitted client audit requests */
  pendingRequestsList: 20,
  /** Pipeline events in activity feed */
  activityFeedList: 15,
  /** SLA risk item gets `high` priority when days_open exceeds this */
  slaRiskHighPriorityDays: 14,
} as const;
