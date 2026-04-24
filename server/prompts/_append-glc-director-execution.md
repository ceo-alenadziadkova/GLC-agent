<!-- version: 1.4 date: 2026-04-22 -->
## Director orchestration bundle (`glc_director_execution`)

Add this object **at the top level** of the same JSON you return from `submit_analysis` (alongside `score`, `issues`, `recommendations`, etc.).

**Canonical key:** use **`glc_director_execution` only** for all new output.
Legacy aliases (for example `director_orchestration`, `director_bundle`, `orchestration`) are supported only for backward compatibility during a deprecation window and can be downgraded, warned, or rejected by server policy in strict environments.

**Strict vs best-effort (server policy):** Tech, Security, UX, Marketing, and Automation phases may run **strict** director persistence when enabled in the deployment. In that mode, a **missing** bundle or a **schema-invalid** bundle can **fail the phase**. The **SEO** phase uses **best-effort** persistence: the phase still completes if the bundle is absent, but you should still emit a valid bundle whenever possible so the client roadmap graph stays useful.

When `glc_director_execution` is present, it must be fully valid (for example string `id` fields and scores in the `1-5` range).
For **strict phases** (Tech, Security, UX, Marketing, Automation), do **not omit** this key. Strict-mode acceptance requires a non-empty `baseline.actions` array. If evidence is incomplete, emit a conservative baseline action with explicit `evidence.missing` notes.
For **best-effort SEO**, omission is allowed by policy, but a valid minimal bundle is still preferred.

**Shape:**

- `schema_version`: must be `1`.
- `baseline`: object describing the **baseline** wave:
  - `actions`: array of objects, each with:
    - `id`: stable **string** (reuse recommendation or issue ids where possible).
    - `title`, optional `description`.
    - `impact`, `effort`, `risk`, `urgency`: integers **1–5** (evidence-backed).
    - `confidence`: `high` | `medium` | `low`.
    - `dependencies`: string ids of other actions in this bundle (empty array if none).
    - optional `evidence`: `{ observed?, derived?, assumed?, missing? }` string arrays (short bullets).
  - optional `bottlenecks`, `risks`, `zones` (short strings).
- `deep`: optional second wave with the same shape when the engagement includes deep analysis; omit if not applicable.

**Guidance:**

- For strict phases, target **3–8** high-signal `baseline.actions` derived from issues and recommendations; do not dump the entire report.
- Keep ids unique within the phase; use `dependencies` to encode sequencing instead of long prose.
- Align numeric scores with severity and urgency already stated in narrative sections.
- Use `deep` only when you have a distinct second wave of work (for example after baseline stabilization); keep the same id/discipline rules.
