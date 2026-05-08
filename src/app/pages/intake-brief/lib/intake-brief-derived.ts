import { INTAKE_PILOT_SIGNAL_KEYS_BY_QUESTION_ID } from '../../../config/intake-critical-signal-map';
import type { BriefQuestion, BriefResponses } from '../../../data/briefQuestions';
import { websitePresenceMeansNoPublicSite } from '../../../data/briefQuestions';

type IntakeSnapshot = {
  questions?: Array<{
    id: string;
    intelligence?: {
      whyAsked: string;
      semanticDomain: 'market' | 'value' | 'economics' | 'operations' | 'resources' | 'risks';
      decisionImpact: Array<{ target: string; weight: 'low' | 'medium' | 'high'; effectDescription: string }>;
    };
  }>;
  critical_signals?: { by_key?: Record<string, 'high' | 'medium' | 'low' | 'unknown'> };
  readiness?: {
    flowReadinessStatus?: string;
    auditReadinessStatus?: string;
    trace?: Array<{ code: string; questionId?: string; signalKey?: string }>;
  };
  remediation_queue?: string[];
};

export function buildIntelligenceByQuestionId(intakeSchemaSnapshot: IntakeSnapshot | null) {
  const byId: Record<
    string,
    {
      whyAsked: string;
      semanticDomain: 'market' | 'value' | 'economics' | 'operations' | 'resources' | 'risks';
      decisionImpact: Array<{ target: string; weight: 'low' | 'medium' | 'high'; effectDescription: string }>;
    }
  > = {};
  const rows = intakeSchemaSnapshot?.questions ?? [];
  for (const row of rows) {
    if (row.intelligence) {
      byId[row.id] = row.intelligence;
    }
  }
  return byId;
}

export function buildSignalConfidenceByQuestionId(intakeSchemaSnapshot: IntakeSnapshot | null) {
  const byQuestion: Record<
    string,
    {
      signalKey: string;
      confidence: 'high' | 'medium' | 'low' | 'unknown';
      certaintyStage: 'assumed' | 'confirming' | 'confirmed';
    }
  > = {};
  const byKey = intakeSchemaSnapshot?.critical_signals?.by_key ?? {};
  const certaintyBySignal = new Map<string, 'assumed' | 'confirming' | 'confirmed'>();
  for (const entry of intakeSchemaSnapshot?.readiness?.trace ?? []) {
    const signalKey = entry.signalKey;
    if (!signalKey) continue;
    if (entry.code === 'uncertainty_closed') {
      certaintyBySignal.set(signalKey, 'confirmed');
    } else if (entry.code === 'hypothesis_confirmed' && certaintyBySignal.get(signalKey) !== 'confirmed') {
      certaintyBySignal.set(signalKey, 'confirming');
    } else if (entry.code === 'hypothesis_formed' && !certaintyBySignal.has(signalKey)) {
      certaintyBySignal.set(signalKey, 'confirming');
    }
  }
  for (const [questionId, signalKeys] of Object.entries(INTAKE_PILOT_SIGNAL_KEYS_BY_QUESTION_ID)) {
    const signalKey = signalKeys[0];
    if (!signalKey) continue;
    byQuestion[questionId] = {
      signalKey,
      confidence: byKey[signalKey] ?? 'unknown',
      certaintyStage: certaintyBySignal.get(signalKey) ?? 'assumed',
    };
  }
  return byQuestion;
}

export function buildRawQuestionList(args: {
  phase: 'form' | 'review' | 'success';
  twoPhaseWave: 'none' | 'prebrief' | 'tailored_loading' | 'tailored';
  tailoredPayload: { questions: BriefQuestion[] } | null;
  questions: BriefQuestion[];
}) {
  if ((args.phase === 'review' || args.phase === 'success') && args.tailoredPayload) {
    const byId = new Map<string, BriefQuestion>();
    for (const q of args.questions) byId.set(q.id, q);
    for (const q of args.tailoredPayload.questions) byId.set(q.id, q);
    return Array.from(byId.values());
  }
  if (args.twoPhaseWave === 'tailored' && args.tailoredPayload) {
    return args.tailoredPayload.questions;
  }
  return args.questions;
}

export function buildVisibleQuestions(args: {
  rawQuestionList: BriefQuestion[];
  responses: BriefResponses;
  twoPhaseWave: 'none' | 'prebrief' | 'tailored_loading' | 'tailored';
  tailoredLabelOverrides: Record<string, string>;
  intelligenceByQuestionId: Record<string, unknown>;
}): BriefQuestion[] {
  const filtered = args.rawQuestionList.filter(q => !(q.id === 'a11' && websitePresenceMeansNoPublicSite(args.responses)));
  return filtered.map(q => {
    const override = args.twoPhaseWave === 'tailored' && args.tailoredLabelOverrides[q.id]?.trim();
    return {
      ...q,
      ...(override ? { question: override } : {}),
      ...(args.intelligenceByQuestionId[q.id] ? args.intelligenceByQuestionId[q.id] : {}),
    };
  });
}

export function buildReadinessPanel(args: {
  answered: number;
  intakeSchemaSnapshot: IntakeSnapshot | null;
  questions: BriefQuestion[];
}) {
  const readiness = args.intakeSchemaSnapshot?.readiness;
  const state =
    args.answered === 0
      ? 'pristine'
      : readiness?.auditReadinessStatus === 'blocked' || readiness?.flowReadinessStatus === 'blocked'
        ? 'blocked'
        : 'partial';
  const questionLabelById = new Map(args.questions.map(q => [q.id, q.question]));
  const remediation = (args.intakeSchemaSnapshot?.remediation_queue ?? []).map(id => ({
    id,
    label: questionLabelById.get(id) ?? id,
  }));
  const trace = (readiness?.trace ?? []).map(item => ({
    code: item.code,
    questionId: item.questionId,
    signalKey: item.signalKey,
  }));
  return {
    state,
    flowReadinessStatus: readiness?.flowReadinessStatus ?? 'flow_ready',
    auditReadinessStatus: readiness?.auditReadinessStatus ?? 'audit_ready',
    criticalSignals: args.intakeSchemaSnapshot?.critical_signals?.by_key ?? {},
    remediation,
    trace,
  };
}
