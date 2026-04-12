# ADR: Frontend internationalization (i18n) — strategy, catalog layout, and rollout


| Field               | Value                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**          | Proposed (no runtime i18n library shipped yet; architecture prep exists)                                                                   |
| **Date**            | 2026-04-12                                                                                                                                 |
| **Scope**           | React SPA (`src/app/`**), shared copy in `@glc/intake-core`, public brand surfaces, API error presentation, dates/numbers, marketing shell |
| **Supersedes**      | —                                                                                                                                          |
| **Superseded by**   | — (publish a new ADR when changing the stack choice or namespace policy)                                                                   |
| **Decision owners** | Tech Lead + Frontend Lead (TBD)                                                                                                            |


### ADR lifecycle

This record is **immutable** except for editorial fixes (typos, links). If the team later chooses a **different i18n stack** or **redefines key namespaces**, add a **new ADR** that references this file and states what changed. **Implementation may lag** this document; gaps and phased work are explicit below.

---

## 1. Context

### 1.1 Product and business drivers

- The platform is **B2B** but serves **consultants and end clients** who may prefer **German, Spanish, Catalan, Russian, Italian**, or English. Marketing pages, intake wizards, dashboards, reports, and error states must eventually render in a **user-selected or browser-negotiated locale** without duplicating business logic.
- **Trust and clarity** depend on consistent terminology (domain names, score bands, mode names) across **PDF**, **email**, **SPA**, and **API**-driven messages. Divergent translations for the same concept increase support load and break consultant workflows.
- **White-label** and **fork** installs need to override **brand strings** separately from **product UI strings** (already partially addressed via `fetchPublicBrandConfig()` and [`packages/glc-dev-brand-defaults/src/public-brand-defaults.v1.json`](../../packages/glc-dev-brand-defaults/src/public-brand-defaults.v1.json) — i18n must not fight that boundary).

### 1.2 Current technical state (baseline)

**Runtime**

- There is **no** dedicated i18n dependency in the root `package.json` (no `react-i18next`, `@lingui/*`, `react-intl`, etc.).
- User-visible English is predominantly **inline in TSX** or in **small `*.copy.en.ts` modules** (e.g. `src/app/config/login-copy.en.ts`).
- The SPA **throws at build time** if required `VITE_*` vars are missing in production (`VITE_API_URL`, `VITE_SUPABASE_*`, `VITE_SUPPORT_EMAIL`) — any i18n bootstrap must respect **same build pipeline** (Vite, tree-shaking, env injection).

**Prepared artifacts**

- **Target locale list** and display metadata for future choosers: `src/app/lib/supported-ui-locales.ts` (`GlcUiLocale`: `en`, `de`, `es`, `ca`, `ru`, `it`; `GLC_DEFAULT_UI_LOCALE = 'en'`).
- **Versioned UI registry** in `@glc/intake-core`: `packages/intake-core/src/ui-copy-registry.v1.json` plus `ui-copy-registry.ts` — rows include `**i18nKey`** and `**labelEn**` for marketing routes, domain keys, score labels (1–5), report profile labels/descriptions, markdown focus labels. Today consumers typically render **English labels**; keys exist for **future catalog binding**.
- **Stable sentinel key** for “no public website” display: `NO_PUBLIC_WEBSITE_DISPLAY_I18N_KEY` / `NO_PUBLIC_WEBSITE_DISPLAY_EN` in `@glc/intake-core` — `formatAuditWebsiteDisplay` centralizes URL vs sentinel UX.
- **Intake question bank**: `packages/intake-core/src/question-bank.v1.json` (and related UI overrides) — **large single source** of stems, hints, options; English today; structurally friendly to **per-locale JSON** or **extracted message IDs** if policy is defined.
- **Documentation**: `docs/FRONTEND.md` (UI languages, copy strategy, `code` vs `error` for API), `docs/ARCHITECTURE.md` (user-visible copy layering, single source per zone).

