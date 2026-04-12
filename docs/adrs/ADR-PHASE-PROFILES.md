# ADR-PHASE-PROFILES
## Phase-Specific Profiles: High-Risk Claim Types, Error Subtypes, and Confidence Weights per GLC Domain

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-12 |
| **Scope** | Phases 1–6 (all GLC domain audit phases) |
| **Authors** | Engineering |
| **Implements** | Sprint 1 — ADR Authoring + Schema Freeze |
| **Supersedes** | Inline domain-specific conditionals in fact-checker.ts (to be removed in Sprint 1) |
| **Superseded by** | — |

---

## ADR Lifecycle

This ADR is immutable once accepted. Adding or changing a phase profile does not require a new ADR — profiles are configuration. This ADR governs the **structure** of phase profiles; changes to the profile schema require a new ADR.

---

## Context

The FACT-CHECKER kernel (ADR-FACT-CHECKER-UNIFIED-KERNEL.md) is domain-agnostic. All domain-specific behaviour — which facts are high-risk, which external sources are authoritative, which error subtypes exist, how confidence is weighted, what feasibility risks apply — is injected via a **PhaseProfile** at runtime.

Without a formal record of these profiles, they live as undocumented inline conditionals or are scattered across configuration files. This ADR defines the canonical profile for each of the six GLC domain phases, both as documentation and as the authoritative reference for `server/src/config/phase-profiles.ts`.

---

## Decision

### 1. PhaseProfile Schema

```typescript
interface PhaseProfile {
  phase_id: string;                                // matches DOMAIN_KEYS in auditTypes.ts
  high_risk_fact_types: string[];                  // claim subtypes that receive deep verification
  external_truth_sources: string[];                // ordered list from Truth Registry (priority ascending)
  error_types: string[];                           // domain-specific error_type codes (fed to Rule Engine)
  confidence_weights: {
    factual: number;                               // must sum to 1.0 with other weights
    strategic: number;
    consistency: number;
    feasibility: number;
  };
  feasibility_risk_templates: FeasibilityRiskTemplate[];
  auto_remediation_scope: 'tone_only' | 'tone_and_content'; // Phase 9 auto-remediation gate
}

interface FeasibilityRiskTemplate {
  risk_code: string;
  condition: string;       // human-readable trigger condition description
  severity: 'low' | 'medium' | 'high';
  score_penalty: number;   // subtracted from 1.0 base score
}
```

**`auto_remediation_scope`:** Controls what Phase 9 auto-remediation is allowed to fix without human approval. `tone_only` means only absolute language softening; `tone_and_content` allows content-level fixable corrections. Security & Compliance is always `tone_only` — content corrections require human review.

---

### 2. Six Domain Phase Profiles

#### Phase 1 — Tech Infrastructure (`tech_infrastructure`)

**Domain:** System architecture, infrastructure, performance, integrations, scalability, observability.

**What makes a claim high-risk here:** Specific performance numbers (RPS, latency, uptime %), migration timelines, compatibility assertions ("runs on existing stack"), scalability guarantees.

```typescript
{
  phase_id: 'tech_infrastructure',
  high_risk_fact_types: [
    'capacity_claim',         // "handles X concurrent users / requests per second"
    'sla_commitment',         // "99.9% uptime", "< 200ms p99 latency"
    'timeline_estimate',      // "migration completes in 2 weeks"
    'stack_compatibility',    // "integrates with existing Postgres without changes"
    'scaling_assertion',      // "architecture supports global scale"
    'dependency_claim',       // "no breaking changes to downstream services"
  ],
  external_truth_sources: ['internal_metrics', 'user_brief'],
  error_types: [
    'infra_sla_overclaim',            // uptime/latency guarantee with no supporting data
    'infra_unrealistic_timeline',     // delivery timeline inconsistent with scope
    'infra_stack_mismatch',           // proposed stack conflicts with declared tech maturity
    'infra_capacity_unverified',      // performance numbers with no benchmark source
    'infra_dependency_conflict',      // downstream dependency assumptions contradict brief
  ],
  confidence_weights: {
    factual: 0.50,      // most important: are the technical facts correct?
    strategic: 0.15,    // architecture direction less critical than accuracy
    consistency: 0.25,  // cross-phase consistency (e.g. with Security recommendations)
    feasibility: 0.10,  // feasibility less weighted — tech teams have more certainty
  },
  auto_remediation_scope: 'tone_and_content',
  feasibility_risk_templates: [
    {
      risk_code: 'high_effort_low_team',
      condition: 'Recommendation requires architectural refactor and team_size < 3',
      severity: 'high',
      score_penalty: 0.25,
    },
    {
      risk_code: 'unrealistic_zero_downtime',
      condition: 'Claims zero-downtime migration for stateful/database changes',
      severity: 'high',
      score_penalty: 0.25,
    },
    {
      risk_code: 'new_tooling_no_expertise',
      condition: 'Proposes new framework/platform not present in current stack and no expertise noted in brief',
      severity: 'medium',
      score_penalty: 0.15,
    },
    {
      risk_code: 'timeline_underestimate',
      condition: 'Estimated timeline < 2× engineering complexity score',
      severity: 'medium',
      score_penalty: 0.15,
    },
  ],
}
```

