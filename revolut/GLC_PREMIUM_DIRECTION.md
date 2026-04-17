# GLC marketing home — premium direction (design-system aligned)

This document **replaces ad-hoc CSS snippets** with guidance mapped to the **GLC design system** and **current codebase**. Use it as a product/design brief for evolving the public home (`MarketingHome`) toward a **high-end B2B product brand** without copying Revolut’s layout or voice.

**Related references**
- **Figma design system file (tokens v1):** [`FIGMA_GLC_DESIGN_SYSTEM.md`](./FIGMA_GLC_DESIGN_SYSTEM.md)
- Revolut extraction (visual inspiration only): [`DESIGN.md`](./DESIGN.md)
- Theme tokens: [`src/styles/theme.css`](../src/styles/theme.css)
- Marketing motion constants: [`src/app/config/marketing-motion.ts`](../src/app/config/marketing-motion.ts)
- Home implementation: [`src/app/pages/MarketingHome.tsx`](../src/app/pages/MarketingHome.tsx)
- Blocks: [`DecisionPath`](../src/app/marketing/blocks/DecisionPath.tsx), [`AuditCompare`](../src/app/marketing/blocks/AuditCompare.tsx), [`NextStepsCta`](../src/app/marketing/blocks/NextStepsCta.tsx), [`MarketingSection`](../src/app/marketing/blocks/MarketingSection.tsx)
- Packaging copy (do not break nav semantics): [`src/app/data/marketing-workspace-packaging.en.json`](../src/app/data/marketing-workspace-packaging.en.json)

---

## 0. Locked assumptions (product, audience, release)

Stakeholder answers consolidated for design and implementation. Treat as **default context** unless product explicitly overrides.

### Audience and promise

- **Primary reader**: business **owner, director, or chief manager** — not procurement-first or a narrow “consultants only” frame.
- **Buying pattern**: fits **CTO-as-a-service / audit + implementation** for companies **without a strong in-house tech org**; the decider is usually **business-side** and needs a **clear entry** and **sense of control**.
- **Brand promise**: **human-led consulting, supported by an internal system** — do not position as a loud “pure AI” vendor. Visual language should feel **advisory and product-led**, calmer than consumer fintech lifestyle marketing.

### Primary CTA and funnel

- **First success** on the home page: entering the **brief / context flow** (productized intake, discovery, first “wow” via snapshot or guided briefing) — **not** registration alone as the only metric.
- **Primary CTA direction**: **Start with Brief** or **Start with your context** — avoid defaulting to enterprise-style **request a demo** in the hero.
- **Experimentation**: expect **A/B or variants** on hero (copy, CTA label, visual treatment) with metrics such as **start rate**, **conversion to first workspace**, **drop-off**. Keep hero and CTA strings **data-driven** (JSON / CMS-style modules) so tests do not require rewriting the page.

### Language and layout headroom

- **EN-first** today; **Spanish** (e.g. `glctech.pro/es`) is **likely later**.
- **Design implication**: avoid **overly narrow hero buttons** and **over-tight line packing** — Spanish UI copy will **run longer**.

### Brand system and references

- **Formal marketing brand book / Figma system** for this surface is **not confirmed** — default to **`theme.css` tokens** and **in-repo** marketing patterns until a separate kit exists.
- **Revolut**: adopt **motion discipline, surface quality, reveal rhythm, premium calm** — **not** literal fintech clone (composition, lifestyle tone, or palette).
- **Additional references**: over time add **one or two B2B / product-marketing** sites to steer away from pure consumer-fintech feel.
- **Screenshots**: for a tight style pass, use **3–5 captures** (hero desktop, one mid-page section, cards/table section, mobile hero); live sites may be blocked or change.

### Dark mode (marketing)

- **Keep dark theme** for continuity with the product; on marketing prefer **the same surfaces, contrast, and motion tokens** — **no** separate “dramatic” dark art direction that diverges from the app.

### Legal and copy governance

- **Copy approval**: today likely **founder / product strategist**; for a commercial GLC front, assume **final copy sign-off** sits with the **team**, not engineering alone.
- **Disclaimers**: no requirement stated for heavy regulated blocks (not financial / medical advice). If copy stresses AI, automation, or audit outputs, consider **light** wording on **human-led review** and **context-dependent** recommendations.