**Known gaps**

- **Hundreds** of strings live directly in **~140+** application TSX files (excluding `__tests__`), including buttons, headings, empty states, validation hints, Sonner toasts, and `placeholder` / `aria-label` text.
- **Dynamic sentence assembly** (e.g. `src/app/lib/intake-client-copy.ts` — follow-up expectation lines) uses **English templates**; proper i18n needs **ICU-style interpolation**, **plural/gender rules**, and **word-order safe** patterns per locale.
- **Relative time and numeric formatting** (`src/app/lib/relativeTime.ts` and similar) must become **locale-aware** via `Intl` or library helpers.
- **API errors**: responses often include English `error` strings; the documented direction is to branch on `**code**` and map to **client-owned** localized messages (see `docs/FRONTEND.md` and `src/app/data/api-error.ts` patterns).
- **Browser translation**: `BrowserTranslateGuard` warns users that Chrome auto-translate can break React; localized apps should still ship **first-party** translations to reduce reliance on DOM-mutating translators.

### 1.3 Constraints and non-goals (for first rollout)

- **Do not** call Claude or other LLMs from the browser for on-the-fly translation of UI (see project security rules). **Machine translation** of the catalog in CI or a CMS is a **separate** operational decision (quality, glossary, legal).
- **Do not** duplicate **score/domain** wording that already flows from `ui-copy-registry` / PDF pipelines — the SPA should **consume the same keys** as reporting where possible.
- **Snapshot engine** (`server/src/snapshot/**`) and **Wappalyzer-scale** rule files remain **out of scope** for SPA i18n work unless product explicitly ships localized **free-tier** copy in the API contract (that would be a **backend + ADR** extension).

---

## 2. Decision

### 2.1 Target outcome

1. Introduce a **single i18n runtime** in the React app with **lazy-loaded** locale bundles where appropriate, **default locale `en**`, and a **deliberate fallback policy** (see §2.11 — avoid “random mix” of languages in one screen).
2. Treat **registry-backed identifiers** and **ephemeral UI keys** differently (§2.3): only the former are a **cross-surface contract**; the latter may be **renamed or refactored** without versioning sprawl.
3. Make `**ui-copy-registry` the single source of truth for English** for all rows it defines; **do not** duplicate `labelEn` into `locales/en/*.json` for those keys (§2.4).
4. Store **app-only** translations outside TSX in **versioned** JSON under e.g. `src/app/locales/<locale>/` (§2.12).
5. Use `**Intl**` APIs (or thin wrappers) for **dates, numbers, currencies, lists**; forbid hand-rolled locale-specific formatting in feature code.
6. Keep **brand** strings separate from **product** catalogs (§2.6).
7. **API errors**: map `**code**` → structured UX (§2.13): localized **message** plus optional **action hints** (retry, contact support, go back), not a plain string only.

### 2.2 Recommended library stack (decision)

**Primary recommendation: `i18next` + `react-i18next**`


| Criterion     | Rationale                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Ecosystem     | Mature, widely used with React 18; large doc surface; fits Vite.                                                                |
| Lazy loading  | `i18next-http-backend` or **static chunked imports** (`import(\`./locales/${lng}/...)`) for bundle size control.                |
| ICU / plurals | Use `i18next-icu` + `Intl.PluralRules` or **intl-messageformat** as interpolation backend when complex plural/select is needed. |
| Key-based API | Works for **app-only** keys; registry keys resolve via `**tRegistryKey`** (§2.4), not duplicate EN JSON.                        |
| SSR           | Not required for current Vite SPA; future SSR would still be supported by the same ecosystem.                                   |


**Alternatives considered**


