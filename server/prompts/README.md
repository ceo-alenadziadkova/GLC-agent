<!-- version: 1.12 date: 2026-05-06 -->
# Agent Prompts

System prompts for each AI agent, loaded at runtime via `loadPrompt(name)` in `server/src/agents/base/prompt-loader.ts`.

## Versioning

Each file has a version header comment: `<!-- version: X.Y date: YYYY-MM-DD -->`

`promptVersion(name)` extracts the version string for logging / audit trail.
The version is written to `audit_domains.prompt_version` when a domain result is saved.

## Files

| File | Agent | Phase | Domain key |
|---|---|---|---|
| `recon.md` | ReconAgent | 0 | `recon` |
| `tech_infrastructure.md` | TechAgent | 1 | `tech_infrastructure` |
| `security_compliance.md` | SecurityAgent | 2 | `security_compliance` |
| `seo_digital.md` | SeoAgent | 3 | `seo_digital` |
| `ux_conversion.md` | UxAgent | 4 | `ux_conversion` |
| `marketing_utp.md` | MarketingAgent | 5 | `marketing_utp` |
| `automation_processes.md` | AutomationAgent | 6 | `automation_processes` |
| `strategy.md` | StrategyAgent | 7 | `strategy` |
| `strategy-execution-pack.md` | StrategyExecutionPack | n/a | `strategy_execution_pack` |
| `orchestration-pack-synthesis.md` | OrchestrationPackSynthesis | n/a | `orchestration_pack_synthesis` |

### Shared append prompts

| File | Purpose | Applied by |
|---|---|---|
| `_append-domain-security-core.md` | Domain safety and redaction guardrails | Domain prompts via `prompt-loader` |
| `_append-domain-readable-output.md` | UI readability constraints for domain output | Domain prompts via `prompt-loader` |
| `_append-glc-director-execution.md` | `glc_director_execution` orchestration bundle contract | Domain prompts via `prompt-loader` |
| `_append-director-research-rigor-core.md` | Non-negotiable deep-research rigor for director sub-agents | Sub-agent prompts via `prompt-loader` |
| `_append-sub-agent-safety-core.md` | Injection resistance and strict output rules for director sub-agents | Sub-agent prompts via `prompt-loader` |
| `_append-non-domain-security-core.md` | Security and privacy guardrails for non-domain synthesis/execution prompts | `strategy`, `strategy-execution-pack`, `orchestration-pack-synthesis` via `prompt-loader` |
| `_append-pipeline-trust-boundary.md` | Canonical trust-boundary policy for pipeline phase prompts | `recon`, `strategy` via `prompt-loader` |
| `_append-runtime-output-contract.md` | Global output-format and language contract | All runtime-loaded prompts via `prompt-loader` |

### Sub-agent prompts

| File | Agent |
|---|---|
| `sub-agents/cmo/agent-3-positioning.md` | CMO Agent 3 Positioning |
| `sub-agents/cmo/agent-5-content-strategy.md` | CMO Agent 5 Content Strategy |
| `sub-agents/cmo/agent-9-traffic.md` | CMO Agent 9 Traffic |
| `sub-agents/cdo/funnel-architect.md` | CDO materialized — Funnel architect (MVP) |
| `sub-agents/cdo/friction.md` | CDO materialized — Friction |
| `sub-agents/cdo/experimentation.md` | CDO materialized — Experimentation |
| `sub-agents/cao/process-map.md` | CAO materialized — Process map |
| `sub-agents/cao/automation-candidates.md` | CAO materialized — Automation candidates |
| `sub-agents/cao/throughput.md` | CAO materialized — Throughput |
| `sub-agents/cso/case-classifier.md` | CSO materialized — Case classifier |
| `sub-agents/cso/threat-model.md` | CSO materialized — Threat model |
| `sub-agents/cso/compliance-map.md` | CSO materialized — Compliance map |

Paths are listed in `server/src/config/director-domain-materialized-prompt-refs.ts` and attached to deterministic wave actions via `evidence.derived`.

## Editing Prompts

Edit `.md` files directly. The server reads them at startup — no recompile needed.
Increment the version string when making meaningful changes so diffs are traceable.

## Rules

- One file per agent for core instructions; shared append files are allowed for cross-domain guardrails
- Always keep the version header on line 1
- No emoji in prompts (CLAUDE.md rule — emoji allowed only in `pipeline_events` messages emitted to the frontend)
- Scoring calibration tables must stay in sync with fact-check verification rules in `server/src/services/fact-checker/verify/verify-kernel.ts` and threshold constants in `server/src/config/fact-checker-thresholds.ts`
- Naming policy:
  - Core and pipeline prompt files use `kebab-case.md`
  - Domain prompt files keep canonical domain keys (`snake_case.md`) for runtime compatibility
  - Shared append files use `_append-*.md`
  - Sub-agent prompt files use `sub-agents/<team>/agent-<n>-<topic>.md`

