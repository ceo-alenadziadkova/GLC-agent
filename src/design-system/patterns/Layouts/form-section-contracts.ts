export const FORM_SECTION_CONTRACTS = {
  root: 'ds-pattern-form-section-root',
  fields: 'grid grid-cols-1 gap-4',
  actions: 'mt-2 flex flex-wrap items-center justify-end gap-2',
} as const;

export type FormSectionContractKey = keyof typeof FORM_SECTION_CONTRACTS;