### Technical baseline

- **Browsers**: assume **evergreen**; **always verify Safari** for motion and fine layout.
- **Performance**: page should feel **light** — prefer **CSS, Motion, and surfaces** over heavy **video** backgrounds and large animation payloads as the core experience.

### Motion and accessibility

- **Motion tone**: **premium and calm** — reveal, stagger, subtle hover lift, layered depth, state transitions — **no** aggressive parallax or long “cinematic” motion that hurts B2B seriousness.
- **Accessibility**: treat **WCAG 2.1 AA-oriented** practice as the **default for marketing** too (contrast, visible focus, **`prefers-reduced-motion`** — already wired in Motion where used).

### Practical definition of done

- Strong **visual / style pass**, **desktop and mobile** checked, **conversion logic preserved**, **no accessibility regressions**, tests updated where behaviour is covered.

---

## 1. Strategic intent (unchanged)

- **Product**: strategic audit / workspace platform — not a consumer fintech landing.
- **Content architecture is already sound**: hero, who we are, what we do, entry paths, coverage tiers, outcomes, FAQ, next steps — **no new information architecture**; the gap is **premium delivery** (visual hierarchy between blocks, varied section rhythm, calm motion), not more sections.
- **Perceived weakness to fix**: the page can read as **one long text column** with **repetitive rhythm** (heading → paragraph → list → link). High-end feel needs **contrast between dense and airy bands**, **different surfaces**, and **restraint in motion** — not louder colors or gimmicks.
- **What to borrow from “fintech polish” (not clone)**: smooth reveals, premium surfaces, soft hovers, **layered hero visual** — GLC stays **strategic audit platform** with a **serious advisory** voice (see §0).
- **Goal**: shift perception from “neat product site” to **polished product brand** via **motion, surfaces, rhythm, and hero visual** — not new information architecture.
- **Principle**: **controlled contrast** — calm neutrals, clean type, generous spacing, **one strong accent for primary CTA** (`--gradient-brand` / `--glc-blue` family). Avoid loud glows, heavy gradients-as-decoration, 3D clutter, or motion that **cheapens** B2B audit positioning.

---

## 2. Do not change (brand + IA)

- **Navigation / product framing**: Snapshot · Focus · Context · Strategy · Brief (and related routes) — this is established product language.
- **Strategic, slightly serious copy tone** — strengthen through layout and motion, not by imitating fintech marketing copy.
- **Layering rules**: business copy lives in JSON/copy modules; motion thresholds stay in [`marketing-motion.ts`](../src/app/config/marketing-motion.ts) (or `theme.css` for pure CSS). Avoid new magic numbers in JSX.

---

## 3. Token mapping (use these instead of raw RGBA in examples)

| Concept in brief | GLC token / module |
|------------------|-------------------|
| Page background | `var(--bg-canvas)` |
| Card / panel surface | `var(--bg-surface)`, `var(--bg-elevated)` |
| Muted band / inset | `var(--bg-muted)`, `var(--bg-inset)` |
| Borders | `var(--border-subtle)`, `var(--border-default)` |
| Primary text | `var(--text-primary)` |
| Secondary / tertiary | `var(--text-secondary)`, `var(--text-tertiary)` |
| Accent (CTA, links) | `var(--gradient-brand)`, `var(--glc-blue)`, `var(--glc-blue-deeper)` |
| Radius (cards, large panels) | `var(--radius-xl)`, `var(--radius-2xl)` |
| Subtle elevation (if ever needed) | Prefer `var(--shadow-xs)` / `var(--shadow-sm)` — GLC marketing already biases **flat**; use shadow sparingly. |
| Glass-style panels (optional) | `var(--glass-bg)`, `var(--glass-border)`, `var(--glass-blur)`, `var(--glass-shadow)` — only if contrast and dark mode are verified. |
| Easing (CSS) | `var(--ease-fast)`, `var(--ease-base)`, `var(--ease-slow)` in `theme.css` (each bundles **duration + cubic-bezier** — see values below) |
| Easing (JS / Motion) | `MARKETING_MOTION_EASE_PREMIUM`, `MARKETING_MOTION_EASE_BILLBOARD` in [`marketing-motion.ts`](../src/app/config/marketing-motion.ts) |
| Card grid gap “20px” | `gap: var(--space-5)` (20px in `theme.css`) |
| Card padding “28px” | `padding: var(--space-7)` (28px) |

