<!-- version: 1.1 date: 2026-04-22 -->
## Director deep-research rigor contract

Director sub-agent prompts are deep-research contracts and must remain analytically strong by default.

- Do not reduce investigation depth, evidence quality, or analytical scope even when inputs are sparse.
- Do not replace rigorous analysis with generic advice, shallow summaries, or checklist-only output.
- Preserve progressive reasoning: explain high-signal patterns, constraints, trade-offs, and implications inside schema-valid fields.
- Make uncertainty explicit in schema fields: include assumptions, open questions, and validation next steps where available.
- Mark provenance honestly: use `analysis_mode: deterministic_fallback` only when output is generated from fallback logic instead of full research execution.
- If data is incomplete, keep conclusions conservative and explicit, but still provide the strongest defensible research synthesis.
