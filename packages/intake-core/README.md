# @glc/intake-core

Shared intake engine, question bank wiring, and discovery copy.

## Diagnostic sequencing artifact

For the Diagnostic Adaptive Intake pilot, sequencing rules are loaded from:

- `packages/intake-core/src/artifacts/intake-sequencing-pilot-1.0.0.json`

Ownership model:

- runtime owner: Intake Core (Engineering),
- semantic owner: Product + Engineering (joint sign-off for rule changes).

## Post-KPI train 1 — execution-plan coverage scope

After the KPI checkpoint records `**expand**`, ops may enable `**FEATURE_EXECUTION_PLAN_COVERAGE_SCOPE=true` together with** `**FEATURE_DIAGNOSTIC_INTAKE_PILOT`** on the server. Pipeline preflight then forwards execution-plan domain selection into `evaluateIntakeReadinessEnvelope` (see `server/src/services/pipeline-routes/use-cases/intake-readiness-preflight.ts` and `packages/intake-core/src/core/intake-readiness-execution-scope.ts`). Regression coverage includes `intake-readiness-execution-scope.test.ts` and `pipeline-route.use-cases.test.ts` (applyExecutionPlanCoverageScope). Do not enable the coverage flag before Product sign-off per [INTAKE_DIAGNOSTIC_IMPLEMENTATION_CONTRACT.md](../../docs/INTAKE_DIAGNOSTIC_IMPLEMENTATION_CONTRACT.md).

## Phase-1 deferrals (YAGNI)

Do **not** implement session-level remediation reopen suppression or per-signal remediation idempotence until Product approves a tracked case. Rationale: [INTAKE_DIAGNOSTIC_IMPLEMENTATION_CONTRACT.md § Remediation idempotence (session-level, deferred)](../../docs/INTAKE_DIAGNOSTIC_IMPLEMENTATION_CONTRACT.md#remediation-idempotence-session-level-deferred). Broader `ready_with_caveats` taxonomy and convert-time `full` blocking stay out of scope until ADR/contract updates after KPI gate.

## Phase-B/C governance metadata now codified

- Caveat taxonomy metadata lives in `src/config/intake-caveat-taxonomy.ts` and provides owner/severity/rollout intent for stable caveat classes.
- Sequencing ask-slot governance metadata is carried in `src/artifacts/intake-sequencing-pilot-1.0.0.json` under `askSlotContract` and emitted as trace code `sequencing_ask_slot_contract_applied`.
- Keep these artifacts deterministic and versioned; do not add UI-local caveat semantics.

## Build

The package **exports compiled output from `dist/`** (`main` / `types` in `package.json`). After changing TypeScript sources, rebuild before consumers that run plain `tsc` (e.g. `glc-audit-server`):

```bash
pnpm --filter @glc/intake-core run build
```

From the repo root, `pnpm run typecheck` (or `pnpm --filter glc-audit-server run typecheck`) rebuilds workspace packages then runs server `tsc --noEmit`. Do **not** append a package name to that command (e.g. `run typecheck @glc/intake-core`) — pnpm would forward it to `tsc` and cause TS5083.

Server Vitest resolves `@glc/intake-core` from **source** (`server/vitest.config.ts` alias), so unit tests do not depend on `dist/` for this package.