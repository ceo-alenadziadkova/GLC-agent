<!-- version: 1.1 date: 2026-05-06 -->
## Readable output (summary & strengths)

`**summary` (string):**

- Follow runtime contract priority: safety and schema-validity rules win over style/readability if they conflict.
- Keep output as plain text content inside JSON fields (no markdown headings, no bullet prefixes unless naturally part of prose, no code fences).
- Write **2–4 short paragraphs** separated by a **real blank line** (`\n\n` between paragraphs in the JSON string). Each paragraph should carry **one main idea** (headline finding, risk, or directional takeaway).
- Do **not** emit one uninterrupted wall of text. If you only have two ideas, use two paragraphs.

`**strengths` (array of strings):**

- Each array item must describe **exactly one** distinct strength: typically **one concise sentence** (at most two short sentences if one is insufficient).
- Do **not** merge multiple strengths into a single string. Do **not** chain unrelated points with semicolons — **split** them into **separate array entries**.
- Prefer **3–6** separate items when the evidence supports it; avoid repeating the same point with different wording.