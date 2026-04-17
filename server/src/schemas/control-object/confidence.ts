export interface ControlObjectConfidence {
  overall: number;
  factual: number;
  strategic: number;
  consistency: number;
  feasibility: number | null;
}

export interface ControlObjectConfidenceWeights {
  factual: number;
  strategic: number;
  consistency: number;
  feasibility: number;
}

export interface ControlObjectFeasibility {
  score: number;
  risk_codes: string[];
  notes: string[];
}