---

#### Phase 2 — Security & Compliance (`security_compliance`)

**Domain:** Access control, data handling, privacy, regulatory compliance, security controls, incident response, auditability.

**What makes a claim high-risk here:** Compliance status assertions, data protection guarantees, regulatory alignment claims, security control effectiveness, breach/risk probability statements.

**Special rule:** `auto_remediation_scope: 'tone_only'` — see Section 3.

```typescript
{
  phase_id: 'security_compliance',
  high_risk_fact_types: [
    'compliance_status',         // "fully compliant with GDPR/SOC2/ISO27001"
    'data_handling_claim',       // "data is encrypted at rest and in transit"
    'regulatory_statement',      // "meets HIPAA requirements for PHI"
    'security_guarantee',        // "zero vulnerabilities in current posture"
    'access_control_claim',      // "only authorised users can access X"
    'incident_response_claim',   // "breach detected and contained within 4 hours"
    'audit_trail_assertion',     // "all actions are logged and auditable"
  ],
  external_truth_sources: ['internal_metrics', 'user_brief'],
  // Note: external_search is NOT in this list. Regulatory/compliance claims should
  // only be confirmed against the brief and internal policies, not generic web search.
  // External API connectors (Phase 7) may add certified compliance databases.
  error_types: [
    'security_overclaim',          // absolute security guarantees without qualification
    'compliance_unverified',       // compliance claim not traceable to brief or policy docs
    'privacy_conflict',            // recommendation conflicts with stated privacy policy
    'audit_trail_missing',         // auditability claimed but not supported by architecture
    'human_oversight_missing',     // automated decision with no human override path documented
    'data_retention_conflict',     // retention period claim conflicts with regulatory requirement
  ],
  confidence_weights: {
    factual: 0.55,      // highest weight: accuracy is non-negotiable in compliance context
    strategic: 0.10,    // security strategy is mostly prescriptive, less directional
    consistency: 0.25,  // cross-phase consistency critical (UX flows must respect privacy rules)
    feasibility: 0.10,
  },
  auto_remediation_scope: 'tone_only', // see Section 3 for rationale
  feasibility_risk_templates: [
    {
      risk_code: 'compliance_framework_unspecified',
      condition: 'Compliance claim references a framework not mentioned in brief',
      severity: 'high',
      score_penalty: 0.25,
    },
    {
      risk_code: 'security_control_without_implementation',
      condition: 'Security control recommended without specifying implementing technology or process',
      severity: 'medium',
      score_penalty: 0.15,
    },
    {
      risk_code: 'no_legal_review_path',
      condition: 'Legal or regulatory assertion made without recommending legal review',
      severity: 'high',
      score_penalty: 0.20,
    },
  ],
}
```

---

#### Phase 3 — SEO & Digital (`seo_digital`)

**Domain:** Search visibility, keyword strategy, indexation, content structure, analytics, traffic attribution.

**What makes a claim high-risk here:** Traffic forecasts, rank predictions, CTR estimates, competitor market share claims, conversion from organic.

