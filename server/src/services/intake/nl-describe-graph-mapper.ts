/**
 * Deterministic NL → bank-id hints (Phase 1). Structured answers remain authoritative;
 * this output is advisory until the full orchestrator ships (ADR-NL-TO-GRAPH-INGRESS-V1).
 */
export type NlDescribeGraphDraft = {
  inferred: Array<{
    questionId: string;
    confidence: 'low' | 'medium';
    rationale: string;
    suggestedValue: string | boolean;
  }>;
};

export function mapNlDescribeTextToGraphDraft(text: string): NlDescribeGraphDraft {
  const t = text.toLowerCase();
  const inferred: NlDescribeGraphDraft['inferred'] = [];

  if (/(e-?commerce|shopify|woocommerce|online store|marketplace seller)/.test(t)) {
    inferred.push({
      questionId: 'a2',
      confidence: 'medium',
      rationale: 'keyword_match_ecommerce_vertical',
      suggestedValue: 'ecommerce',
    });
  }
  if (/(saas|software subscription|b2b platform|api product)/.test(t)) {
    inferred.push({
      questionId: 'a2',
      confidence: 'medium',
      rationale: 'keyword_match_saas_vertical',
      suggestedValue: 'saas',
    });
  }
  if (/(hotel|hospitality|guest house|resort)/.test(t)) {
    inferred.push({
      questionId: 'a2',
      confidence: 'medium',
      rationale: 'keyword_match_hospitality_vertical',
      suggestedValue: 'hospitality',
    });
  }
  if (/(compliance|gdpr|hipaa|regulator)/.test(t)) {
    inferred.push({
      questionId: 'f1',
      confidence: 'low',
      rationale: 'keyword_match_compliance_pain',
      suggestedValue: true,
    });
  }

  return { inferred };
}
