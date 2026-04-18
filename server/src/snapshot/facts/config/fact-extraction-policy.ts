export const FACT_EXTRACTION_POLICY = {
  quality: {
    shellTextLengthMax: 400,
    shellScriptCountMin: 15,
    lowTextLengthMax: 200,
    mediumTextLengthMax: 900,
    bodyTextSampleMax: 2500,
  },
  hero: {
    htmlSliceMax: 12000,
  },
  limits: {
    titleTokenMinLen: 3,
    h2Max: 12,
    topHeadingsMax: 15,
    topParagraphsMax: 5,
    paragraphMinLen: 40,
    navItemMaxLen: 80,
    navItemsMax: 40,
    ctaTextMinLen: 1,
    ctaTextMaxLen: 120,
    ctaTextsMax: 30,
    internalSampleMax: 40,
    titleLangSliceMax: 5,
  },
} as const;
