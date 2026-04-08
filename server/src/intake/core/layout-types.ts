export interface LayoutStepV1 {
  label?: string;
  questionIds: string[];
}

export interface PublicDiscoverySurfaceV1 {
  deferRemaining: boolean;
  steps: LayoutStepV1[];
}

export interface LayoutRulesV1 {
  version: string;
  surfaces: {
    public_discovery: PublicDiscoverySurfaceV1;
  };
}
