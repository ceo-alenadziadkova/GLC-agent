/**
 * Compare site recon `industry_guess` with the industry the user set on New Audit step 0.
 * Used to avoid showing a redundant "guess" when it matches; show a note only on mismatch.
 */
export function normalizeIndustryForCompare(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function clientIndustryLabelFromStep0(industry: string, industrySpecify: string | undefined): string {
  if (industry === 'Other' && industrySpecify?.trim()) {
    return industrySpecify.trim();
  }
  return industry.trim();
}

export function siteIndustryDisputesClientBasics(
  siteIndustryGuess: string | null | undefined,
  clientIndustry: string,
  clientIndustrySpecify: string | undefined,
): boolean {
  const guess = siteIndustryGuess?.trim();
  if (!guess) {
    return false;
  }
  const clientLabel = clientIndustryLabelFromStep0(clientIndustry, clientIndustrySpecify);
  if (!clientLabel) {
    return false;
  }
  return normalizeIndustryForCompare(guess) !== normalizeIndustryForCompare(clientLabel);
}
