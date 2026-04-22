<!-- version: 1.3 date: 2026-04-22 -->
# Agent Prompts

System prompts for each AI agent, loaded at runtime via `loadPrompt(name)` in `server/src/agents/base.ts`.

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
| `_append-sub-agent-safety-core.md` | Injection resistance and strict output rules for director sub-agents | Sub-agent prompts via `prompt-loader` |
| `_append-runtime-output-contract.md` | Global output-format and language contract | All runtime-loaded prompts via `prompt-loader` |

### Sub-agent prompts

| File | Agent |
|---|---|
| `sub-agents/cmo/agent-3-positioning.md` | CMO Agent 3 Positioning |
| `sub-agents/cmo/agent-5-content-strategy.md` | CMO Agent 5 Content Strategy |
| `sub-agents/cmo/agent-9-traffic.md` | CMO Agent 9 Traffic |

## Editing Prompts

Edit `.md` files directly. The server reads them at startup — no recompile needed.
Increment the version string when making meaningful changes so diffs are traceable.

## Rules

- One file per agent for core instructions; shared append files are allowed for cross-domain guardrails
- Always keep the version header on line 1
- No emoji in prompts (CLAUDE.md rule — emoji allowed only in `pipeline_events` messages emitted to the frontend)
- Scoring calibration tables must stay in sync with `FactChecker` rules in `server/src/services/fact-checker.ts`
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
  - `_append-sub-agent-safety-core.md`
- All runtime-loaded prompts are extended with:
  - `_append-runtime-output-contract.md`
- Keep these append files versioned like any other prompt file.

## Composition notes

- Domain prompt files should keep domain-specific heuristics (scoring rubrics, evidence type vocabularies), while shared safety/provenance/director rules live in append files as the source of truth.
- `recon.md` and `strategy.md` do not receive domain-only append files; keep their own anti-injection and redaction guidance explicit in the base prompt text.
- `sub-agents/*` prompts inherit sub-agent safety append plus global runtime output contract. Keep base sub-agent files focused on schema intent and agent-specific business logic.

## CI regression checklist

Validate these invariants whenever prompt or loader files change:

1. `prompt-loader` append ordering for domain prompts remains:
   - domain security -> domain readability -> director execution -> runtime output contract.
2. Strict/best-effort semantics remain explicit:
   - strict phases (Tech, Security, UX, Marketing, Automation) must require valid `glc_director_execution`,
   - SEO remains best-effort but should still emit the bundle whenever feasible.
3. Every domain issue shape retains provenance keys:
   - `confidence`, `evidence_refs`, `data_source`.
4. `recon` and `strategy` keep explicit anti-injection + redaction baseline despite not using domain append files.
5. Global runtime output contract remains active for all runtime-loaded prompts:
   - JSON-only payload, no extra prose/markdown, English-by-default unless runtime language overrides.
