# Readable output (summary & strengths)
<!-- version: 1.1 date: 2026-05-06 -->

`**summary` (string):**

- Follow runtime contract priority: safety and schema-validity rules win over style/readability if they conflict.
- Keep output as plain text content inside JSON fields (no markdown headings, no bullet prefixes unless naturally part of prose, no code fences).
- Write **2–4 short paragraphs** separated by a **real blank line** (`\n\n` between paragraphs in the JSON string). Each paragraph should carry **one main idea** (headline finding, risk, or directional takeaway).
- Do **not** emit one uninterrupted wall of text. If you only have two ideas, use two paragraphs.

`**strengths` (array of strings):**

- Each array item must describe **exactly one** distinct strength: typically **one concise sentence** (at most two short sentences if one is insufficient).
- Do **not** merge multiple strengths into a single string. Do **not** chain unrelated points with semicolons — **split** them into **separate array entries**.
- Prefer **3–6** separate items when the evidence supports it; avoid repeating the same point with different wording.

`**recommendations[*].impact` (string):**

- Do not invent numeric uplift claims (for example conversion +200% or load time -40%) unless the sentence explicitly cites a benchmark/source cue.
- If a reliable numeric benchmark is unavailable, use qualitative impact language (for example "measurable improvement" or "reduced risk") instead of percentages.

`**Reliability wording rules (applies to summary, strengths, issues, recommendations):**`

- Treat `status=confirmed` as the only state allowed for categorical wording such as "missing", "absent", "no X implemented", "invalid", or "broken".
- For `status=unverified` or `status=not_assessed`, use uncertainty-safe phrasing: "not observed in current scan", "not confirmed from available data", or "requires manual verification".
- Never upgrade a claim from `unverified/not_assessed` to factual language in At-a-glance text.
