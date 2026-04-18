export const BLOCKED_PUBLIC_URL_HOSTS = new Set(['localhost'] as const);

export const BLOCKED_PUBLIC_URL_HOST_SUFFIXES = ['.local'] as const;

export const PUBLIC_URL_REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308] as const);

export const BLOCKED_IPV4_PREFIXES = new Set([0, 10, 127] as const);

export const BLOCKED_IPV4_RANGES = [
  { octetA: 169, octetBMin: 254, octetBMax: 254 },
  { octetA: 192, octetBMin: 168, octetBMax: 168 },
  { octetA: 172, octetBMin: 16, octetBMax: 31 },
  { octetA: 100, octetBMin: 64, octetBMax: 127 },
] as const;

export const BLOCKED_IPV6_EXACT = new Set(['::1'] as const);

export const BLOCKED_IPV6_PREFIXES = ['fe80:', 'fc', 'fd'] as const;
