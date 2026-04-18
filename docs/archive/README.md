# Documentation archive

This folder holds **obsolete documentation stubs only**: short pages that point to the current canonical doc. Do not use it for active reference material.

## Rules

1. **No duplicate facts.** The stub should state that the topic moved and link to `docs/<CANONICAL>.md` or `docs/adrs/<ADR>.md`.
2. **Prefer updating the canonical file** instead of adding an archive entry when a doc is renamed in git — history already tracks moves.
3. **Flat-doc quota** (`docs/*.md` ≤ 20) does not include files under `archive/` or `adrs/`.

See [MASTER.md](../MASTER.md) — Documentation governance.
