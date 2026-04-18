import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';

const ADS = SYSTEM_DEFAULTS.auditDeepScan;

export function auditDeepScanEnabled(): boolean {
  return ADS.deepScanEnabled;
}

export function auditLighthouseEnabled(): boolean {
  return ADS.lighthouseEnabled || ADS.deepScanEnabled;
}

export function auditAxePlaywrightEnabled(): boolean {
  return ADS.axePlaywrightEnabled || ADS.deepScanEnabled;
}

export function auditLighthouseBudgetMs(): number {
  return Math.min(
    ADS.lighthouseBudgetMsMax,
    Math.max(ADS.lighthouseBudgetMsMin, ADS.lighthouseBudgetMsDefault),
  );
}

export function auditAxeNavigateTimeoutMs(): number {
  return Math.min(
    ADS.axeNavigateTimeoutMsMax,
    Math.max(ADS.axeNavigateTimeoutMsMin, ADS.axeNavigateTimeoutMsDefault),
  );
}
