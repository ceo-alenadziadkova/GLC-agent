# INSTRUCTIONS.md (routing index)

This file is a lightweight router to avoid duplicated instruction sets.

## Canonical instruction files

- Marketing strategy command layer: `CMO-INSTRUCTIONS.md`
- UX & conversion (CDO) command layer: `CDO-INSTRUCTIONS.md`
- Security & compliance (CSO) command layer: `CSO-INSTRUCTIONS.md`
- Automation & processes (CAO) command layer: `CAO-INSTRUCTIONS.md`
- Cross-domain orchestration (GLC Orchestrator / Meta-Director): `ORCHESTRATOR-INSTRUCTIONS.md`
- QA and testing methodology: `TESTING_INSTRUCTIONS.md`
- Engineering implementation consistency gate: `CLAUDE.md` + `docs/ARCHITECTURE.md` (layering and anti-hardcode)

## Routing rules

### Marketing and growth work

Open `CMO-INSTRUCTIONS.md` first when the task is about:

- positioning, ICP, messaging, or GTM strategy;
- content systems, distribution, traffic, and growth loops;
- marketing prioritization and 30-day execution planning.

### UX, conversion, and funnel work

Open `CDO-INSTRUCTIONS.md` first when the task is about:

- funnel design, decision points, and conversion economics;
- CRO, behavioral psychology (ethical), and JTBD framing;
- UX consistency, copy/microcopy, trust, and experimentation backlogs;
- analytics instrumentation gaps and measurement plans.

### Security, privacy, and compliance work

Open `CSO-INSTRUCTIONS.md` first when the task is about:

- threat modeling and attack surface mapping for a client environment;
- security control prioritization (headers/TLS/sessions/APIs) with exploitability/exposure context;
- privacy/GDPR program work, cookies/trackers governance, vendor/subprocessor risk;
- payments/PCI **scoping** and evidence discipline (never guessed precision);
- security operations metrics (MTTD/MTTR targets, monitoring coverage) and compliance program KPIs.

### Automation and process execution work

Open `CAO-INSTRUCTIONS.md` first when the task is about:

- process bottlenecks, handoff breakdowns, and operational delays;
- workflow automation design and build-vs-buy decisions;
- process economics (time/cost/frequency), TTFV, and automation value ranges;
- SSOT conflicts, automation reliability risks, and observability for workflows;
- staged rollout of automation initiatives with dependency-aware planning.

### Cross-domain orchestration and unified execution planning

Open `ORCHESTRATOR-INSTRUCTIONS.md` first when the task is about:

- resolving contradictions between domain recommendations (growth vs stability, UX vs compliance, automation vs broken process);
- building a single dependency-aware execution graph and critical path across domains;
- global prioritization under constraints (time, team capacity, risk tolerance);
- producing one coherent roadmap (not “five separate reports”).

Implementation contract (schemas, persistence, API sketch): `docs/adrs/ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md`.

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
- `CDO-INSTRUCTIONS.md`
- `CSO-INSTRUCTIONS.md`
- `CAO-INSTRUCTIONS.md`
- `ORCHESTRATOR-INSTRUCTIONS.md`
- `TESTING_INSTRUCTIONS.md`
