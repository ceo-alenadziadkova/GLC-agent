/**
 * Canonical industry values — `question-bank.v1.json` `optionCatalogs.industry` via `@glc/intake-core`.
 */
import { QUESTION_BANK_OPTION_CATALOGS } from '@glc/intake-core';

export const INDUSTRY_OPTIONS = QUESTION_BANK_OPTION_CATALOGS.industry;
export type IndustryOption = (typeof INDUSTRY_OPTIONS)[number];
