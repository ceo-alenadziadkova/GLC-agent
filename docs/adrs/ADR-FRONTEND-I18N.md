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
- **White-label** and **fork** installs need to override **brand strings** separately from **product UI strings** (already partially addressed via `fetchPublicBrandConfig()` and server `public-brand-defaults` — i18n must not fight that boundary).

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

1. Introduce a **single i18n runtime** in the React app with **lazy-loaded** locale bundles, **default locale `en**`, and **explicit fallback** to English for missing keys.
2. Standardize on **stable message IDs** (namespaced strings, e.g. `glc.app.dashboard.title`) aligned with existing `**i18nKey**` fields in `ui-copy-registry` where they already exist; **extend** the registry pattern for app-only strings.
3. Store **translations** outside TSX in **JSON** (or PO if tooling requires) under a dedicated tree, e.g. `src/app/locales/<locale>/` — **not** scattered constants in components.
4. Use `**Intl**` APIs (or thin wrappers) for **dates, numbers, currencies, lists**; forbid hand-rolled locale-specific formatting in feature code.
5. Keep **brand** strings (`brand_name`, footer lines from public config) **separate** from **product** catalogs — brand may stay single-language per deploy or gain its own small override map later without merging into the main `glc.*` namespace.
6. **API errors**: prefer mapping `**error` response `code**` → localized string; treat raw `error` text as **fallback** for unknown codes or logging only.

### 2.2 Recommended library stack (decision)

**Primary recommendation: `i18next` + `react-i18next**`


| Criterion     | Rationale                                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Ecosystem     | Mature, widely used with React 18; large doc surface; fits Vite.                                                                         |
| Lazy loading  | `i18next-http-backend` or **static chunked imports** (`import(\`./locales/${lng}.json)`) for bundle size control.                        |
| ICU / plurals | Use `i18next-icu` + `Intl.PluralRules` or formatjs **intl-messageformat** as interpolation backend when complex plural/select is needed. |
| Key-based API | Aligns with existing `**i18nKey`** fields in `ui-copy-registry.v1.json`.                                                                 |
| SSR           | Not required for current Vite SPA; future SSR would still be supported by the same ecosystem.                                            |


**Alternatives considered**


| Option                                                      | Pros                                                 | Cons                                                   | Verdict                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| **Lingui**                                                  | Excellent DX, compile-time extraction, small runtime | Team learning curve; build macro config with Vite      | **Viable second choice** if extraction-from-source is mandatory |
| **FormatJS / react-intl**                                   | ICU-native, strong formatting                        | Heavier setup; less default convention for file layout | **Viable** if team standardizes on FormatJS everywhere          |
| **Custom lightweight `Map<locale, Record<string,string>>`** | Zero deps                                            | No plurals, no nesting, no tooling, maintenance burden | **Reject** for production scale                                 |


**Decision:** Adopt `**i18next` + `react-i18next`** for the SPA unless a future ADR records a switch (e.g. org-wide FormatJS mandate).

### 2.3 Namespace and key naming

- **Prefix:** `glc.` for all product-owned UI keys (matches existing registry style, e.g. `glc.audit.domain.tech_infrastructure`).
- **Segments:** `glc.<zone>.<feature>.<element>` where **zone** aligns with `docs/ARCHITECTURE.md` copy zones, e.g.:
  - `glc.intake.*` — wizard, brief, discover client strings not sourced from question-bank JSON
  - `glc.app.*` — authenticated shell, dashboard, pipeline monitor, settings
  - `glc.marketing.*` — public marketing (where not driven by `ui-copy-registry` rows)
  - `glc.snapshot.*` — free snapshot landing (client-side strings; server messages may stay English until API contract extends)
  - `glc.api.*` — maps from `**ApiError` / `code`** to user-facing recovery text
  - `glc.audit.*` — domain/score/report labels: **prefer importing from registry keys** rather than duplicating string literals
- **Stability:** Keys are **API** for consultants embedding help links and for **PDF parity**; changing a key is a **breaking change** — use **version suffix** or new key if semantics change (`glc.app.pipeline.status.running` → `glc.app.pipeline.status.running_v2` only when meaning changes).

