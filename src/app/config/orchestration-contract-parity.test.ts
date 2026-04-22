import { describe, expect, it } from 'vitest';

import { APP_FEATURE_FLAGS } from './app-feature-flags';
import { SYSTEM_DEFAULTS_FEATURE_FLAGS } from '../../../server/src/config/system-defaults/feature-flags-defaults';
import {
  ROADMAP_CHANGE_SCENARIOS,
  ROADMAP_MANIFEST_SCHEMA_VERSION,
  ROADMAP_RISK_TOLERANCE_PRESETS,
  ROADMAP_SEASON_PRESETS,
} from '../../../server/src/config/orchestration-roadmap-presets';
import {
  ORCHESTRATION_INPUT_GATE_STATUSES as SERVER_INPUT_GATE_STATUSES,
  GLC_ORCHESTRATION_PACK_SCHEMA_VERSION,
  ORCHESTRATION_PACK_REVISION_DIFF_SCHEMA_VERSION,
} from '../../../server/src/config/orchestration-graph-policy';
import { ORCHESTRATION_PLAN_GOVERNANCE_REASON_CODES as SERVER_GOVERNANCE_REASON_CODES } from '../../../server/src/config/orchestration-plan-governance-policy';
import { ORCHESTRATION_LANE_IDS } from '../../../server/src/config/orchestration-lanes';
import {
  ORCHESTRATION_MANIFEST_STATES as SERVER_MANIFEST_STATES,
  ORCHESTRATION_TIMELINE_STATUSES as SERVER_TIMELINE_STATUSES,
} from '../../../server/src/config/orchestration-client-contract';
import { ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODES as SERVER_ROLLOUT_MODES } from '../../../server/src/config/orchestration-plan-governance-rollout-policy';
import { ORCHESTRATION_PLAN_GATE_OUTCOMES as SERVER_PLAN_GATE_OUTCOMES } from '../../../server/src/schemas/orchestration-plan-governance';
import {
  ORCHESTRATION_CHANGE_SCENARIOS,
  ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
  ORCHESTRATION_RISK_TOLERANCE_PRESETS,
  ORCHESTRATION_SEASON_PRESETS,
} from './orchestration-roadmap-manifest';
import {
  ORCHESTRATION_MANIFEST_STATES,
  ORCHESTRATION_PACK_DIFF_SCHEMA_VERSION,
  ORCHESTRATION_PACK_SCHEMA_VERSION,
  ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODES,
  ORCHESTRATION_TIMELINE_STATUSES,
} from './orchestration-contract';
import { ORCHESTRATION_INPUT_GATE_STATUSES, ORCHESTRATION_PLAN_GATE_OUTCOMES } from './orchestration-contract';
import { ORCHESTRATION_PLAN_GOVERNANCE_REASON_CODES as FE_GOVERNANCE_REASON_CODES } from './orchestration-plan-governance';
import { ORCHESTRATION_PLAN_GOVERNANCE_REASON_HINTS } from './orchestration-plan-governance';
import { ORCHESTRATION_LANE_LABELS } from './orchestration-roadmap-ui-copy.en';
import { DIRECTOR_DEEP_DIVE_API_ERROR_CODES } from './director-deep-dive-api-error-codes';
import { API_ERROR_CODES } from '../../../server/src/config/api-error-codes';
import { DIRECTOR_SUB_AGENT_IDS as SERVER_DIRECTOR_SUB_AGENT_IDS } from '../../../server/src/config/director-sub-agents';
import { DIRECTOR_SUB_AGENT_OPTIONS } from './director-sub-agents';