**Canonical CSS transition timings today** (`theme.css`): `--ease-fast` **150ms**, `--ease-base` **220ms**, `--ease-slow` **360ms**, same curve `cubic-bezier(0.16, 1, 0.3, 1)`. If a brief asks for **180 / 420 / 700ms**, **do not hardcode in components** — add named tokens in `theme.css` and/or [`marketing-motion.ts`](../src/app/config/marketing-motion.ts) first, then consume.

**Note:** Example snippets with `rgba(255,255,255,.72)` or `border-radius: 24px` should be translated to **`--glass-*` / `--bg-surface` + `color-mix`** and **`--radius-2xl`** (22px) unless design explicitly extends the radius scale in `theme.css`. **`clip-path … round 24px`** in a reference snippet → prefer **`var(--radius-2xl)`** (22px) or **`var(--radius-xl)`** (16px) for consistency unless product approves a new radius token.

---

## 4. Motion system (actual implementation path)

Today the home uses **`motion/react`** + shared constants — not `[data-reveal]` + `IntersectionObserver`. **Prefer extending that pattern** so behavior stays consistent and `useReducedMotion()` is honored everywhere.

| Brief concept | GLC equivalent / action |
|---------------|-------------------------|
| Fade + slight `translateY` for text blocks | Already: [`MarketingSection`](../src/app/marketing/blocks/MarketingSection.tsx) uses `MARKETING_SECTION_MOTION` + `MARKETING_MOTION_EASE_PREMIUM`. |
| “Reveal mask” (clip-path) for large panels | **Extend** [`MARKETING_BLOCK_REVEAL`](../src/app/config/marketing-motion.ts) or add a small wrapper component that animates `clipPath` / `opacity` with the same ease — mirror `prefers-reduced-motion` (instant settle). |
| Staggered children inside a section | Already partially on home (lists, outcomes). Reuse `MARKETING_LIST_STAGGER` / `MARKETING_CARD_MOTION` or add `MARKETING_STAGGER_CHILD_MS` in config if CSS-style nth-child delays are needed. |
| Threshold ~0.14 | Motion `whileInView` uses `viewport.margin` from `MARKETING_SECTION_MOTION.viewportMargin` — tune there rather than one-off values. |

**Optional future:** a thin CSS `[data-reveal]` layer is acceptable **only** if it reads the same duration/ease tokens from `theme.css` and duplicates reduced-motion rules — avoid two competing motion systems without a clear split (CSS for static marketing pages vs Motion for React).

---

## 5. Section rhythm (contrast between blocks)

Aim for **three levers** (already partially present; make them **intentional**):

1. **Vertical breathing room** — alternate `mt-*` / section `padding` using spacing scale in `theme.css` (`--space-*`), not arbitrary pixels.
2. **Surface alternation** — e.g. hero on canvas + radial mesh; a band on `var(--bg-muted)` or `var(--bg-surface)` with border; “air” sections with minimal chrome; dark band using existing `var(--gradient-ink-rich)` pattern (see client dashboard block on home).
3. **Inner stagger** — eyebrow → title → body → CTA within hero and key sections (hero already staggers; extend to “what we do” / outcomes intros if needed).

---

## 6. Hero: two columns + layered “audit cockpit”

**Intent:** Keep current headline and CTAs (left). Add a **right column** (or below on small screens) with a **layered panel stack** (pseudo-dashboard, progress rail, stacked cards) that:

- Enters with **mask or opacity choreography** (not aggressive bounce from below).
- Uses **subtle hover parallax** or layer shift — respect `useReducedMotion()`.

**Implementation sketch**

