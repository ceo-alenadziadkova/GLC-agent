# Improvements Backlog

This document tracks product and UX improvements that are intentionally deferred.
It is a planning artifact, not a source of runtime truth.

**Engineering debt and audit follow-ups:** [TECH_DEBT.md](./TECH_DEBT.md) (separate from this product backlog).

## Frontend internationalization (i18n)

**Status:** Planned — no runtime i18n library in the SPA yet; target locales and partial key registry already exist.

**Canonical decision record:** [ADR-FRONTEND-I18N.md](./adrs/ADR-FRONTEND-I18N.md) — proposed stack (`i18next` + `react-i18next`), namespace policy (`glc.*`), binding to `ui-copy-registry.v1.json`, phased rollout (registry sync, API error maps, dashboard, intake/marketing, `Intl` hardening), question-bank translation phases, risks, and open questions (PDF/email locale, URL strategy).

**Related:** [FRONTEND.md](./FRONTEND.md) (UI languages, copy strategy), [ARCHITECTURE.md](./ARCHITECTURE.md) (user-visible copy layering), [GLOSSARY.md](./GLOSSARY.md) (translator terminology), `src/app/lib/supported-ui-locales.ts`, `packages/intake-core/src/ui-copy-registry.v1.json`.

## Intake flow split: Auto vs Consultant-assisted

### Current behavior (implemented)

- Intake can be completed with "I don't know" responses.
- Unknown responses are accepted and do not block progress by themselves.
- Audit execution proceeds in the automated flow without requiring a consultant handoff.

### Problem to solve (voice input)

The platform currently mixes language and assumptions from two operating modes:

- Fully automated flow
- Consultant-assisted flow

This can cause confusing UX copy and unclear ownership of unanswered details.

### Target behavior (planned, voice input)

Introduce explicit operating modes with clear UX and responsibilities:

1. **Auto Flow**
   - User completes intake and runs audit end-to-end automatically.
   - Unknown answers remain allowed.
   - Copy stays neutral and does not mention consultant actions.

2. **Consultant Flow**
   - User can mark unknown details for consultant review.
   - A review/handoff step is explicit and visible.
   - Consultant can clarify, enrich, or override intake answers before/after run gates.

### Initial implementation notes

- Add a first-class flow selector/state in intake and audit setup.
- Gate flow-specific copy by mode (never show consultant language in Auto Flow).
- Define handoff lifecycle and statuses for Consultant Flow.
- Keep analytics separated by flow to measure completion and quality deltas.

## Voice input for form fields (lightweight, internal-first)

### Problem to solve

Typing-heavy intake and brief forms create friction on mobile and for users who prefer dictation.
The current UX does not provide an optional voice-assisted input path.

### Target behavior (planned)

- Add optional voice dictation to selected text input fields.
- Keep manual typing as the default and always available path.
- Provide clear listening states, permission/error feedback, and explicit start/stop controls.
- Ensure graceful fallback when browser speech APIs are not supported.

### Implementation strategy

1. **MVP (no third-party dependencies)**
   - Use native browser speech APIs (`SpeechRecognition` / `webkitSpeechRecognition`) behind an internal wrapper.
   - Implement a lightweight internal hook/module (for example, `useVoiceInput`) with a stable API:
     - `start()`, `stop()`
     - `isSupported`, `isListening`
     - `transcript`, `error`
   - Integrate first with high-value intake text fields only.

2. **Hardening**
   - Normalize behavior and error handling across supported browsers.
   - Add i18n language selection defaults (for example, `en-US`, `ru-RU`) where relevant.
   - Add analytics for adoption, completion impact, and error rates.
   - Add unit tests for hook state transitions and integration tests for UI states.

3. **Fallback for reliability-critical scenarios**
   - If quality/coverage targets are not met with native APIs, add server-backed STT fallback.
   - Evaluate privacy/compliance requirements before storing or transmitting voice data.

### Notes

- Preferred path: internal, dependency-free implementation first.
- Introduce external libraries/services only if measurable UX or reliability gaps remain.