```typescript
{
  phase_id: 'seo_digital',
  high_risk_fact_types: [
    'traffic_forecast',           // "this cluster will generate X monthly visits"
    'rank_promise',               // "page will reach top-3 within Y months"
    'ctr_estimate',               // "CTR will improve to Z%"
    'competitor_analysis',        // "competitor X holds 40% of this SERP"
    'search_volume_claim',        // "keyword has 10K monthly searches"
    'indexation_assertion',       // "all pages are properly indexed"
    'analytics_interpretation',   // "bounce rate indicates poor UX" (causal SEO claim)
  ],
  external_truth_sources: ['user_brief', 'external_search'],
  error_types: [
    'seo_unverified_benchmark',   // traffic/volume number with no stated source
    'seo_rank_promise',           // deterministic rank prediction
    'seo_intent_mismatch',        // content targets wrong search intent for stated audience
    'seo_indexation_overclaim',   // blanket indexation claim without crawl data
    'seo_competitor_unverified',  // competitor market share without data source
    'seo_conversion_attribution', // organic traffic causally linked to conversion without data
  ],
  confidence_weights: {
    factual: 0.45,      // important but external benchmarks often unavailable
    strategic: 0.25,    // SEO direction (clusters, intent) has high strategic value
    consistency: 0.20,  // content strategy must align with audience/ICP
    feasibility: 0.10,
  },
  auto_remediation_scope: 'tone_and_content',
  feasibility_risk_templates: [
    {
      risk_code: 'content_volume_exceeds_capacity',
      condition: 'Content plan requires > 20 articles/month and team_size < 2 content creators',
      severity: 'high',
      score_penalty: 0.20,
    },
    {
      risk_code: 'technical_seo_without_dev_access',
      condition: 'Technical SEO recommendation requires server/CMS access not confirmed in brief',
      severity: 'medium',
      score_penalty: 0.15,
    },
  ],
}
```

---

#### Phase 4 — UX & Conversion (`ux_conversion`)

**Domain:** User flows, jobs-to-be-done, friction points, information architecture, behavioral assumptions, conversion hypotheses.

**What makes a claim high-risk here:** Conversion rate change predictions, behavioral assertions ("users drop off because X"), persona-specific claims, A/B test outcome predictions.

```typescript
{
  phase_id: 'ux_conversion',
  high_risk_fact_types: [
    'conversion_hypothesis',      // "removing this field will increase form completion by X%"
    'behavior_claim',             // "users abandon at this step because of cognitive load"
    'persona_statement',          // "enterprise buyers need Y before committing"
    'ab_test_prediction',         // "variant B will outperform A by Z%"
    'funnel_metric',              // "current conversion rate is X%" (if not in brief)
    'usability_assertion',        // "this flow is confusing for first-time users"
  ],
  external_truth_sources: ['user_brief', 'internal_metrics'],
  error_types: [
    'ux_conversion_overclaim',    // deterministic conversion uplift without supporting data
    'ux_persona_conflict',        // persona definition conflicts with brief or Marketing phase output
    'ux_feasibility_gap',         // UX recommendation requires dev changes not budgeted/scoped
    'ux_behavior_unverified',     // behavioral assumption stated as fact without research source
    'ux_accessibility_gap',       // accessibility claim without audit data
    'ux_security_conflict',       // UX flow conflicts with Security/Compliance constraints
  ],
  confidence_weights: {
    factual: 0.40,
    strategic: 0.25,    // UX direction and JTBD framing has significant strategic value
    consistency: 0.25,  // must align with Marketing personas and Security constraints
    feasibility: 0.10,
  },
  auto_remediation_scope: 'tone_and_content',
  feasibility_risk_templates: [
    {
      risk_code: 'ux_redesign_without_design_resource',
      condition: 'Full UX redesign recommended without design team/budget confirmed in brief',
      severity: 'high',
      score_penalty: 0.25,
    },
    {
      risk_code: 'ab_testing_without_traffic',
      condition: 'A/B testing recommended but traffic volume too low for statistical significance',
      severity: 'medium',
      score_penalty: 0.15,
    },
  ],
}
```

---

#### Phase 5 — Marketing & UTP (`marketing_utp`)

**Domain:** ICP, awareness ladder, positioning, messaging, voice, content strategy, channels, growth loops.

**What makes a claim high-risk here:** Market size/growth numbers, channel ROI claims, competitor share, audience specifics stated as facts rather than hypotheses.

