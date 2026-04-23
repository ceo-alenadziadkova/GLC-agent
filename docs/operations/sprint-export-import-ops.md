# Sprint export: Linear / Jira import (ops)

`GET /api/audits/:id/orchestration/sprint-export` returns a **read-only projection** of the saved orchestration pack (plus optional join with the latest strategy execution pack). It does not mutate server state.

## JSON vs CSV

- **`format=json`** — includes `export_format_version`, `importer_notes`, and `rows` (see [API.md](../API.md)).
- **`format=csv`** — same row shape as a header + one row per line; use for spreadsheet and bulk import.

## Column semantics

| Column | Use |
|--------|-----|
| `epic_id` | Stable node id; good as external reference / label in trackers |
| `epic_title` | Initiative title |
| `lane` | Orchestration lane id (e.g. `gtm_sales`, `marketing_narrative`) |
| `sprint_bucket` | `now` / `next` / `later` |
| `season_index` | Season ordering when set |
| `task_order` | Task sequence within the epic |
| `task_title` | Sub-task from execution pack when present |
| `dri` | Suggested **role** label derived from `lane` (e.g. GTM/RevOps for `gtm_sales`) for import — replace with named people in your tracker. Per-node DRI in the pack graph may be added in a future schema version; until then, lane hints stay additive. |
| `success_metric` / `baseline` / `review_cadence` | From execution pack outcome when joined |

`execution_pack=0` skips the execution pack join (graph rows only).

## Linear (suggested)

1. Download **CSV** from the portal (Execution timeline) or call the API with `format=csv`.
2. Create a CSV import or use Issues API: map `task_title` to issue title, `epic_title` as parent/epic label, `lane` and `epic_id` as labels.
3. Map `sprint_bucket` + `season_index` to team columns or project milestones as needed.

## Jira (suggested)

1. Use **CSV import** (project settings → import) with column mapping; map `epic_id` to a custom text field for traceability.
2. Optionally create Epics from unique `epic_id` rows and sub-tasks from rows with `task_order > 0`.

Org-specific field mappings and automation should live in your ops wiki; this file stays product-neutral.

## Related SLO and telemetry

Orchestration reliability is monitored with `kpi_orchestration_*` metrics. See [orchestration-observability-dod4.md](./orchestration-observability-dod4.md) and [DEPLOYMENT.md — Orchestration SLO](../DEPLOYMENT.md#orchestration-slo-product-mvp).
