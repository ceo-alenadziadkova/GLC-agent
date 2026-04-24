/**
 * GDPR-oriented metadata per question-bank id (sidecar to `question-bank.v1.json`).
 * Does not change branching or SLA; for transparency and internal compliance mapping only.
 */
import raw from './question-bank.v1.json' with { type: 'json' };

export type QuestionBankLegalBasisV1 = 'contract' | 'consent' | 'legitimate_interest';

export type QuestionBankLegalMetaRowV1 = {
  purpose: string;
  legal_basis: QuestionBankLegalBasisV1;
  sensitive: boolean;
  requires_dpa_client_ack: boolean;
};

const DEFAULT_META: QuestionBankLegalMetaRowV1 = {
  purpose: 'audit_and_service_delivery',
  legal_basis: 'contract',
  sensitive: false,
  requires_dpa_client_ack: false,
};

/** Higher-risk fields: tighten flags without embedding in the main bank JSON. */
const LEGAL_META_OVERRIDES: Partial<Record<string, Partial<QuestionBankLegalMetaRowV1>>> = {
  a10: {
    purpose: 'revenue_and_pricing_context',
    sensitive: true,
  },
  a12: {
    purpose: 'growth_and_financial_targets',
    sensitive: true,
  },
  d1a: {
    purpose: 'crm_and_sales_stack_identification',
    requires_dpa_client_ack: true,
  },
  d1b: {
    purpose: 'lead_tracking_practices',
    requires_dpa_client_ack: true,
  },
};

function buildIndex(): ReadonlyMap<string, QuestionBankLegalMetaRowV1> {
  const out = new Map<string, QuestionBankLegalMetaRowV1>();
  for (const q of raw.questions) {
    const o = LEGAL_META_OVERRIDES[q.id];
    out.set(q.id, {
      ...DEFAULT_META,
      ...o,
    });
  }
  return out;
}

const INDEX = buildIndex();

export function getQuestionBankLegalMetaForBankId(bankId: string): QuestionBankLegalMetaRowV1 | undefined {
  return INDEX.get(bankId);
}

/** All bank ids that have a legal meta row (must equal every `question-bank.v1.json` question id). */
export function listQuestionBankIdsWithLegalMeta(): string[] {
  return [...INDEX.keys()];
}
