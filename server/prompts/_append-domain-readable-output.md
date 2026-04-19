## Readable output (summary & strengths)

**`summary` (string):**
- Write **2–4 short paragraphs** separated by a **blank line** (use the two-character sequence newline-newline in the string so the UI can render real paragraph breaks). Each paragraph should carry **one main idea** (headline finding, risk, or directional takeaway).
- Do **not** emit one uninterrupted wall of text. If you only have two ideas, use two paragraphs.

**`strengths` (array of strings):**
- Each array item must describe **exactly one** distinct strength: typically **one concise sentence** (at most two short sentences if one is insufficient).
- Do **not** merge multiple strengths into a single string. Do **not** chain unrelated points with semicolons — **split** them into **separate array entries**.
- Prefer **3–6** separate items when the evidence supports it; avoid repeating the same point with different wording.
