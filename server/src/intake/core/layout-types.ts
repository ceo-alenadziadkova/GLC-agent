export interface LayoutStepV1 {
  label?: string;
  questionIds: string[];
}

/** One wizard surface (public Discovery, consultant wizard, client form, portal pre-brief, …). */
export interface LayoutSurfaceV1 {
  deferRemaining: boolean;
  steps: LayoutStepV1[];
  /**
   * Bank ids that must not appear in `visible` for this surface (e.g. recon confirm for client self-serve).
   * Eligible ids stay eligible; they are omitted from the on-screen sequence.
   */
  suppressQuestionIds?: string[];
}

export interface LayoutRulesV1 {
  version: string;
  surfaces: {
    public_discovery: LayoutSurfaceV1;
    consultant_interview: LayoutSurfaceV1;
    client_form: LayoutSurfaceV1;
    client_portal: LayoutSurfaceV1;
  };
}
