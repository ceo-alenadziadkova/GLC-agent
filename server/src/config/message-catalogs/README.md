# API message catalogs (migration plan)

Goal: keep **stable machine codes** in TypeScript (`API_ERROR_CODES`, rate-limit codes) while moving **human-readable copy** to versioned JSON so copy edits do not require redeploying logic-only changes (optional CMS workflow later).

## Conventions

- **File names:** `<domain>.v<major>.<locale>.json` (e.g. `api-errors.v1.en.json`, `rate-limit.v1.en.json`, `quality-gate.v1.en.json`).
- **Shape:** top-level object keyed by stable string id (match `API_ERROR_CODES` values or dedicated message keys). Values are strings or `{ "template": "...", "placeholders": ["name"] }` if we need interpolation.
- **Loader (future):** a thin `loadMessageCatalog(path)` used at startup or on first use; fallback to current TS modules until each domain is migrated.
- **Tests:** snapshot or parity test: every `API_ERROR_CODES.*` used in responses has an entry in the catalog for `en`.

## Suggested migration order

1. **Quality gate** — purely user-facing consultant strings; low coupling ([`quality-gate-messages.en.ts`](../quality-gate-messages.en.ts)).
2. **Rate limit** — short list, uniform shape ([`rate-limit-messages.ts`](../rate-limit-messages.ts)).
3. **API user messages** — generic HTTP/error copy ([`api-user-messages.en.js`](../api-user-messages.en.js)).
4. **API error codes** — largest surface; migrate in batches by route area ([`api-error-codes.ts`](../api-error-codes.ts)).

## Non-goals

- Do not move **error codes** or **Zod schemas** into JSON.
- Do not put secrets or per-user strings in catalogs.

## Related docs

- [`server/.env.example`](../../../.env.example) — env vs `system-defaults` policy.
- [`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md) — layer boundaries.