```typescript
{
  phase_id: 'marketing_utp',
  high_risk_fact_types: [
    'market_size',                // "market is $X billion and growing at Y% annually"
    'competitive_positioning',    // "3 key competitors occupy 70% of the market"
    'channel_hypothesis',         // "LinkedIn will generate X qualified leads per month"
    'audience_claim',             // "ICP company size is 50–200 employees"
    'conversion_promise',         // "this content will double inbound"
    'cac_ltv_assertion',          // "CAC < $500, LTV > $5,000"
    'growth_loop_prediction',     // "viral loop will grow user base 30% month-over-month"
  ],
  external_truth_sources: ['user_brief', 'external_search'],
  error_types: [
    'marketing_overpromise',      // deterministic growth/revenue claims without case data
    'positioning_conflict',       // different positioning in different sections of output
    'audience_mismatch',          // ICP/audience definition conflicts between agents
    'unverified_market_data',     // market size/growth claim with no cited source
    'channel_unverified_roi',     // channel ROI claim without historical data in brief
    'tone_overpromise',           // "guaranteed", "always", "100%" absolute language
  ],
  confidence_weights: {
    factual: 0.35,      // external benchmarks frequently unavailable; weight slightly lower
    strategic: 0.35,    // strategic direction and positioning has high value
    consistency: 0.20,  // cross-section consistency (audience, channels, tone)
    feasibility: 0.10,
  },
  auto_remediation_scope: 'tone_and_content',
  feasibility_risk_templates: [
    {
      risk_code: 'channel_without_budget',
      condition: 'Paid channel recommended without marketing budget confirmed in brief',
      severity: 'high',
      score_penalty: 0.20,
    },
    {
      risk_code: 'content_scale_without_team',
      condition: 'High-volume content strategy without content team or budget',
      severity: 'medium',
      score_penalty: 0.15,
    },
    {
      risk_code: 'brand_awareness_no_metrics',
      condition: 'Brand awareness campaign recommended without baseline awareness metric',
      severity: 'low',
      score_penalty: 0.07,
    },
  ],
}
```

---

#### Phase 6 — Automation & Processes (`automation_processes`)

**Domain:** Process maps, workflow automation, tool integrations, exception handling, operational efficiency.

**What makes a claim high-risk here:** Time/cost savings estimates, full automation scope claims ("this process can be 100% automated"), integration compatibility, workflow change impact.

```typescript
{
  phase_id: 'automation_processes',
  high_risk_fact_types: [
    'savings_estimate',               // "automation saves 40 hours/month"
    'automation_scope',               // "this process can be fully automated"
    'tool_integration_claim',         // "integrates with existing CRM in 2 days"
    'workflow_change_impact',         // "eliminating manual approval reduces cycle time by 60%"
    'error_rate_reduction',           // "automation reduces error rate from X% to Y%"
    'exception_handling_claim',       // "system handles all edge cases automatically"
    'compliance_automation_claim',    // "automated checks ensure ongoing regulatory compliance"
  ],
  external_truth_sources: ['internal_metrics', 'user_brief'],
  error_types: [
    'automation_unverified_savings',          // hours/cost savings without process data source
    'automation_full_replacement_claim',      // "no human needed" without exception path analysis
    'process_exception_gap',                  // automation recommended without exception/fallback design
    'workflow_control_conflict',              // automation conflicts with approval/compliance requirements
    'integration_timeline_overclaim',         // integration complexity underestimated vs. system complexity
    'automation_security_conflict',           // automated process bypasses security or audit controls
  ],
  confidence_weights: {
    factual: 0.45,      // savings/impact numbers must be grounded
    strategic: 0.15,    // process direction less ambiguous than marketing strategy
    consistency: 0.25,  // must align with Security (compliance) and Tech (integration) phases
    feasibility: 0.15,  // feasibility more important here — automation failures are operationally costly
  },
  auto_remediation_scope: 'tone_and_content',
  feasibility_risk_templates: [
    {
      risk_code: 'full_automation_no_exception_path',
      condition: 'Full automation recommended for process with documented edge cases or exceptions',
      severity: 'high',
      score_penalty: 0.25,
    },
    {
      risk_code: 'integration_without_api_access',
      condition: 'Tool integration recommended but API access or credentials not confirmed',
      severity: 'high',
      score_penalty: 0.25,
    },
    {
      risk_code: 'savings_without_baseline',
      condition: 'Time/cost savings claim made without current process baseline in brief',
      severity: 'medium',
      score_penalty: 0.15,
    },
    {
      risk_code: 'automation_compliance_risk',
      condition: 'Automated decision in regulated process (financial, medical, legal) without human oversight path',
      severity: 'high',
      score_penalty: 0.25,
    },
  ],
}
```