| Option                                          | Pros                                                 | Cons                                                   | Verdict                                                         |
| ----------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| **Lingui**                                      | Excellent DX, compile-time extraction, small runtime | Team learning curve; build macro config with Vite      | **Viable second choice** if extraction-from-source is mandatory |
| **FormatJS / react-intl**                       | ICU-native, strong formatting                        | Heavier setup; less default convention for file layout | **Viable** if team standardizes on FormatJS everywhere          |
| **Custom `Map<locale, Record<string,string>>`** | Zero deps                                            | No plurals, no tooling, maintenance burden             | **Reject** for production scale                                 |


**Decision:** Adopt `**i18next` + `react-i18next`** for the SPA unless a future ADR records a switch (e.g. org-wide FormatJS mandate).

### 2.3 Stable vs unstable keys (avoid treating all i18n keys as “public API”)

**Problem if everything is “frozen API”:** developers fear refactors; catalogs accumulate `*_v2`, `*_v3`; dead keys rot; quality drops.

**Decision — two tiers:**


| Tier                   | Meaning                                                                                                                                    | Examples                                                                                    | Change policy                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stable (contract)**  | Shared with **backend, PDF, emails**, or defined in `**ui-copy-registry.v1.json` / question-bank ids** — must stay aligned across surfaces | `glc.audit.domain.tech_infrastructure`, score band keys, marketing route keys from registry | Treat `**i18nKey` + registry version** as contract; change semantics only with **registry bump** and coordinated releases (same spirit as `QUESTION_BANK.md`) |
| **Unstable (UI-only)** | Strings **only** rendered in the SPA; not referenced by server or exports                                                                  | e.g. `glc.app.dashboard.header.title`, wizard chrome, empty states                          | **Refactor freely**: rename keys in one PR with catalog + call sites; **no** `_v2` suffix unless product **intentionally** keeps two meanings live            |


**Rule of thumb:** If a string is **not** in `ui-copy-registry`, **not** in persisted payloads, and **not** promised in external docs — it is **unstable UI**, not a public API.

### 2.4 `ui-copy-registry` binding — registry is primary; locales are overrides only

**Anti-pattern:** Generate `locales/en/glc.json` from the registry and ship **two** English sources (`labelEn` in JSON **and** in locale files) → drift, “why is this word different?”, surprise overrides.

**Decision:**

1. **English for every `i18nKey` in `ui-copy-registry.v1.json` comes from the registry** (`labelEn` / description fields) at runtime via a thin helper, e.g. `**tRegistryKey(key: string): string`** (or `getRegistryLabelEn(key)` + future `getRegistryLabel(locale, key)` when non-EN registry columns exist).
2. **Locale JSON files (`de`, `es`, …) hold only overrides** for those keys when translated. If a key is missing in `de`, **fallback** is: **registry `labelEn`** (not a second EN file).
3. **App-only keys** (`glc.app.*`, etc.) live in `**locales/<locale>/glc.<bundleVersion>.json`** (§2.12) and use `**t()**` as usual; English for those lives in `**en**` bundle **once**.

Optional **CI check:** assert every `i18nKey` in the registry appears in **at most** the override files for non-`en` locales — never require a duplicate EN entry in `locales/en/`.

### 2.5 Question bank — separate i18n domain; highest risk; stricter rules

The question bank is **not** “just another JSON file”. It is the **largest and riskiest** localization surface in the product.

**Why it is harder than generic UI**

- **Volume and context:** stems, hints, options, branch-specific copy; translators need **full flow context**, not isolated strings.
- **Legal / business impact:** misleading or vague wording changes **audit meaning** and client decisions (especially healthcare, finance, regulated sectors).
- **Layout:** translations vary **30–300% in length**; cards, wizards, and mobile layouts **break** without responsive design and **max-length / truncation policy**.
- **Parity:** server validation, AI readiness, and discovery mapping depend on **stable option identity**; wording must not change **canonical values** without the intake change protocol.

**Decision — treat as its own i18n domain**

