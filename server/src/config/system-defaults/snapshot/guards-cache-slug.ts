export const SYSTEM_DEFAULTS_SNAPSHOT_ABUSE = {
  maxConcurrent: 4,
  domainFreshCooldownMs: 10 * 60 * 1000,
  useSharedAbuseStore: false,
} as const;

export const SYSTEM_DEFAULTS_SNAPSHOT_ROBOTS = {
  cacheMs: 20 * 60 * 1000,
} as const;

export const SYSTEM_DEFAULTS_SNAPSHOT_DOMAIN_CACHE = {
  ttlHours: 48,
} as const;

export const SYSTEM_DEFAULTS_SNAPSHOT_LINK_SLUG = {
  max: 80,
  hardCap: 200,
} as const;

export const SYSTEM_DEFAULTS_SNAPSHOT_CLASSIFICATION = {
  debugSignals: false,
} as const;

export const SYSTEM_DEFAULTS_PAGE_ANOMALY = {
  sampleBytes: 96_000,
  registrarThinVisibleMax: 3_800,
  oauthRawMarkupMax: 16_000,
  passwordRawMarkupMax: 12_000,
  spaShellVisibleMax: 520,
  spaShellScriptMin: 10,
  suppressOrgVisibleMin: 350,
  suppressMailtoVisibleMin: 650,
  suppressPathLinksHigh: 12,
  suppressPathLinksHighVisibleMin: 550,
  suppressPathLinksMed: 8,
  suppressPathLinksMedVisibleMin: 1_800,
  suppressLongCopyVisibleMin: 3_200,
} as const;