describe('orchestration contract parity', () => {
  it('keeps manifest enums and schema version in sync with server', () => {
    expect(ORCHESTRATION_CHANGE_SCENARIOS).toEqual(ROADMAP_CHANGE_SCENARIOS);
    expect(ORCHESTRATION_SEASON_PRESETS).toEqual(ROADMAP_SEASON_PRESETS);
    expect(ORCHESTRATION_RISK_TOLERANCE_PRESETS).toEqual(ROADMAP_RISK_TOLERANCE_PRESETS);
    expect(ORCHESTRATION_MANIFEST_SCHEMA_VERSION).toBe(ROADMAP_MANIFEST_SCHEMA_VERSION);
  });

  it('keeps pack and diff schema versions in sync with server', () => {
    expect(ORCHESTRATION_PACK_SCHEMA_VERSION).toBe(GLC_ORCHESTRATION_PACK_SCHEMA_VERSION);
    expect(ORCHESTRATION_PACK_DIFF_SCHEMA_VERSION).toBe(ORCHESTRATION_PACK_REVISION_DIFF_SCHEMA_VERSION);
  });

  it('keeps governance reason codes and lane ids in sync with server', () => {
    expect(FE_GOVERNANCE_REASON_CODES).toEqual(SERVER_GOVERNANCE_REASON_CODES);
    expect(Object.keys(ORCHESTRATION_LANE_LABELS).sort()).toEqual([...ORCHESTRATION_LANE_IDS].sort());
  });

  it('provides remediation hint for every governance reason code', () => {
    for (const code of SERVER_GOVERNANCE_REASON_CODES) {
      const hint = ORCHESTRATION_PLAN_GOVERNANCE_REASON_HINTS[code];
      expect(typeof hint).toBe('string');
      expect(hint.trim().length).toBeGreaterThan(0);
    }
  });

  it('keeps input-gate and plan-gate outcomes in sync with server', () => {
    expect(ORCHESTRATION_INPUT_GATE_STATUSES).toEqual(SERVER_INPUT_GATE_STATUSES);
    expect(ORCHESTRATION_PLAN_GATE_OUTCOMES).toEqual(SERVER_PLAN_GATE_OUTCOMES);
  });

  it('keeps timeline status, manifest state, and rollout modes in sync with server', () => {
    expect(ORCHESTRATION_TIMELINE_STATUSES).toEqual(SERVER_TIMELINE_STATUSES);
    expect(ORCHESTRATION_MANIFEST_STATES).toEqual(SERVER_MANIFEST_STATES);
    expect(ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODES).toEqual(SERVER_ROLLOUT_MODES);
  });

  it('keeps timeline-primary UX rollout default aligned (server SYSTEM_DEFAULTS vs APP_FEATURE_FLAGS)', () => {
    expect(APP_FEATURE_FLAGS.orchestrationTimelinePrimaryUxEnabled).toBe(
      SYSTEM_DEFAULTS_FEATURE_FLAGS.orchestrationTimelinePrimaryUxEnabled,
    );
  });

  it('keeps roadmap/deep-dive rollout mode defaults aligned with server', () => {
    expect(APP_FEATURE_FLAGS.orchestrationRoadmapNarrativeRolloutMode).toBe(
      SYSTEM_DEFAULTS_FEATURE_FLAGS.orchestrationRoadmapNarrativeRolloutMode,
    );
    expect(APP_FEATURE_FLAGS.directorDeepDiveRolloutMode).toBe(
      SYSTEM_DEFAULTS_FEATURE_FLAGS.directorDeepDiveRolloutMode,
    );
    expect(APP_FEATURE_FLAGS.directorSubAgentsRolloutMode).toBe(
      SYSTEM_DEFAULTS_FEATURE_FLAGS.directorSubAgentsRolloutMode,
    );
  });

  it('keeps deep-dive api error subset aligned with server codes', () => {
    for (const code of Object.values(DIRECTOR_DEEP_DIVE_API_ERROR_CODES)) {
      expect(Object.values(API_ERROR_CODES)).toContain(code);
    }
  });

  it('keeps CMO sub-agent option ids aligned with server registry ids', () => {
    expect(DIRECTOR_SUB_AGENT_OPTIONS.map((option) => option.id).sort()).toEqual(
      [...SERVER_DIRECTOR_SUB_AGENT_IDS].sort(),
    );
  });
});

