export interface ControlObjectVersions {
  system_version: string;
  fact_checker_version: string;
  decision_layer_version: string;
}

export const CONTROL_OBJECT_VERSIONS = {
  system_version: 'v2.1',
  fact_checker_version: 'v2.1',
  decision_layer_version: 'v2.1',
} as const;

export const CONTROL_OBJECT_VERSIONS_CAUSAL_DAG = {
  system_version: 'v2.3',
  fact_checker_version: 'v2.3',
  decision_layer_version: 'v2.1',
} as const;

export const CONTROL_OBJECT_VERSIONS_REMEDIATION = {
  system_version: 'v2.4',
  fact_checker_version: 'v2.4',
  decision_layer_version: 'v2.1',
} as const;
