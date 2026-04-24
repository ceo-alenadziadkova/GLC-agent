export type TraceRole = 'required' | 'visible' | 'deferred' | 'hidden';

/** Trace role from `buildIntakePlan`, or `unknown` when the id is not in current plan footprint. */
export type TracePlanStatus = TraceRole | 'unknown';

export type ViewMode = 'user' | 'logic' | 'dependency';