### 2.4 Binding `ui-copy-registry` to runtime

- **Do not** fork English strings inside components when `ui-copy-registry` already exposes `i18nKey` and `labelEn`.
- **Pattern:**
  1. At build time or app init, ensure **English** messages for all `i18nKey` values exist in `locales/en/*.json` (can be **generated** from `ui-copy-registry.v1.json` via a small script to avoid drift).
  2. Non-English locales **override** the same keys; missing keys **fallback** to `en`.
  3. Components call `t('glc.audit.domain.tech_infrastructure')` **or** a thin helper `tRegistryKey(row.i18nKey)` that asserts the key is registered.

### 2.5 Question bank (`question-bank.v1.json`)

**Decision (phased):**

- **Phase A (MVP i18n):** Keep **one** canonical bank file per shipped **question-bank version**; add **parallel** optional files, e.g. `question-bank.v1.de.json`, **only if** product commits to **full bank translation** and **parity tests** (same ids, same option counts). Server and client must agree on **which file** loads for a given `intake_versions` tuple — this touches `**@glc/intake-core`** loaders and is a **cross-cutting** release.
- **Phase B (scale):** Move translatable fields to **message IDs** + ICU in catalogs, generated from bank export — higher tooling cost, better reuse outside JSON.

Until Phase A is approved, **intake i18n** may ship **only** for **chrome** strings (buttons, step labels) while **bank content** stays English — product must sign off on **partial localization**.

### 2.6 Public brand and white-label

- **Brand name, footer markdown, support email** continue to come from `**fetchPublicBrandConfig()`** / env for **single-tenant** strings.
- **Do not** merge arbitrary brand HTML into the core `glc.*` JSON; if localized footers are required, extend **server** `public-brand-defaults` or per-tenant DB fields with **locale-keyed** blobs in a **dedicated** namespace (`brand.footer.de`, etc.) — record in a **separate ADR** when implemented.

### 2.7 Formatting and accessibility

- **Dates/times:** `Intl.DateTimeFormat(locale, options)`; store **UTC** in data, present in **user timezone** where applicable (existing hooks may need `locale` from i18n context).
- **Relative time:** Replace or wrap `relativeTime` helpers to accept **locale** and use `Intl.RelativeTimeFormat` where possible.
- **Numbers / scores:** `Intl.NumberFormat`; **percentages** and **currency** in Strategy Lab / reports must use the same locale as UI.
- **aria-label / placeholder:** Every user-visible attribute goes through `**t()`**; add **ESLint rule** or **codemod** policy to block new raw English literals in `src/app/pages` and `src/app/components` (excluding `ui/` primitives if they stay presentational-only).

### 2.8 Testing

- **Unit tests:** Mock `i18next` instance with a **fixed locale** (`en`) for snapshot stability; add **one** integration test per critical flow that asserts **key exists** in `de` (or smoke test missing-key counter).
- **E2E:** Playwright **does not** need full matrix on day one; optional job with `?lang=de` once locale routing exists.

### 2.9 Locale persistence and routing

- **Preference order (recommended):** (1) **user profile / DB** field for authenticated users, (2) `**localStorage`** key `glc.ui.locale`, (3) `**Accept-Language**` negotiation on first visit, (4) default `en`.
- **URL strategy:** Optional `?lang=` or path prefix `/de/...` — **product decision**; ADR recommends **starting** with **query or storage** to avoid large router refactor; path-prefix requires `react-router` audit (`src/app/routes.tsx`, `SPA_ROUTE_SEGMENTS`).

### 2.10 SEO and `html lang`

- Set `document.documentElement.lang` to **active locale** on change (marketing pages, public brief).
- **hreflang** for marketing — future; coordinate with Vercel deployment and sitemap generation (out of scope for initial SPA-only i18n).

---

## 3. Consequences

### Positive

- Single **glossary** and **review** process for translators; keys stable for docs and support.
- **Reduced drift** between PDF/report labels and SPA when both use `**i18nKey`** from `ui-copy-registry`.
- Clear **migration path** from today’s English literals.

