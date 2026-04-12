# GLC product glossary (translator and PM reference)

This document is the **human-readable** companion to machine-oriented sources (`ui-copy-registry.v1.json`, domain keys, question-bank ids). It reduces terminology drift during localization.

**Canonical technical IDs:** Prefer `i18nKey` values from `packages/intake-core/src/ui-copy-registry.v1.json` as the stable identifier when discussing a term across PDF, SPA, and support docs.

**Architecture:** See [ADR-FRONTEND-I18N.md](./adrs/ADR-FRONTEND-I18N.md) (stable vs unstable keys, registry as source of truth for English, question-bank rules).

---

## How to use


| Column / section        | Purpose                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| **English (canonical)** | Source string or preferred product wording (often matches `labelEn` in registry). |
| **Definition**          | Short meaning for translators; constraints (e.g. legal, not a promise).           |
| **Do not translate**    | Brand tokens, URLs, codes, proper nouns.                                          |
| **Notes per locale**    | Optional: approved renderings, length limits, regulatory notes.                   |


---

## Core audit and report terms

Populate from `ui-copy-registry.v1.json` as locales ship. Initial anchors:


| English (canonical)                           | Registry / key                            | Definition                                           |
| --------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| Domain display names (Tech, Security, SEO, …) | `glc.audit.domain.`* in registry          | Six scored audit areas; must match reports and PDFs. |
| Score band labels (Critical … Excellent)      | `glc.audit.score.1` … `glc.audit.score.5` | Ordinal labels tied to numeric score 1–5.            |


---

## Modes and routes (marketing)


| English (canonical)                                | Registry / key                      | Definition                                             |
| -------------------------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| Snapshot / Express / Full / Discovery route labels | `glc.marketing.route.*` in registry | Public product entry points; keep consistent with nav. |


---

## Intake and question bank


| Term                           | Source                                           | Notes                                                                                                            |
| ------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Question stems, hints, options | `packages/intake-core/src/question-bank.v1.json` | **Highest-risk** copy for translation; see ADR §2.5 — full QA per locale, no partial ship without Beta / policy. |


---

## Maintenance

- When **registry** or **bank** English changes, update this file in the **same PR** if translators rely on it.
- For **new** product terms, add a row **before** translators start non-English work.

---

*Stub: extend with full rows as i18n rollout progresses.*