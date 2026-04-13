# INSTRUCTIONS.md (routing index)

This file is a lightweight router to avoid duplicated instruction sets.

## Canonical instruction files

- Marketing strategy command layer: `CMO-INSTRUCTIONS.md`
- QA and testing methodology: `TESTING_INSTRUCTIONS.md`
- Engineering implementation consistency gate: `CLAUDE.md` + `docs/ARCHITECTURE.md` (layering and anti-hardcode)

## Routing rules

### Marketing and growth work

Open `CMO-INSTRUCTIONS.md` first when the task is about:

- positioning, ICP, messaging, or GTM strategy;
- content systems, distribution, traffic, and growth loops;
- marketing prioritization and 30-day execution planning.

### QA and testing work

Open `TESTING_INSTRUCTIONS.md` first when the task is about:

- test strategy and risk coverage;
- test pyramid and automation scope;
- regression gates and release quality decisions.

### Engineering implementation work (default for code changes)

Before writing code, follow this mandatory sequence:

1. Search for existing implementation/config/copy/policy modules first.
2. Reuse or extend existing patterns; avoid parallel abstractions.
3. Place values by layer:
   - ENV for infra/secrets only
   - config for system defaults/thresholds
   - feature-flags facade for rollout toggles
   - services for orchestration (not policy literals)
4. Do not add inline business magic numbers or long user-facing copy in pages/services when config/copy modules exist.

Final gate before finishing:

- no duplicated abstraction for the same concern
- no new service-level hardcoded policy literals
- no ad-hoc feature env checks outside `server/src/config/feature-flags.ts`
- changed behavior covered by targeted tests or validation

## Single source of truth policy

Do not duplicate full QA methodology or marketing orchestration in this file.
If guidance changes, update canonical files directly:

- `CMO-INSTRUCTIONS.md`
- `TESTING_INSTRUCTIONS.md`
