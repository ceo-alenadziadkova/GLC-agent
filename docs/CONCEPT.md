# GLC Audit Platform — Concept and Operating Principles

This document is the stable product concept context for humans and AI assistants.
It explains what the platform is, why it exists, and how audit flows should behave.

For implementation details and contracts, use:

- [PRODUCT.md](./PRODUCT.md)
- [PIPELINE.md](./PIPELINE.md)
- [AGENTS.md](./AGENTS.md)
- [QUESTION_BANK.md](./QUESTION_BANK.md)
- [API.md](./API.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)

For the canonical product proposition (audience, value model, and control loop from findings to roadmap), see:

- [PRODUCT.md — Product proposition (who, what, why)](./PRODUCT.md#product-proposition-who-what-why)

---

## 1) What this product is

GLC is a semi-automated business audit platform for consultant-led and client self-serve use.

Problem this solves:

- Traditional audits are manual, slow, and hard to scale.
- Output quality varies depending on available consultant time.
- Small and mid-size businesses often choose tools impulsively ("need social growth", "need AI now") before diagnosing operational and process constraints.

Core value:

- Turn manual multi-day audits into structured, repeatable flows.
- Keep findings evidence-based, not assumption-based.
- Produce practical outputs: strengths, risks, improvement options, and actionable roadmaps aligned to the client's stage and intent.

Value for clients:

- Context-aware recommendations, not generic checklists.
- Clear visibility into what already works well.
- Practical priorities that fit current business reality (launch, stabilization, growth, or optimization), not one universal playbook.
- Domain scorecard with understandable priority signals.

Value for GLC:

- Faster delivery cycle from intake to actionable output.
- Repeatable process quality across audits.
- Strong product foundation for paid tiers and roadmap expansion.

---

## 2) Core operating model (data first)

The platform always follows this principle:

1. Collect context first (URL, intake responses, recon signals).
2. Verify data sufficiency for the next phase.
3. Run phase analysis only when the phase has enough signal.
4. Validate phase outputs (AI fact-check and quality checks).
5. Continue to next phase or gate.

Domain analysis is never the first step. Data readiness is.

Stage-aware principle:

- The product does not assume every client wants immediate growth.
- The system first determines business stage and decision intent, then adapts recommendation priority and depth to that context.

---

## 3) Runtime sequencing and gates (canonical pointer)

This file is **not** the canonical runtime contract for phase order, gate points, or mode-specific limits.

Use:

- [PIPELINE.md](./PIPELINE.md) for sequencing, gates, retries, and orchestration behavior
- [PRODUCT.md](./PRODUCT.md#coverage-packages-and-roadmap-toggle) for package scope and strategy toggle (`starter`, `pro`, `complete`, `include_strategy`)

Concept-level rule that remains stable here:

- The system must not claim full assessment when readiness is insufficient.
- Unknowns must remain explicit and traceable to missing evidence.

---

## 4) Competitive context (concept-level)

The concept competes across three decision alternatives:

1. Agency and consulting audits (high-touch, often slower and coordination-heavy).
2. DIY AI workflows (fast but context-fragmented without structured business memory).
3. Internal fragmented tool stacks and single-operator synthesis (knowledge silos, low repeatability).

Conceptual product stance:

- GLC is a structured, context-persistent diagnostics and prioritization layer.
- It combines system logic and expert review discipline to reduce both "generic advice risk" and "human bottleneck risk."

For canonical product-level competitor framing and market direction, see:

- [PRODUCT.md — Competitive landscape (product framing)](./PRODUCT.md#competitive-landscape-product-framing)
- [PRODUCT.md — Market expansion direction (current strategy)](./PRODUCT.md#market-expansion-direction-current-strategy)

---

## 5) Unknowns, assumptions, and evidence policy

Output semantics must stay explicit:

- `known`: supported by collected evidence or explicit client input.
- `unknown`: data is missing or not reliable enough.
- `assumption`: a provisional interpretation that requires verification.

Rules:

- Never present assumptions as facts.
- If confidence is low, mark it and route to verification.
- Every meaningful recommendation should be traceable to evidence.

---

## 6) Expert agents and intake context

Each expert domain should be fed by a structured intake slice:

- Required intake questions (minimum context to assess).
- Recommended intake questions (improves confidence and precision).
- Domain-specific instructions for business context calibration.

Agent behavior must adapt to business reality:

- industry type,
- company scale,
- operational maturity,
- website/no-website context,
- implementation constraints.

The goal is practical, context-fit recommendations, not generic best-practice dumping.

---

## 7) Verification flows by operating mode

### Consultant flow

Verification includes:

- AI fact-check and consistency checks;
- consultant mechanical/human review at configured gates.

### Self-serve client flow

Verification includes:

- AI fact-check and automated quality checks only;
- no mandatory manual consultant review in the default self-serve path.

Both flows must preserve the same truthfulness policy (`known/unknown/assumption` discipline).

---

## 8) Result model (critical but balanced)

Final outputs should classify findings in a decision-friendly way:

- What works well now.
- What can be improved.
- What is currently critical.
- What should not be changed urgently because it is already effective.

The platform should be critical, but not alarmist. "Improve everything" is not a quality output.

Recommendation relevance levels:

| Level | Meaning |
| --- | --- |
| `CRITICAL` | Immediate business risk or clear value leakage now |
| `HIGH_VALUE` | High upside with reasonable implementation effort |
| `NICE_TO_HAVE` | Useful improvement, but not urgent in this context |
| `NOT_APPLICABLE` | Not relevant for this business profile or current maturity |

---

## 9) Roadmap generation model

Roadmap is generated from selected client priorities, not from all possible findings.

Expected interaction:

1. Client (or consultant) reviews findings.
2. They select recommendation options to implement.
3. System generates a phased roadmap for selected items.

Roadmap horizons:

- 0–3 months
- 3–6 months
- 6–12+ months

Each roadmap item should include:

- objective;
- action;
- dependencies;
- expected business effect;
- implementation notes and monitoring signals.

---

## 10) Partial failure policy

If one or more domains cannot be fully assessed, the platform still returns a usable result with explicit boundaries:

- Mark domain status as `insufficient_data` or `error` where applicable.
- Keep scorecard transparent for unavailable domains (no fabricated score).
- Build strategy and roadmap from available domains only.
- Explicitly state coverage in summary (for example: "N of M domains assessed").
- Include follow-up requirements to complete missing domains later.

This preserves trust and avoids false precision.

---

## 11) Recurring audit model (future, not MVP)

To support repeat business and measurable improvement loops, the concept includes a recurring audit cycle as a planned direction:

- Client implements selected changes from roadmap.
- Platform re-checks whether changes were actually implemented.
- Platform compares previous vs current state and highlights verified progress.
- New gaps and regressions are surfaced as the next action set.

Target value:

- Clients see real progress over time, not one-off reporting.
- GLC gets a repeatable retention mechanism based on evidence of change.

This is intentionally marked as future scope and not a current MVP promise.

---

## 12) Competitor benchmark model (future, required direction)

Competitor benchmarking is a required strategic direction for future iterations, with transparent evidence boundaries.

Two benchmark modes are conceptually valid:

1. Lightweight open-source comparison (near-term):
   - compare against competitors named by the client;
   - use only open/public signals;
   - provide directional insights and differentiation opportunities.

2. Deeper benchmark baselines (longer-term):
   - maintain reusable benchmark profiles (for example niche/average/global reference sets);
   - run periodic structured benchmark audits and store them as internal comparators.

Trust and disclaimer rules:

- Competitor findings are lower-confidence than the client's own full audit.
- Every benchmark output should include an as-of date and source scope.
- Benchmark statements must clearly indicate they are based on open data and may be incomplete.

This module is conceptually important but should not be described as guaranteed full-depth core behavior in every current run.

---

## 13) Success metrics (north-star)

The concept should be evaluated by consistent quality and execution outcomes:

- End-to-end turnaround time remains predictable for each product mode.
- Low share of recommendations removed during review due to weak evidence.
- No factual inaccuracies in final deliverables after validation flow.
- Clear conversion path from snapshot/express toward deeper engagements.

---

## 14) Known limits (current)

Current limits should be explicit and reviewed over time:

- Internal-system visibility depends on provided intake and interview data.
- Some recommendations remain confidence-bounded when signals are weak.
- Competitor-style benchmarking depth is mode-dependent.
- Advanced report variants and some roadmap extras are still incremental.

---

## 15) Product intent summary

The platform is designed to be:

- evidence-led before AI interpretation;
- transparent about unknowns;
- adaptive to business context;
- useful for real execution planning.

This concept document is intentionally stable and high-level.
Detailed behavior, API contracts, and schema specifics remain in canonical technical docs listed at the top.
