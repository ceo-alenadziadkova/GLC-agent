/**
 * Tiered snapshot HTTP fetch: Accept-Language headers, link-scoring regexes, robots-fallback paths.
 * Optional JSON env overrides; invalid JSON or patterns fall back to built-in defaults (lenient).
 */

const DEFAULT_FETCH_ACCEPT_LANGUAGE =
  'en,es,de,fr,nl,pt,it,pl,ru,uk,ja,zh-CN,zh;q=0.9';

const DEFAULT_HEAD_ACCEPT_LANGUAGE = 'en,es;q=0.9';

/** Default path substring hints for scoring discovered same-origin links (case-insensitive). */
const DEFAULT_PATH_HINT_SOURCES = [
  String.raw`\/about`,
  String.raw`\/contact`,
  String.raw`\/services?\/?$`,
  String.raw`\/pricing`,
  String.raw`\/book`,
  String.raw`\/appointment`,
] as const;

const DEFAULT_ROBOTS_FALLBACK_PATHS: readonly string[] = [
  '/about',
  '/about/',
  '/about-us',
  '/company',
  '/team',
  '/contact',
  '/pricing',
  '/services',
];

const MAX_PATH_HINTS = 30;
const MAX_PATH_HINT_SOURCE_LEN = 200;
const MAX_ROBOTS_FALLBACK_PATHS = 40;
const MAX_PATH_STRING_LEN = 512;

function trimEnv(name: string): string {
  return typeof process.env[name] === 'string' ? process.env[name]!.trim() : '';
}

function compilePathHints(sources: readonly string[]): RegExp[] {
  const out: RegExp[] = [];
  for (const s of sources) {
    if (!s || s.length > MAX_PATH_HINT_SOURCE_LEN) continue;
    try {
      out.push(new RegExp(s, 'i'));
    } catch {
      /* skip invalid */
    }
  }
  return out.length > 0 ? out : DEFAULT_PATH_HINT_SOURCES.map((s) => new RegExp(s, 'i'));
}

function parsePathHintJson(raw: string): RegExp[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > MAX_PATH_HINTS) {
    return null;
  }
  const sources: string[] = [];
  for (const item of parsed) {
    if (typeof item !== 'string' || !item.trim()) return null;
    const t = item.trim();
    if (t.length > MAX_PATH_HINT_SOURCE_LEN) return null;
    sources.push(t);
  }
  const compiled = compilePathHints(sources);
  return compiled.length > 0 ? compiled : null;
}

function parseRobotsFallbackPathsJson(raw: string): string[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > MAX_ROBOTS_FALLBACK_PATHS) {
    return null;
  }
  const out: string[] = [];
  for (const item of parsed) {
    if (typeof item !== 'string' || !item.trim()) return null;
    const t = item.trim();
    if (t.length > MAX_PATH_STRING_LEN) return null;
    if (!t.startsWith('/')) return null;
    out.push(t);
  }
  return out.length > 0 ? out : null;
}

const pathHintJson = trimEnv('SNAPSHOT_PATH_HINT_REGEX_JSON');
const pathHintsFromEnv = pathHintJson ? parsePathHintJson(pathHintJson) : null;

const robotsPathsJson = trimEnv('SNAPSHOT_ROBOTS_FALLBACK_PATHS_JSON');
const robotsPathsFromEnv = robotsPathsJson ? parseRobotsFallbackPathsJson(robotsPathsJson) : null;

/** Regexes matched against pathname when ranking extra snapshot pages. */
export const SNAPSHOT_PATH_HINT_REGEXES: RegExp[] =
  pathHintsFromEnv ?? DEFAULT_PATH_HINT_SOURCES.map((s) => new RegExp(s, 'i'));

/** Same-origin paths tried when homepage GET is robots-disallowed. */
export const SNAPSHOT_ROBOTS_FALLBACK_HTML_PATHS: string[] = robotsPathsFromEnv
  ? [...robotsPathsFromEnv]
  : [...DEFAULT_ROBOTS_FALLBACK_PATHS];

const fetchLang = trimEnv('SNAPSHOT_FETCH_ACCEPT_LANGUAGE');
export const SNAPSHOT_FETCH_ACCEPT_LANGUAGE =
  fetchLang.length > 0 && fetchLang.length <= 500 ? fetchLang : DEFAULT_FETCH_ACCEPT_LANGUAGE;

const headLang = trimEnv('SNAPSHOT_HEAD_ACCEPT_LANGUAGE');
export const SNAPSHOT_HEAD_ACCEPT_LANGUAGE =
  headLang.length > 0 && headLang.length <= 500 ? headLang : DEFAULT_HEAD_ACCEPT_LANGUAGE;