## Runtime composition

- Domain prompts (`tech_infrastructure`, `security_compliance`, `seo_digital`, `ux_conversion`, `marketing_utp`, `automation_processes`) are extended at runtime via `prompt-loader` with:
  - `_append-domain-security-core.md`
  - `_append-domain-readable-output.md`
  - `_append-glc-director-execution.md`
- Sub-agent prompts under `sub-agents/` are extended at runtime via `prompt-loader` with:
  - `_append-director-research-rigor-core.md`
  - `_append-sub-agent-safety-core.md`
- Pipeline phase prompts (`recon`, `strategy`) are extended at runtime via `prompt-loader` with:
  - `_append-pipeline-trust-boundary.md`
- Non-domain synthesis/execution prompts are extended at runtime via `prompt-loader` with:
  - `_append-non-domain-security-core.md` (`strategy`, `strategy-execution-pack`, `orchestration-pack-synthesis`)
- Domain prompts with centralized industry guidance (`automation_processes`, `marketing_utp`, `ux_conversion`, `seo_digital`) receive an additional heuristics section from `server/src/config/prompt-industry-heuristics.ts`.
- All runtime-loaded prompts whose name is registered in `PROMPT_TOOL_NAME_MAP` get a final tool-gate sentence injected (`Use the <toolName> tool only. Output only the tool payload.`) using the canonical config constant.
- All runtime-loaded prompts are extended with:
  - `_append-runtime-output-contract.md`
- Keep these append files versioned like any other prompt file.

## Composition notes

- Domain prompt files should keep domain-specific heuristics (scoring rubrics, evidence type vocabularies), while shared safety/provenance/director rules live in append files as the source of truth.
- `recon.md` and `strategy.md` do not receive domain-only append files; trust-boundary guidance is centralized in `_append-pipeline-trust-boundary.md` and applied via `prompt-loader`.
- `recon` is observation-only: its `initial_observations` are context for downstream phases and are not subject to the per-item evidence-refs provenance contract. All other phases (6 domains, `strategy`, `strategy-execution-pack`, `orchestration-pack-synthesis`) must follow the issue/initiative provenance contract enforced by `_append-domain-security-core.md` and `_append-non-domain-security-core.md`.
- The canonical Claude tool name for each prompt is owned by config constants (`CLAUDE_DOMAIN_SUBMIT_TOOL_NAME`, `STRATEGY_EXECUTION_PACK_CLAUDE_TOOL_NAME`, `ORCHESTRATION_SYNTHESIS_CLAUDE_TOOL_NAME`) and injected into the prompt by `prompt-loader` via `PROMPT_TOOL_NAME_MAP`. Base prompt files must not hardcode the tool name.
- `sub-agents/*` prompts inherit sub-agent safety append plus global runtime output contract. Keep base sub-agent files focused on schema intent and agent-specific business logic.

## Director sub-agent prompt strength policy

- Director sub-agent prompts (`sub-agents/*`) are a deep-research contract and must stay progressive and analytically strong by design.
- Do not weaken director prompts (including CMO, CTO, and any other director track) by reducing depth, narrowing investigation scope, or downgrading reasoning requirements.
- When prompt/schema alignment work is needed, prefer strengthening schemas, validators, fallback outputs, and tests to match strong prompt intent.
- Any prompt change that could reduce analytical rigor is disallowed unless explicitly approved as a product decision.
- When adding a new director family, ship all four in the same PR: prompt file under `sub-agents/*`, strict output schema, deterministic fallback aligned to schema, and a schema-rigor regression test.

## CI regression checklist

Validate these invariants whenever prompt or loader files change:

1. `prompt-loader` append ordering for domain prompts remains:
   - domain security -> domain readability -> director execution -> runtime output contract.
2. Strict/best-effort semantics remain explicit:
   - strict phases (Tech, Security, UX, Marketing, Automation) must require valid `glc_director_execution`,
   - SEO remains best-effort but should still emit the bundle whenever feasible.
3. Every domain issue shape retains provenance keys:
   - `confidence`, `evidence_refs`, `data_source`.
4. `recon` and `strategy` keep explicit anti-injection + verified-override trust-boundary baseline despite not using domain append files.
5. Global runtime output contract remains active for all runtime-loaded prompts:
   - JSON-only payload, no extra prose/markdown, English-by-default unless runtime language overrides.
6. Director-family rigor coverage gate remains active:
   - every `server/src/schemas/sub-agents/<family>/...` must have `server/src/tests/director-<family>-schema-rigor.test.ts`.