- **Mandatory human review** for any locale shipped to production (no “MT-only” bank for paid modes unless product explicitly accepts risk).
- **No partial translation for a shipped locale:** either **100%** of user-visible bank strings for that locale pass QA, or that locale **does not** appear as a **complete** UI language for intake (see §2.11 — whole-locale gating / Beta).
- **Versioned per locale:** e.g. `question-bank.v1.de.json` (or equivalent) must declare **same structural version** as English (`questionBankVersion` / artifact tuple); **parity tests** (ids, option counts, branch refs) are **required** — same class of tests as English bank changes.
- **Engineering gate:** bank locale files are governed by `**docs/QUESTION_BANK.md**` and `**.cursor/rules/intake-question-bank-change-protocol.mdc**` equivalents for localized artifacts (update in same PR: canon + UI + tests + docs).

Phased delivery (**content** phases, not “easy then hard” technically):

- **Phase A:** Parallel locale file **only** when product commits to **full** translation + QA for that locale.
- **Phase B:** Optional extraction to message IDs / ICU if tooling wins outweigh migration cost.

Until then, **chrome-only** i18n (buttons, step labels outside bank) may ship **with bank still English**, with **explicit UX** that the questionnaire is EN (see §2.11).

### 2.6 Public brand and white-label

- **Brand name, footer markdown, support email** continue to come from `**fetchPublicBrandConfig()**` / env for **single-tenant** strings.
- **Do not** merge arbitrary brand HTML into the core `glc.*` JSON; if localized footers are required, extend **`packages/glc-dev-brand-defaults` public brand JSON** (or per-tenant DB fields) with **locale-keyed** blobs in a **dedicated** namespace — record in a **separate ADR** when implemented.

### 2.7 Formatting and accessibility

- **Dates/times:** `Intl.DateTimeFormat(locale, options)`; store **UTC** in data, present in **user timezone** where applicable (existing hooks may need `locale` from i18n context).
- **Relative time:** Replace or wrap `relativeTime` helpers to accept **locale** and use `Intl.RelativeTimeFormat` where possible.
- **Numbers / scores:** `Intl.NumberFormat`; **percentages** and **currency** in Strategy Lab / reports must use the same locale as UI.
- **aria-label / placeholder:** Should go through `**t()**` / registry helpers; **ESLint policy** is **warning-level** by default (§2.14), not blocking error, to avoid grinding velocity — tighten to error on `main` / release branch if desired later.

### 2.8 Testing

- **Unit tests:** Mock `i18next` with fixed locale (`en`) for snapshot stability; smoke **missing-key** behavior.
- **E2E:** Optional `?lang=` / path once routing exists; not full matrix on day one.

### 2.9 Routing and SEO — split **marketing** vs **authenticated app**

**Problem:** `?lang=` + `localStorage` is **insufficient for indexable marketing**: crawlers and **hreflang** need **stable URLs per language**.

**Decision**


| Surface                                                               | URL / state strategy                                                                   | SEO                                                                             |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Public marketing** (landing, pricing, public audit marketing pages) | Prefer **path-based** locales, e.g. `/es/...`, `/de/...` (exact shape product-defined) | **hreflang** alternates + sitemap entries per locale; `html[lang]` matches path |
| **Authenticated app** (dashboard, pipeline, intake after login)       | `**localStorage**` / user profile + optional `**?lang=**` for deep links               | **noindex** or low SEO priority; focus on **consistent in-app language**        |


The SPA may implement **both** routers or a **single router** with different segment rules — the **invariant** is: **do not** use “query-only” as the **only** story for content you need **indexed** in multiple languages.

### 2.10 `html lang` and document metadata

- Set `**document.documentElement.lang**` to the **active locale** on change for every public route.
- Marketing **hreflang** and **canonical** rules are **product + SEO** owned; engineering provides **routing hooks** and **per-locale static paths** where Vercel prerender or SSR applies.

### 2.11 Fallback and mixed-language UX (product-critical)

**Problem:** Per-key fallback to English produces **mixed UI** (e.g. Spanish button + English error) which users read as a **bug**.

