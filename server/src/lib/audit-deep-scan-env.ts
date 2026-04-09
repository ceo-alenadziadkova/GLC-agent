function truthy(v: string | undefined): boolean {
  return v === '1' || v === 'true' || v === 'yes';
}

export function auditDeepScanEnabled(): boolean {
  return truthy(process.env.AUDIT_DEEP_SCAN);
}

export function auditLighthouseEnabled(): boolean {
  return auditDeepScanEnabled() || truthy(process.env.AUDIT_LIGHTHOUSE);
}

export function auditAxePlaywrightEnabled(): boolean {
  return auditDeepScanEnabled() || truthy(process.env.AUDIT_AXE_PLAYWRIGHT);
}

export function auditLighthouseBudgetMs(): number {
  const n = Number(process.env.AUDIT_LIGHTHOUSE_BUDGET_MS ?? 55_000);
  return Number.isFinite(n) && n >= 10_000 ? Math.min(n, 120_000) : 55_000;
}

export function auditAxeNavigateTimeoutMs(): number {
  const n = Number(process.env.AUDIT_AXE_NAV_TIMEOUT_MS ?? 12_000);
  return Number.isFinite(n) && n >= 4000 ? Math.min(n, 30_000) : 12_000;
}
