# ADR-PARTIAL-AUDIT-COVERAGE-EXECUTION-PLAN

## Canonical coverage model: Starter / Pro / Complete

- Status: Accepted
- Date: 2026-04-13
- Owners: Engineering + Product
- Scope: Coverage selection, pipeline orchestration, scoring comparability, report honesty, marketing wording

## Context

Legacy positioning relied on `product_mode` labels (`express` / `full`) which conflated speed and coverage. Product now needs a clearer and technically accurate model where the client explicitly chooses analysis coverage:

- `Starter` (single domain)
- `Pro` (2-3 domains)
- `Complete` (all six domains)

Primary complexity is not prompt text. It is orchestration and integrity:

1. Execute only selected phases while preserving valid gate transitions.
2. Prevent false "complete audit" perception in reports and UI.
3. Keep score comparability honest across partial vs complete coverage.
4. Preserve runtime compatibility for legacy rows during migration.

## Decision

`audits.execution_plan` (JSONB) is the canonical runtime contract for coverage.

```json
{
  "selected_domains": ["tech_infrastructure", "security_compliance"],
  "depth": "standard",
  "source": "user_selected",
  "recommended_domains": ["tech_infrastructure", "ux_conversion"],
  "coverage_package": "pro",
  "include_strategy": true
}
```

Field semantics:

- `selected_domains[]`: domains the client explicitly wants analyzed.
- `depth`: `light | standard | deep`.
- `source`: `user_selected | system_default`.
- `recommended_domains[]`: advisory from intake heuristics; never mandatory.
- `coverage_package`: `starter | pro | complete`.
- `include_strategy`: whether final synthesis (phase 7) is enabled.

## Package constraints (enforced)

- `Starter`: exactly 1 domain, `include_strategy=false`, default depth `light`.
- `Pro`: 2-3 domains, `include_strategy=true`, default depth `standard`.
- `Complete`: exactly all 6 domains, `include_strategy=true`, default depth `deep`.

Intake stays full. Coverage choice is independent from questionnaire completeness.

## Orchestration invariants

1. Pipeline computes runnable phases from `execution_plan`, not from linear `product_mode`.
2. `start` / `next` / `retry` reject unavailable phases for the current plan.
3. Auto/analytic wings run as filtered subsets when coverage is partial.
4. Review gates are derived from executed coverage (`0`, optional `4`, optional `7`).
5. Final synthesis runs only when `include_strategy=true`.

## Report and scoring policy

Every report payload and rendered report must include coverage metadata:

- `covered_domains`
- `not_covered_domains`
- `coverage_ratio`
- `coverage_adjusted_score`
- `comparability_note`

For partial coverage:

- comparability disclaimer is mandatory;
- UI must visually expose "covered vs not analyzed";
- single-domain runs must carry explicit lower cross-domain confidence note.

## Migration and compatibility policy

Canonical writes use `execution_plan`.

Legacy compatibility remains read-only in normalization fallback:

- `free_snapshot` -> starter-like UX domain fallback
- `express` -> legacy 4-domain fallback
- `full` -> 6-domain fallback

This keeps old rows executable without backfill while product surfaces migrate to Starter/Pro/Complete wording.

## Consequences

Positive:

- Clear user choice model with explicit coverage.
- Fewer orchestration assumptions tied to old mode ceilings.
- Honest reporting and safer score interpretation.

Trade-offs:

- More complex phase planning logic.
- Additional report/UI copy burden.
- Temporary dual semantics during legacy compatibility window.

## Risks and mitigations

1. Cross-domain dependency blind spots in sparse plans.
   - Mitigation: confidence caveat + uncovered domain disclosure.
2. Misleading score comparisons across coverage levels.
   - Mitigation: coverage-adjusted score + comparability note.
3. Orchestrator edge cases with subset wings.
   - Mitigation: phase computation from selected domain set.
4. Product wording drift between backend/frontend/marketing.
   - Mitigation: synchronized rollout for API, app pages, and landing copy.

## Rollout phases

1. Schema + normalization + route guards.
2. Pipeline phase filtering + dynamic gates.
3. Coverage-aware reporting and viewer UI.
4. Frontend package/domain selection with intake recommendations.
5. Marketing/landing rewording to Starter/Pro/Complete (Snapshot/Discovery unchanged).

## Related ADRs

- Client unified roadmap UX (timeline lanes, pre-commit manifest, orchestrator projection): `ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md`

## Related files

- `server/migrations/060_audits_execution_plan.sql`
- `server/src/services/execution-plan.ts`
- `server/src/types/audit.ts`
- `server/src/routes/audits.ts`
- `server/src/routes/pipeline.ts`
- `server/src/services/pipeline.ts`
- `server/src/services/report-profiler.ts`
- `src/app/pages/NewAudit.tsx`
- `src/app/pages/ReportViewer.tsx`
- `src/app/pages/MarketingHome.tsx`