**Decision — pick one product policy (recommendation in bold)**

1. **Whole-app fallback:** If **coverage** for locale `L` is **below threshold** `X%` (defined per release, e.g. 95% of **stable** keys + agreed **app** namespaces), **do not** present `L` as a full UI language — **force `en**` or hide `L` from the chooser.
2. **Beta locales:** Show `**L**` only with a **visible “Beta / partial translation”** badge; still prefer **whole-screen** consistency: either **all** strings in `L` for that flow or **fallback entire shell** to `en` for that session (stricter, simpler to explain).
3. **Never** silently mix languages on **one** wizard step or **one** modal without **explicit** “This section is only available in English” copy (edge case only).

Product sets `**X**` and **which namespaces** count toward coverage (registry keys, `glc.app.*`, bank, etc.).

### 2.12 Locale bundle versioning and file layout

- Align message bundles with **registry / product versions**, e.g. `src/app/locales/de/glc.v1.json` (or `glc.app.v1.json` split by namespace) so **breaking catalog changes** bump **bundle version** and CI can detect **stale** translation files.
- **Question bank** artifacts already use **explicit version tuple**; locale-specific bank files must **match** the same **question bank version** as English.

### 2.13 API error presentation — message + action hints

- Keep mapping `**error.code` → structured object**, not a single flat string:
  - `**messageKey**` or resolved `**message**` (localized)
  - `**severity**` (info / warning / error)
  - `**actions**`: optional list, e.g. `{ type: 'retry' }`, `{ type: 'contact_support', hrefKey: '...' }`, `{ type: 'navigate', path: '...' }`
- Raw `**error**` string from server remains **fallback** for unknown codes and **logging**, not the primary UX.

### 2.14 ESLint / static analysis for raw strings

- **Default:** `**eslint-plugin-i18next` or custom rule at `warn**`, not `error`, in `**src/app/pages**` and `**src/app/components**`.
- **Exclusions:** `**/__tests__/**`, `*.test.tsx`, **prototyping** paths if any, `**src/app/components/ui/****` (presentational primitives), and **explicit** `// i18n-ignore` with reason (reviewed in PR).
- **Tighten** to `error` on release branch or after catalog maturity if the team agrees.

### 2.15 Runtime performance — avoid English “flash” then swap

**Risks:** lazy-loaded JSON causes **first paint in English** then **language flip** → jarring “FOUC-like” text shift.

**Decision**

- **Resolve initial locale synchronously** before first meaningful render where possible: read `**localStorage` / profile bootstrap** in `**main.tsx` / root loader**; `**await i18next.init()**` (or preload **current** locale chunk) **before** `ReactDOM.createRoot(...).render` **or** behind `**Suspense**` with a **single** loading shell that does not show final copy.
- **Preload** the **active** locale’s bundles on **language switch** before swapping (small spinner acceptable).
- **Cache** loaded locale JSON in memory; optional **Service Worker** later — not required for MVP.

---

## 3. Observability and glossary

### 3.1 Missing-key monitoring (production maturity)

- Emit **metrics** (or structured logs): `**i18n_missing_key_total**` (labels: `locale`, `key`, `namespace`) — **must-have** before calling i18n “production-grade”.
- **Dev:** `saveMissing: true` / dedicated handler to **console** or **overlay** in staging.
- **Alerting:** threshold on missing keys for **non-Beta** locales post-release.

### 3.2 Translator glossary (B2B terminology)

- **Technical canonical terms** already live in `**ui-copy-registry**` and **domain keys** — reuse `**i18nKey**` as glossary IDs where possible.
- Maintain a **human-readable** glossary for translators and PM: `**docs/GLOSSARY.md**` — canonical **English term**, **definition**, **do-not-translate** (product name, legal), **approved translations** per locale (filled as locales ship). Link from `**docs/QUESTION_BANK.md**` / `**docs/FRONTEND.md**` when glossary grows.

---

## 4. Consequences

### Positive

