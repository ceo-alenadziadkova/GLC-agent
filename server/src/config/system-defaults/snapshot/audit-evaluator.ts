export const SYSTEM_DEFAULTS_SNAPSHOT_AUDIT = {
  partialScoreFactor: 0.5,
  /** Numeric heuristics for free snapshot audit evaluators (`server/src/snapshot/audit/evaluator-implementations`). */
  evaluatorThresholds: {
    h1ServiceIntent: {
      passWithServiceWordMinLen: 8,
      partialMinLen: 12,
    },
    heroPrimaryCta: {
      passMinCount: 1,
    },
    metaDescription: {
      passMinLen: 40,
      passMaxLen: 170,
      partialBandMinLen: 25,
      partialBandBelowPass: 40,
      longPartialMaxLen: 320,
      shortPartialMaxLen: 24,
    },
    imageAlt: {
      passMinRatio: 0.85,
      partialMinRatio: 0.45,
    },
    title: {
      passMinLen: 15,
      passMaxLen: 70,
      partialMinLen: 5,
    },
    formFriction: {
      failFieldCount: 8,
      failRequiredCount: 5,
      partialFieldCount: 5,
      partialRequiredCount: 3,
    },
    bodyContent: {
      passMinLen: 800,
      partialMinLen: 350,
    },
    ctaNoise: {
      passMaxHeroCtas: 1,
      passMaxTotalCtas: 8,
      partialMaxHeroCtas: 2,
      partialMaxTotalCtas: 14,
    },
    navBreadth: {
      passMinItems: 5,
      partialMinItems: 2,
    },
    subheadingSupport: {
      passMinH2: 2,
      partialH2Count: 1,
    },
    supportingCopyDepth: {
      passMinParagraphs: 2,
      passMinTotalLen: 120,
      partialMinTotalLen: 60,
    },
    htmlLang: {
      minDeclaredLen: 2,
    },
    conversionContextDepth: {
      meatyParagraphMinLen: 55,
      passMeatyCount: 2,
      partialMeatyCount: 1,
    },
    schemaTypeBreadth: {
      passMinTypes: 4,
      partialMinTypes: 2,
    },
    structuredDataShape: {
      passMinTypes: 2,
      partialTypesCount: 1,
    },
    evidence: {
      schemaTypesShort: 6,
      schemaTypesMedium: 8,
      schemaTypesLong: 10,
      canonicalUrlMax: 120,
      robotsMetaMax: 80,
      homepageUrlMax: 80,
    },
  },
} as const;
