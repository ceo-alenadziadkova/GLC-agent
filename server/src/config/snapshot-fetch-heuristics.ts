/**
 * Tiered snapshot HTTP fetch: Accept-Language headers, link-scoring regexes, robots-fallback paths.
 * Source of truth: constants in this module (tune via code release).
 */

const DEFAULT_FETCH_ACCEPT_LANGUAGE =
  'en,es,de,fr,nl,pt,it,pl,ru,uk,ja,zh-CN,zh;q=0.9';

const DEFAULT_HEAD_ACCEPT_LANGUAGE = 'en,es;q=0.9';

/** Path substring hints for scoring discovered same-origin links (case-insensitive). */
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

/** Regexes matched against pathname when ranking extra snapshot pages. */
export const SNAPSHOT_PATH_HINT_REGEXES: RegExp[] = DEFAULT_PATH_HINT_SOURCES.map(
  (s) => new RegExp(s, 'i'),
);

/** Same-origin paths tried when homepage GET is robots-disallowed. */
export const SNAPSHOT_ROBOTS_FALLBACK_HTML_PATHS: string[] = [...DEFAULT_ROBOTS_FALLBACK_PATHS];

export const SNAPSHOT_FETCH_ACCEPT_LANGUAGE = DEFAULT_FETCH_ACCEPT_LANGUAGE;

export const SNAPSHOT_HEAD_ACCEPT_LANGUAGE = DEFAULT_HEAD_ACCEPT_LANGUAGE;