---

### 3. Security & Compliance Auto-Remediation Scope: `tone_only`

Phase 2 (`security_compliance`) is the only phase where `auto_remediation_scope` is set to `tone_only`. This is a deliberate safety constraint, not an oversight.

**Rationale:**
- A compliance claim (e.g. "fully compliant with GDPR") rewritten by a model without human review could create legal liability. A lawyer or compliance officer, not an AI, must vouch for any content-level correction to regulatory assertions.
- The model can safely soften absolute language ("guaranteed" → "designed to support", "zero vulnerabilities" → "no known vulnerabilities at time of assessment") without changing the legal or technical substance.
- Content-level corrections (changing the scope of a compliance claim, adding/removing regulatory frameworks, adjusting data handling assertions) always route to `human_attention_required.required = true`.

All other phases allow `tone_and_content` auto-remediation because their fixable errors do not carry the same liability exposure.

---

### 4. Universal Fallback Profile

When a phase_id is not found in `PHASE_PROFILES`, the kernel uses a universal fallback:

```typescript
FALLBACK_PROFILE: {
  phase_id: '__fallback__',
  high_risk_fact_types: ['numeric_claim', 'causal_claim', 'guarantee_claim'],
  external_truth_sources: ['user_brief'],
  error_types: ['unverified_numbers', 'risky_promise', 'tone_overpromise'],
  confidence_weights: { factual: 0.40, strategic: 0.20, consistency: 0.25, feasibility: 0.15 },
  auto_remediation_scope: 'tone_only',  // conservative default
  feasibility_risk_templates: [],
}
```

The fallback logs a warning but does not fail the pipeline.

---

## Consequences

**Positive:**
- Domain-specific risk models are explicit and reviewable in one place
- Adding a new domain (e.g. a seventh phase) = add a PhaseProfile, no kernel code change
- Different confidence weight philosophies per domain (e.g. marketing weights strategic direction higher than tech does) are encoded without special-casing
- `auto_remediation_scope` creates a clear safety boundary for Phase 9 without per-phase code branches

**Negative / Risks:**
- Profile values (penalties, weights, high-risk fact types) are initially based on domain reasoning, not empirical data. They should be revisited after Phase 10 benchmarks provide cross-industry agent performance data.
- `feasibility_risk_templates` use human-readable condition descriptions, not executable code. The FeasibilityLayer must implement matching logic separately; desync is possible. Mitigation: integration tests assert that each template condition maps to a tested code path.

---

## Implementation

**Sprint 1 deliverables:**
- Create `server/src/config/phase-profiles.ts` with the 6 profiles above + fallback
- Refactor `server/src/services/fact-checker.ts` to accept `PhaseProfile` as a required parameter (remove any inline `phase_id` conditionals)
- Update `server/src/services/pipeline.ts` to pass `PHASE_PROFILES[domainKey]` to FactCheckerService
- Unit tests: for each profile, assert that a mock claim of each `high_risk_fact_type` is classified as high-risk

---

## References

- `server/src/config/phase-profiles.ts` — implementation (Sprint 1)
- `server/src/services/fact-checker.ts` — profile injection point
- `server/src/services/feasibility-layer.ts` — feasibility_risk_templates consumer
- `server/src/config/rule-engine.ts` — error_types registered here
- `src/app/data/auditTypes.ts` — canonical DOMAIN_KEYS
- `docs/adrs/ADR-FACT-CHECKER-UNIFIED-KERNEL.md` — kernel architecture
- `docs/adrs/ADR-CONTROL-OBJECT-V2-FULL.md` — confidence_weights in schema
- `docs/adrs/ADR-AUTO-REMEDIATION.md` — Phase 9 (auto_remediation_scope consumer)
