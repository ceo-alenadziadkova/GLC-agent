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

## Editing Prompts

Edit `.md` files directly. The server reads them at startup — no recompile needed.
Increment the version string when making meaningful changes so diffs are traceable.

## Rules

- One file per agent — no sharing between agents
- Always keep the version header on line 1
- No emoji in prompts (CLAUDE.md rule — emoji allowed only in `pipeline_events` messages emitted to the frontend)
- Scoring calibration tables must stay in sync with `FactChecker` rules in `server/src/services/fact-checker.ts`
