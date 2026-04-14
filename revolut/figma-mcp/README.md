# Figma MCP continuation scripts (GLC)

These files contain **Plugin API script bodies** intended for the Cursor **Figma MCP** tool `use_figma` (field `code`), with:

- `fileKey`: `DwfuqT3PTp9CLv8fVEGXGJ`
- `skillNames`: `figma-use,figma-generate-library`

**Plan limits:** Figma **Starter** MCP has a **low monthly call cap**. If `use_figma` returns a rate-limit error, wait for reset, upgrade the plan, or paste the script into a one-off **Figma plugin** / **Automator** run (same API, different host).

## How to run via Cursor

1. Open the `.code.js` file and copy **the entire file contents** (the script body only — no wrapper).
2. Call MCP `use_figma` with `fileKey` above and paste into `code`.
3. Check the returned JSON for `rootId` / `createdNodeIds`.

## Files

| File | Purpose |
|------|--------|
| [`foundations-part1-styles.code.js`](./foundations-part1-styles.code.js) | **Small payload** — global text styles + effect styles (`GLC / Display/*`, `GLC / Body/*`, `GLC / Shadow/*`). Run first. |
| [`foundations-part2-layout.code.js`](./foundations-part2-layout.code.js) | Page `01 Foundations` — specimen frame (typography rows, spacing bars, shadow cards). Run after part 1. |
| [`continue-foundations.code.js`](./continue-foundations.code.js) | **All-in-one** foundations (same as part1 + part2). Use when MCP allows a larger `code` payload. |
| [`continue-button-primary.code.js`](./continue-button-primary.code.js) | Page `02 Components`: `Button / Primary` (pill, `brand/blue` fill). Run after foundations. |

**Order:** part1-styles → part2-layout → button-primary.

If **MCP returns a rate-limit error** (Figma Starter), wait for the monthly reset, **upgrade the team plan**, or paste each script into a Figma plugin that runs Plugin API code (same JS as `use_figma`).

## After running

Update token inventory in [`../FIGMA_GLC_DESIGN_SYSTEM.md`](../FIGMA_GLC_DESIGN_SYSTEM.md) if you add variables or rename pages.