- **Registry** stays **one English source**; no duplicate EN in locale files for registry keys.
- **Refactor-friendly** **UI-only** keys without pretending every string is a semver API.
- Clear **marketing vs app** routing story for **SEO**.
- **Actionable** error UX beyond plain text.

### Negative / costs

- **Bundle size** and **preload** tradeoffs need measurement.
- **Coverage gating** and **Beta** badges require **product + eng** alignment.
- **Question bank** localization remains the **largest** cost and **highest** regression risk.

### Risks


| Risk                                 | Mitigation                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------- |
| Registry vs override drift           | **No** `locales/en` duplicates for registry keys; CI + `tRegistryKey` only |
| Mixed-language UX                    | §2.11 whole-locale / Beta policy                                           |
| Layout breaks from long translations | Design review + max lengths + responsive rules for bank cards              |
| Mismatched server vs client locale   | Persist `**ui_locale**` on audit / user profile when emails/PDF must match |


---

## 5. Implementation phases (suggested)


| Phase | Scope                                                                                                                                      | Exit criteria                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| **0** | Tooling: `i18next`, provider, **sync init** / Suspense, `**tRegistryKey**` reading registry, `**locales/de/glc.v1.json**` override example | No visible language flash on reload for chosen locale |
| **1** | Replace inline **domain/score** labels with `**tRegistryKey**`; **no** generated `en` JSON from registry                                   | TSX uses registry for all registry-defined labels     |
| **2** | `**mapApiCodeToUserError(code)**` → message + actions (`glc.api.*`)                                                                        | Top error paths return structured UX                  |
| **3** | Dashboard + shell `**glc.app.***` in versioned JSON                                                                                        | Coverage ≥ threshold or **Beta** badge per §2.11      |
| **4** | Intake **chrome**; bank policy per §2.5                                                                                                    | Product-signed scope                                  |
| **5** | Marketing **path locales** + **hreflang** hooks                                                                                            | SEO checklist signed off                              |
| **6** | `**Intl**` hardening + missing-key **metrics**                                                                                             | Dashboards live                                       |


Phases may be **reordered** by product priority.

---

## 6. Related documents and code references


| Artifact                        | Path                                                |
| ------------------------------- | --------------------------------------------------- |
| Target locales                  | `src/app/lib/supported-ui-locales.ts`               |
| UI copy registry (JSON)         | `packages/intake-core/src/ui-copy-registry.v1.json` |
| UI copy registry (TS)           | `packages/intake-core/src/ui-copy-registry.ts`      |
| Translator glossary (human)     | `docs/GLOSSARY.md`                                  |
| Frontend i18n strategy          | `docs/FRONTEND.md`                                  |
| Copy layering                   | `docs/ARCHITECTURE.md`                              |
| Login copy extract              | `src/app/config/login-copy.en.ts`                   |
| Intake client sentence builders | `src/app/lib/intake-client-copy.ts`                 |
| Browser translate warning       | `src/app/components/BrowserTranslateGuard.tsx`      |
| API error type                  | `src/app/data/api-error.ts`                         |


---

## 7. Open questions (to resolve before Phase A kickoff)

1. **Threshold `X**` for whole-app fallback (§2.11) and **Beta** eligibility.
2. **Marketing path prefix** shape (`/es` vs `/es/` vs locale subdomain).
3. **Minimum viable locales** for first revenue release.
4. **Legal / medical** review for bank + registry strings per vertical.
5. **Email templates** and **PDF** locale — **backend** fields and companion ADR.
6. **Metrics backend** (Prometheus / logging vendor) for `i18n_missing_key_total`.

---

## 8. Compliance with project rules

- **No emoji** in ADR body.
- ADR lives under `**docs/adrs/**`.
- **Question bank** changes remain governed by `**docs/QUESTION_BANK.md`** and the intake change protocol — localized bank files follow the **same** validation and test discipline as English.

---

*End of ADR.*