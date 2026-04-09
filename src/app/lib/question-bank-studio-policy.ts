import intakePolicyRaw from '../../../server/src/intake/intake-policy.v1.json';
import {
  getQuestionBankSchemaMeta,
  QUESTION_BANK_V1_STUBS,
} from '../../../server/src/intake/question-bank';

export type StudioPolicyMode = 'full' | 'express' | 'discovery' | 'pre_brief' | 'free_snapshot';

const BANK_ID_SET = new Set(QUESTION_BANK_V1_STUBS.map(s => s.id));

type ModeCfg = {
  participation?: string;
  included?: string[];
  bankIncluded?: string[];
  identityFieldIds?: string[];
  identitySpecifyFieldId?: string;
  inheritExpressRequired?: boolean;
  syntheticRequired?: string[];
  requiredAlways?: string[];
  requiredIfVisible?: string[];
  requiredness?: string;
  requirednessByMode?: Record<
    string,
    {
      syntheticRequired?: string[];
      requiredAlways?: string[];
      requiredIfVisible?: string[];
    }
  >;
};

const POLICY = intakePolicyRaw as {
  modes: Record<string, ModeCfg>;
};

function modeCfg(mode: StudioPolicyMode): ModeCfg | undefined {
  return POLICY.modes[mode];
}

/** Whether this id is part of the selected policy mode's surface (bank + pre-brief identity fields). */
export function participatesInPolicyMode(questionId: string, mode: StudioPolicyMode): boolean {
  const cfg = modeCfg(mode);
  if (!cfg) return false;

  if (cfg.participation === 'all_eligible') {
    return BANK_ID_SET.has(questionId);
  }

  if (cfg.participation === 'explicit' && cfg.included) {
    return cfg.included.includes(questionId);
  }

  if (cfg.participation === 'express_plus_identity') {
    const bundle = new Set<string>([
      ...(cfg.bankIncluded ?? []),
      ...(cfg.identityFieldIds ?? []),
    ]);
    if (cfg.identitySpecifyFieldId) bundle.add(cfg.identitySpecifyFieldId);
    return bundle.has(questionId);
  }

  return false;
}

export type PolicyOverlay = {
  participates: boolean;
  /** Canon priority from bank JSON (required / recommended / optional). */
  canonPriority: string;
  syntheticRequired: boolean;
  requiredAlways: boolean;
  requiredIfVisible: boolean;
  /** free_snapshot: policy sets requiredness to none for product intake. */
  policyRequirednessNone: boolean;
};

function requirednessBundle(mode: StudioPolicyMode): {
  synthetic: Set<string>;
  always: Set<string>;
  ifVisible: Set<string>;
} {
  const cfg = modeCfg(mode);
  const rb = cfg?.requirednessByMode?.[mode];
  const synthetic = new Set<string>([
    ...(cfg?.syntheticRequired ?? []),
    ...(rb?.syntheticRequired ?? []),
  ]);
  const always = new Set<string>([...(cfg?.requiredAlways ?? []), ...(rb?.requiredAlways ?? [])]);
  const ifVisible = new Set<string>([...(cfg?.requiredIfVisible ?? []), ...(rb?.requiredIfVisible ?? [])]);
  return { synthetic, always, ifVisible };
}

export function getPolicyOverlayForQuestion(
  questionId: string,
  mode: StudioPolicyMode,
  canonPriority: string,
): PolicyOverlay {
  const cfg = modeCfg(mode);
  const { synthetic, always, ifVisible } = requirednessBundle(mode);
  const participates = participatesInPolicyMode(questionId, mode);
  const policyRequirednessNone = cfg?.requiredness === 'none';

  let requiredAlways = always.has(questionId);
  let requiredIfVisible = ifVisible.has(questionId);

  if (mode === 'pre_brief' && cfg?.inheritExpressRequired) {
    const expressCfg = modeCfg('express');
    const expressRb = expressCfg?.requirednessByMode?.express;
    const exAlways = new Set<string>([
      ...(expressCfg?.requiredAlways ?? []),
      ...(expressRb?.requiredAlways ?? []),
    ]);
    const exIfVis = new Set<string>([
      ...(expressCfg?.requiredIfVisible ?? []),
      ...(expressRb?.requiredIfVisible ?? []),
    ]);
    if (exAlways.has(questionId)) requiredAlways = true;
    if (exIfVis.has(questionId)) requiredIfVisible = true;
  }

  return {
    participates,
    canonPriority,
    syntheticRequired: synthetic.has(questionId),
    requiredAlways,
    requiredIfVisible,
    policyRequirednessNone,
  };
}

/** Aggregates for Studio banner (bank ids only; identity nodes are separate on the canvas). */
export function computeStudioPolicyModeStats(mode: StudioPolicyMode): {
  bankTotal: number;
  bankParticipating: number;
  bankOutsidePolicy: number;
  bankPolicyRequired: number;
  bankPolicyIfVisible: number;
} {
  let bankParticipating = 0;
  let bankPolicyRequired = 0;
  let bankPolicyIfVisible = 0;
  for (const stub of QUESTION_BANK_V1_STUBS) {
    const meta = getQuestionBankSchemaMeta(stub.id);
    const o = getPolicyOverlayForQuestion(stub.id, mode, meta?.priority ?? stub.priority);
    if (!o.participates) continue;
    bankParticipating++;
    if (!o.policyRequirednessNone && (o.syntheticRequired || o.requiredAlways)) bankPolicyRequired++;
    else if (!o.policyRequirednessNone && o.requiredIfVisible) bankPolicyIfVisible++;
  }
  const bankTotal = QUESTION_BANK_V1_STUBS.length;
  return {
    bankTotal,
    bankParticipating,
    bankOutsidePolicy: bankTotal - bankParticipating,
    bankPolicyRequired,
    bankPolicyIfVisible,
  };
}