- New presentational component under e.g. `src/app/marketing/blocks/HomeHeroCockpit.tsx` (name flexible).
- Styles: `var(--bg-surface)`, `var(--border-subtle)`, `var(--radius-2xl)`, optional `var(--glass-*)` for top layer only.
- Motion: reuse `MARKETING_MOTION_EASE_BILLBOARD` for hero; clip-path duration can align with `MARKETING_BLOCK_REVEAL.durationSec` or a new `HERO_PANEL_REVEAL_SEC` in config.

---

## 7. Entry points (“Choose an entry”) — premium cards

**Current:** [`DecisionPath`](../src/app/marketing/blocks/DecisionPath.tsx) — stacked rows with hover background.

**Direction:** Treat each path as a **large surface card** in a **grid** (3 columns desktop, stack mobile):

- Padding: align to `--space-6` / `--space-7` scale (~24–28px), not random `28px`.
- Border: `1px solid var(--border-subtle)`; hover: `translateY(-2px)` **or** `MARKETING_CARD_MOTION.hoverLift`, **border-color** shift toward `var(--border-default)`, optional **very light** `var(--shadow-sm)` (product decision: flat vs slight lift).
- Optional top highlight: `linear-gradient` using `color-mix(in oklab, var(--bg-surface) …)` — avoid raw white overlays that break dark theme.

**Copy and routes:** unchanged — only presentation.

---

## 8. Coverage tiers — polished comparison block

**Current:** [`AuditCompare`](../src/app/marketing/blocks/AuditCompare.tsx) — table inside `glc-card`.

**Direction:**

- **Desktop:** single large rounded shell (`var(--radius-2xl)`), **sticky header row** while scrolling the comparison body (within the panel).
- **Mobile:** **card-stack per tier** or horizontal snap — same data, not a shrunk unreadable table.
- **Entrance:** parent container uses mask/clip reveal (same motion family as other large blocks).

Keep row labels and package names driven from `marketing-workspace-packaging.en.json`.

---

## 9. Hover and active (premium, barely noticeable)

Align with tokens:

- **Duration:** prefer `var(--ease-fast)` / `var(--ease-base)` ranges (~150–220ms), consistent with [`MARKETING_CARD_MOTION.hoverDurationSec`](../src/app/config/marketing-motion.ts).
- **Transform:** small `translateY` only; **no** heavy `box-shadow: 0 12px 30px rgba(0,0,0,.10)` unless product explicitly adopts stronger shadows in `theme.css` for marketing.

**Buttons:** primary can use slight opacity change on hover (already explored on home) + focus ring via existing focus utilities — match `DESIGN.md` / GLC accessibility patterns.

---

## 10. Mid-page CTA band

**Direction:** One **repeating full-width band** (between mid and lower funnel) with a single primary action (e.g. brief), using `var(--bg-muted)` or `var(--gradient-ink-rich)` + inverse text — mirror the existing client-dashboard strip pattern for consistency.

Implement as a small block component + copy from JSON to avoid hardcoded strings in the page.

---

## 11. Suggested implementation order

1. Extend **motion** for **clip-path / mask reveals** on large wrappers (tiers, decision grid shell, hero cockpit) — config-driven.
2. **Hero** — two-column layout + `HomeHeroCockpit` (static first, then motion).
3. **DecisionPath** — grid **premium cards** (same data).
4. **Section surfaces** — pass explicit `className` / wrapper components from `MarketingHome` for alternating bands.
5. **AuditCompare** — responsive comparison panel + sticky header + mobile stack.
6. **CTA band** — reusable block + JSON copy.
7. Visual regression / a11y pass (contrast, keyboard, reduced motion).

---

## 12. Quick reference — replace example CSS variables

If translating old snippets to GLC:

```css
/* Prefer (conceptual — real values live in theme.css) */
--ease-premium: matches theme --ease-base / --ease-slow or Motion MARKETING_MOTION_EASE_PREMIUM;
--dur-fast: ~150ms  → var(--ease-fast) timing;
--dur-med:  ~420ms  → align MARKETING_SECTION_MOTION.durationSec or MARKETING_LIST_STAGGER.itemDurationSec;
--dur-slow: ~700ms  → new token in marketing-motion.ts if mask reveals need longer (single source of truth).
```