### Negative / costs

- **Bundle size** grows with locale files — mitigate with **lazy `import()`** per locale.
- **Velocity:** every new string requires **key + en + (eventually) translations**; need **CI check** for missing keys in `en`.
- **Question bank translation** is the **largest** cost item (content volume + legal accuracy for regulated industries).

### Risks


| Risk                                          | Mitigation                                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Mismatched server vs client locale for intake | Persist `**intake_versions`** + explicit `**ui_locale**` on audit row if server must render emails in user language later |
| Translators break ICU placeholders            | Use **validation** script + **translator notes** in JSON `_comments` (stripped in prod) or sidecar docs                   |
| Partial locale feels “cheap”                  | **Ship only complete** flows or **explicitly** mark Beta languages in UI                                                  |


---

## 4. Implementation phases (suggested)


| Phase | Scope                                                                                                                                               | Exit criteria                                                 |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **0** | **Tooling:** add deps, `I18nextProvider`, `src/app/locales/en/glc.json` scaffold, dev-only missing-key logging                                      | App boots; one page uses `t()`                                |
| **1** | **Registry sync:** script from `ui-copy-registry.v1.json` → keys in `en`; replace direct `labelEn` usage in **shared** components (scores, domains) | No duplicate domain/score English in TSX for touched surfaces |
| **2** | **API errors:** central `mapApiCodeToMessage(code)` using `glc.api.*` keys                                                                          | Top 20 error paths localized                                  |
| **3** | **Dashboard + shell:** `AppShell`, nav, settings, notifications                                                                                     | `de`/`es` JSON stubs ≥ 80% key coverage for these routes      |
| **4** | **Intake chrome + Discover** (bank text policy per §2.5)                                                                                            | Product-approved scope documented                             |
| **5** | **Marketing + snapshot landing**                                                                                                                    | Marketing QA sign-off per locale                              |
| **6** | `**Intl` hardening:** relative time, strategy numbers, report viewer                                                                                | Audit for raw `toFixed` / string dates                        |


Phases may be **reordered** by product priority; **Phase 1** is strongly recommended early to **lock glossary** for domains and scores.

---

## 5. Related documents and code references


| Artifact                        | Path                                                |
| ------------------------------- | --------------------------------------------------- |
| Target locales                  | `src/app/lib/supported-ui-locales.ts`               |
| UI copy registry (JSON)         | `packages/intake-core/src/ui-copy-registry.v1.json` |
| UI copy registry (TS)           | `packages/intake-core/src/ui-copy-registry.ts`      |
| Frontend i18n strategy (docs)   | `docs/FRONTEND.md` (UI languages, copy zones)       |
| Copy layering policy            | `docs/ARCHITECTURE.md` (user-visible copy layering) |
| Login copy extract              | `src/app/config/login-copy.en.ts`                   |
| Intake client sentence builders | `src/app/lib/intake-client-copy.ts`                 |
| Browser translate warning       | `src/app/components/BrowserTranslateGuard.tsx`      |
| API error type                  | `src/app/data/api-error.ts`                         |


---

## 6. Open questions (to resolve before Phase A kickoff)

1. **Minimum viable locales** for first revenue release (all six in `supported-ui-locales` vs subset).
2. **Legal / medical** copy review requirements for `de`/`es` healthcare verticals.
3. **Email templates** (Supabase auth, transactional) — separate pipeline; align **brand** language with SPA choice or always English.
4. **PDF** generation language: server must receive **locale** on export job — may require **new API** fields and **this ADR’s backend companion** later.

---

## 7. Compliance with project rules

- **No emoji** in ADR body (per repo code style for source; ADR is markdown doc — neutral).
- **No new flat `docs/*.md`** beyond quota concern: ADR lives under `**docs/adrs/**`, which is the established archive.
- **Question bank changes** remain governed by `docs/QUESTION_BANK.md` and the intake change protocol — any localized bank file must follow the **same** validation and test matrix as the English bank.

---

*End of ADR.*