# Client outcome measurement (OKR / check-in templates)

GLC plans include **success metrics**, **baselines**, and **review cadence** fields in execution detail packs and sprint CSV export. The platform does **not** ingest your live product analytics, CRM, or ad accounts — closed-loop proof of business outcomes remains **client-owned**.

**Telemetry note:** `kpi_orchestration_*` (see [orchestration-telemetry-policy.ts](../../server/src/config/orchestration-telemetry-policy.ts)) measures **orchestration runtime health** (timelines, pack builds, costs), not pitch quality, viral outcomes, or revenue. Do not use those keys as a proxy for business success. A hypothetical **idea-only** SKU, if product ever accepts it, would use **separate** metrics — draft table in [ADR-IDEA-ONLY-PRODUCT-LINE-PROPOSED-V1](../adrs/ADR-IDEA-ONLY-PRODUCT-LINE-PROPOSED-V1.md) (proposed, not in force until an Accepted ADR).

## Suggested practice

1. **North Star / OKR** — Copy the success metric from each initiative or execution pack row into your goal system; align one primary metric per tranche to avoid dilution.
2. **Baseline** — Record the baseline at the start of the tranche in the same tool you use to measure (sheet, Amplitude, HubSpot, etc.); the plan text is a snapshot, not an automatic data feed.
3. **Review cadence** — Use the stated cadence as a calendar check-in: compare actuals vs the plan, adjust scope, and log decisions — GLC does not send reminders.
4. **Future integrations** — Connecting CRM, warehouse, or ad APIs would be a separate product epic; keep manual export (CSV) as the contract today.

## Related code

- Sprint export: [`server/src/services/orchestration/sprint-export.service.ts`](../../server/src/services/orchestration/sprint-export.service.ts)
- UI copy: `outcomeMeasurementFooter` in [`src/app/config/strategy-lab-copy.ts`](../../src/app/config/strategy-lab-copy.ts)
