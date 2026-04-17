/** Report export / markdown profile slice sizes (`ReportProfiler`). */
export const SYSTEM_DEFAULTS_REPORT_PROFILER = {
  ownerTopIssuesMax: 5,
  ownerTopRecsMax: 8,
  onepagerTopIssuesMax: 3,
  onepagerTopQuickWinsMax: 3,
  /** Per-domain caps in PDF export (`services/pdf-generator`); keep in family with markdown profiler limits. */
  pdfDomainIssuesMax: 15,
  pdfDomainQuickWinsMax: 10,
} as const;

/** PDF export (`pdf-generator` / `pdf-theme`). */
export const SYSTEM_DEFAULTS_REPORT_PDF = {
  /** BCP 47 tag for `toLocaleDateString` in reports. */
  localeTag: 'en-GB',
  /** Muted glyph between header company and report title (slate family). */
  headerSepMuted: '#CBD5E1',
  coverLogoOffsetTop: 40,
  coverLogoOffsetLeft: 48,
  headerInlineLogoSize: 16,
  documentMetaSafeNameMaxChars: 60,
} as const;
