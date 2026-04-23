export const NEW_AUDIT_WIZARD_STEPS = {
  min: 0,
  max: 3,
} as const;

export const NEW_AUDIT_STEP_ZERO = 0 as const;
export const NEW_AUDIT_STEP_ONE = 1 as const;
export const NEW_AUDIT_STEP_TWO = 2 as const;
export const NEW_AUDIT_STEP_THREE = 3 as const;

export const INDUSTRY_OTHER_VALUE = 'Other' as const;

export const BRIEF_LAYOUT_UNSET = 'unset' as const;
export const BRIEF_LAYOUT_CLASSIC = 'classic' as const;
export const BRIEF_LAYOUT_WIZARD = 'wizard' as const;

/** Step 1 brief: max question labels listed before "and N more" under the disabled CTA. */
export const NEW_AUDIT_STEP1_MISSING_REQUIRED_LABELS_PREVIEW_MAX = 4 as const;

export const NEW_AUDIT_STEP1_MISSING_REQUIRED_HINT_DOM_ID = 'step1-missing-required-hint' as const;
