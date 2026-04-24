/** Response from POST /api/audits/:id/strategy/execution-pack */
export interface StrategyExecutionPackResponse {
  id: string;
  payload: {
    packs: Array<{
      initiative_id: string;
      tasks: string[];
      architecture: string;
      artifacts?: string[];
      templates?: string[];
      prompts?: string[];
    }>;
  };
}