All **new** durations should be added to [`marketing-motion.ts`](../src/app/config/marketing-motion.ts) (or `theme.css` if used only in CSS) — not inlined in components.

---

## Appendix A — “Hardcode” snippets → GLC (phrasebook)

Use this when translating **informal CSS/JS examples** into repo work. **Do not paste** the left column into production as-is.

| Reference idea | GLC-aligned approach |
|----------------|----------------------|
| `[data-reveal]` + `.is-visible` + `IntersectionObserver` | Keep **`motion/react`** + `whileInView` / variants; mirror **`prefers-reduced-motion`** via `useReducedMotion()`. Optional CSS `[data-reveal]` only if it consumes **the same** duration/ease tokens and reduced-motion rules. |
| `opacity` + `translateY(12px)` text reveal | [`MarketingSection`](../src/app/marketing/blocks/MarketingSection.tsx): `MARKETING_SECTION_MOTION.hiddenY`, `MARKETING_MOTION_EASE_PREMIUM`. |
| `[data-reveal="mask"]` + `clip-path` + `round 24px` | New small wrapper (Motion `animate` / `clipPath`) or extend **`MARKETING_BLOCK_REVEAL`**; corner radius from **`var(--radius-2xl)`** (not raw 24px). |
| `threshold: 0.14` | Tune **`MARKETING_SECTION_MOTION.viewportMargin`** (or per-block `viewport`) — single place, not scattered observers. |
| Section rhythm: hero plain → who we are narrow → entry **surface** → tiers **strict** → outcomes **airy** | Implement with **`var(--bg-canvas)` / `var(--bg-muted)` / `var(--bg-surface)` + borders**, `MarketingSection` **className**, and spacing from **`--space-*`**. |
| `.entry-grid` `gap: 20px` | `gap: var(--space-5)`. |
| `.entry-card` padding `28px`, radius `24px` | `padding: var(--space-7)`, `border-radius: var(--radius-2xl)` (22px) or extend tokens if 24px is required everywhere. |
| `rgba(255,255,255,.72)` + `backdrop-filter` glass | **`var(--glass-bg)`**, **`var(--glass-blur)`**, **`var(--glass-border)`** — verify **dark mode** contrast. |
| `::before` white gradient overlay on card | Prefer **`color-mix(in oklab, var(--bg-surface) …)`** so dark theme does not flash raw white. |
| Hover `translateY(-2px)` + heavy shadow `0 12px 30px rgba(0,0,0,.1)` | Lift **`MARKETING_CARD_MOTION.hoverLift`** (px) or `-2px`; shadow only **`var(--shadow-sm)`** (or none) — **no** ad-hoc black alpha in marketing unless added to `theme.css`. |
| `transition: 180ms` | Default to **`var(--ease-fast)`** (150ms bundled) or add **`--ease-*`** / motion constant if 180ms is a **signed-off** spec. |
| `.stagger` nth-child delays `60 / 120 / 180ms` | Add e.g. **`MARKETING_STAGGER_CHILD_STEP_MS`** in [`marketing-motion.ts`](../src/app/config/marketing-motion.ts) and reuse in Motion `transition.delay` or variants — not inline in JSX. |
| Tiers: sticky header + mobile card columns | [`AuditCompare`](../src/app/marketing/blocks/AuditCompare.tsx) refactor: shell **`var(--radius-2xl)`**, sticky thead, responsive **card per tier**; entrance = same **mask** family as other large blocks. |
| Mid-page **CTA band** | New block + copy from **JSON**; surface **`var(--bg-muted)`** or **`var(--gradient-ink-rich)`** (pattern already on home client strip). |

---

## Appendix B — IA guardrail (from brief)

**Do not change** for “premium pass” work: **Snapshot / Focus / Context / Strategy / Brief** and the **packaging / route semantics** in [`marketing-workspace-packaging.en.json`](../src/app/data/marketing-workspace-packaging.en.json). Improve **motion, surfaces, layout, and typography** only unless product explicitly revises IA.

**Implementation order** matches **§11** above (motion → hero cockpit → entry cards → section bands → tiers → CTA band → QA).
