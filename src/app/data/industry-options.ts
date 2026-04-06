/**
 * Canonical industry values for dropdowns (New Audit, client request, public pre-brief).
 * Keep in sync with server/src/config/industry-options.ts
 */
export const INDUSTRY_OPTIONS = [
  'E-commerce',
  'Education',
  'Finance',
  'Food & Beverage',
  'Healthcare',
  'Hospitality',
  'Manufacturing',
  'Marine',
  'Media & Entertainment',
  'Non-profit',
  'Professional Services',
  'Real Estate',
  'Retail',
  'SaaS / Software',
  'Other',
] as const;

export type IndustryOption = (typeof INDUSTRY_OPTIONS)[number];

export function isIndustryOption(value: string): value is IndustryOption {
  return (INDUSTRY_OPTIONS as readonly string[]).includes(value);
}
