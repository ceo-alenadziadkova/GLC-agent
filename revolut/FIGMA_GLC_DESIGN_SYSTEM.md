# GLC — Figma design system file

## File

- **Name:** GLC Design System  
- **URL:** https://www.figma.com/design/DwfuqT3PTp9CLv8fVEGXGJ  
- **File key:** `DwfuqT3PTp9CLv8fVEGXGJ`  
- **Team:** Alena's Team (created via Figma MCP)

Open the file in the Figma desktop or browser app to continue editing. MCP tools (`use_figma`, `get_metadata`, `get_screenshot`) use the **file key** above.

### MCP rate limits (Starter plan)

Figma **Starter** enforces a **low monthly limit** on MCP `use_figma` calls. If automation hits the paywall, continue manually in Figma or upgrade the team plan. Ready-to-paste script bodies live in [`figma-mcp/`](./figma-mcp/).

## What is in v1

### Variable collection: **GLC**

- **Modes:** `Light`, `Dark` (values aligned with `:root` and `html.dark` in [`src/styles/theme.css`](../src/styles/theme.css)).
- **Color variables** (WEB code syntax → `var(--…)` from theme):
  - Surfaces: `bg/canvas`, `bg/surface`, `bg/muted`, `bg/inset`
  - Text: `text/primary`, `text/secondary`, `text/tertiary`
  - Borders: `border/subtle`, `border/default`
  - Brand: `brand/blue`, `brand/blue-deeper`, `brand/green`, `brand/orange`, `ink/base`
- **Float variables** (spacing + radius, numeric px for design; WEB syntax documents CSS vars):
  - `space/3-5` (14px), `space/4`, `space/6`, `space/8`, `space/10` (40px) → `var(--space-3-5)` … `var(--space-10)`
  - `space/*` also scoped for **`WIDTH_HEIGHT`** (spacing bars) plus **`GAP`**.
  - `radius/md` … `radius/2xl` → `var(--radius-md)` … `var(--radius-2xl)`

**Scopes** are set per variable (fills, text, stroke, gap, width/height for spacing tokens, corner radius) — not `ALL_SCOPES`.

### Pages

- **00 Cover** — title frame + token swatches (variable-bound fills).
- **01 Foundations** — run in order via MCP (or manual plugin): [`figma-mcp/foundations-part1-styles.code.js`](./figma-mcp/foundations-part1-styles.code.js) then [`figma-mcp/foundations-part2-layout.code.js`](./figma-mcp/foundations-part2-layout.code.js). Alternatively one shot: [`continue-foundations.code.js`](./figma-mcp/continue-foundations.code.js).
- **02 Components** — [`figma-mcp/continue-button-primary.code.js`](./figma-mcp/continue-button-primary.code.js) after foundations.

## Source of truth

- **Code:** [`src/styles/theme.css`](../src/styles/theme.css)  
- **Marketing motion (not yet in Figma):** [`src/app/config/marketing-motion.ts`](../src/app/config/marketing-motion.ts)  
- **Product / marketing brief:** [`GLC_PREMIUM_DIRECTION.md`](./GLC_PREMIUM_DIRECTION.md)

When code and Figma disagree, **update Figma to match `theme.css`** (or consciously extend theme and then sync both).

## Recommended next steps (v2+)

1. **Run MCP scripts** (or upgrade plan) — [`figma-mcp/README.md`](./figma-mcp/README.md).  
2. **Primitives vs semantics** — optional second collection for raw brand hex + alias layer (see Figma DS workflow in `figma-generate-library` skill).  
3. **More components** — Button secondary / ghost, input, card, nav pill; gradient primary to match `--gradient-brand`.  
4. **Dark-mode specimens** — duplicate key frames with collection mode set to Dark.  
5. **Code Connect** — map components to `src/app/components/…` when stable.  
6. **Publish** — team library from this file when v2 is reviewed.

## MCP usage (for agents)

- Load **`figma-use`** before any `use_figma` call.  
- For full library builds, also follow **`figma-generate-library`** (phased checkpoints).  
- Always pass `skillNames` on `use_figma` when instructed by those skills.
