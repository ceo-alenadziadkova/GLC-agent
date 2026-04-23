# ADR: NL ingress LLM — operations checklist (V1)

**Status:** Accepted (ops + rollout; not a product ADR for wording)  
**Date:** 2026-04-23  
**Implements / extends:** [ADR-NL-TO-GRAPH-INGRESS-V1.md](./ADR-NL-TO-GRAPH-INGRESS-V1.md) (ingress contract); code in [`post-intake-nl-describe.controller.ts`](../../server/src/routes/intake/controllers/post-intake-nl-describe.controller.ts)  

## Purpose

The **LLM mapper** is only one part of production readiness. This checklist splits **shipped in repo** vs **org process** (legal, analytics).

## 1. Feature flags and defaults (server)

Canonical defaults: [`server/src/config/system-defaults/feature-flags-defaults.ts`](../../server/src/config/system-defaults/feature-flags-defaults.ts).

| Env / setting | Default (verify before prod change) | Role |
| --- | --- | --- |
| `FEATURE_NL_INGRESS_LLM` | `false` (`nlIngressLlmEnabled`) | **Master switch** — LLM path not primary until enabled. |
| `FEATURE_NL_INGRESS_LLM_ROLLOUT_MODE` | `pilot` | Allowed: `shadow` \| `internal` \| `pilot` \| `ga` (see `ROLLOUT_MODES` in [`feature-flags.ts`](../../server/src/config/feature-flags.ts)). `shadow` = LLM may run for logs only, regex stays primary; `internal` = allowlist; `pilot` = percent hash; `ga` = all eligible tokens. |
| `FEATURE_NL_INGRESS_LLM_ROLLOUT_PERCENT` | `0` | Hash-based % when mode uses percent. |
| `FEATURE_NL_INGRESS_LLM_ALLOWLIST_TOKENS` | (optional) | Canary tokens. |
| `FEATURE_NL_INGRESS_LLM_GEO_GROUPS` | empty | If set, `x-geo-group` must match. |

**Rule:** Treat **LLM off** as safe baseline; any prod promotion requires an explicit runbook + env change, not a code deploy alone.

## 2. Request safety (shipped)

- **PII scrub** before model call: emails and phone patterns → `[redacted_*]`; counts logged in shadow comparison — see `scrubNlTextPii` in controller.  
- **Idempotency:** `x-idempotency-key` with token-scoped cache (10 min TTL) for duplicate submits.  
- **Body limits:** `MAX_TEXT_LEN` (8000) enforced.  
- **Pilot gate:** `404` if `isDiagnosticIntakePilotEnabled()` is false (route not public for non-pilot).

## 3. Shadow metrics (shipped)

When `rolloutMode === 'shadow'` and `llmDraft` is available, `logger.info('nl_ingress_shadow_comparison', …)` records regex vs LLM **inferred count** and PII redaction counts — use log aggregation to compute agreement / drift KPIs. **This is not a dashboard** until wired to your observability board.

## 4. Client consent and storage (shipped, product owns copy)

- [`useIntakeBriefController.ts`](../../src/app/pages/intake-brief/hooks/useIntakeBriefController.ts) uses `localStorage` key `glc:intake:nl-consent-v1` for consent acceptance.  
- **Remaining:** final **legal** copy, consent UI placement, and whether consent must be **server-persisted** for GDPR/audit (currently client-only store).

## 5. DPA and vendor (process)

- No automatic DPA compliance from code. **Before** enabling LLM in production for end-user PII-class tenants: DPA with model provider, data retention, region, and documented **redaction** policy.  
- Update [`DEPLOYMENT.md`](../DEPLOYMENT.md) environment matrix when this path is production-approved (owner: security/ops + legal).

## 6. Runbook: promote LLM (suggested order)

1. `FEATURE_NL_INGRESS_LLM=true`, `ROLLOUT_MODE=shadow` — validate `nl_ingress_shadow_comparison` logs, no PII in payload to model.  
2. Internal allowlist only (`internal` + allowlist tokens).  
3. Pilot percent + monitoring (optional geo).  
4. GA + budget alerts (token usage not in this ADR; tie to your provider dashboard).

## References

- LLM implementation: [`nl-describe-llm-mapper.ts`](../../server/src/services/intake/nl-describe-llm-mapper.ts)  
- Heuristic fallback: [`nl-describe-graph-mapper.ts`](../../server/src/services/intake/nl-describe-graph-mapper.ts)  
- Roadmap sync: [ADR-DIAGNOSTIC-ADAPTIVE-INTAKE-ROADMAP-AUDIT.md](./ADR-DIAGNOSTIC-ADAPTIVE-INTAKE-ROADMAP-AUDIT.md)
