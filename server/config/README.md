# Server configuration

- **`product.sample.yaml`** — Reference values for product modes, caps, and rate limits. The running app uses TypeScript sources (`server/src/types/audit.ts`, `server/src/middleware/rate-limit.ts`, etc.); keep this file updated when those change, or add an optional YAML loader later.
