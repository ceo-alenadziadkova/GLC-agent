# HOTEL DEMO RUNBOOK — Diagnostic Intake + KPI Intelligence

Version: 1.0  
Audience: consultant-led demo for hotel operators / hotel management teams  
Scope: public intake (`/intake/:token`) + NL describe + KPI dashboard storyline

## 1) Demo objective and ICP alignment

### ICP profile (single scenario for the entire demo)

- Segment: independent or small-chain city hotel (40-120 rooms).
- Revenue profile: high OTA dependence (55-75% of bookings from OTAs).
- Current pain: weak direct booking conversion and fragmented decision process.
- Decision makers in room: GM/Owner, Revenue Manager, Front Office Lead.

### Business objective for this demo

Show that the platform turns fuzzy hotel problem statements into an actionable intake profile and exposes conversion friction points through KPI hotspots, so the team can decide what to fix first with less guesswork.

### One-message narrative (use this sentence in intro and closing)

"From free-form hotel context to measurable conversion decisions in one guided flow."

### 3 value blocks to repeat during the demo

1. Speed to clarity: NL describe reduces time from first conversation to structured plan input.
2. Better intake completion: hotspot visibility explains where hotel users drop off and why.
3. Decision confidence: explicit vs inferred merge plus readiness trace shows transparent reasoning.

## 2) Click-script with talk track (7-10 minutes)

## Timing map

- 00:00-01:00 Context and expected business effect.
- 01:00-04:00 Public intake + NL describe flow.
- 04:00-06:30 Authoritative merge and readiness trace.
- 06:30-08:30 KPI dashboard and hotspot interpretation.
- 08:30-10:00 Business summary + next-step CTA.

## Step-by-step script

### Step 1 — Open context (00:00-01:00)

- Screen: intro slide or verbal framing before UI.
- Say:
  - "We will use one realistic hotel case: occupancy is stable, but direct bookings lag and OTAs are expensive."
  - "Goal for this demo is not another report; goal is a faster decision on what to fix first."

### Step 2 — Open public intake link (01:00-01:30)

- Screen: `/intake/:token`.
- Action:
  - Confirm token opens the public intake page.
  - Briefly mention this is a role-safe public path.
- Say:
  - "We start exactly where a hotel stakeholder starts: one secure intake link."

### Step 3 — Run NL describe (01:30-03:00)

- Action:
  - Paste prepared hotel free-text input.
  - Trigger NL describe.
- What to highlight:
  - Input is natural language.
  - System proposes inferred hints from that text.
- Say:
  - "The team does not need perfect terminology; they describe the situation in plain language."

### Step 4 — Show authoritative merge behavior (03:00-04:30)

- What to highlight:
  - Explicit answers override inferred hints.
  - Low-confidence hints can be filtered.
  - Persist draft is controlled.
- Say:
  - "We keep trust by design: explicit user input stays authoritative, inference only assists."

### Step 5 — Show plan/readiness trace (04:30-06:30)

- Action:
  - Open readiness/trace panel after merge.
- What to highlight:
  - Why certain questions are asked next.
  - How current response quality affects readiness.
- Say:
  - "This removes black-box behavior and helps teams answer better because they see purpose."

### Step 6 — Move to KPI dashboard (06:30-08:30)

- Screen: intake intelligence KPI dashboard.
- What to highlight:
  - `dropOffRate` trend.
  - `topDropOffHotspots` by question.
  - session funnel (`started -> shown -> droppedOff -> reachedAuditReady`).
- Say:
  - "Now we switch from anecdotal feedback to actual friction data."

### Step 7 — Close with action list (08:30-10:00)

- Say:
  - "Based on this flow, we can decide tomorrow's actions: simplify hotspot question wording, reduce early friction, and monitor drop-off delta in the next cohort."
  - "Recommended next step: 2-week pilot on direct-booking hotel leads."

## 3) Mock inputs and expected outcomes (hotel-specific)

Use these examples during NL describe and intake rehearsal.

## Mock input A — Direct booking growth case (primary demo)

Text:

`We are a 78-room city hotel in Prague. Around 68% of reservations come from OTA channels. We want to increase direct bookings from our website before high season. Current issues: guests abandon the booking form on mobile, rate plans feel confusing, and front desk gets many calls about cancellation rules. Budget is moderate and we need first measurable wins in 30 days.`

Expected NL outcomes to call out:

- Inferred business priority toward conversion/direct-booking improvement.
- Suggested concerns around mobile UX friction and pricing clarity.
- Confidence mix (some medium-confidence hints accepted, low-confidence hints skipped depending on threshold).
- Authoritative merge keeps explicit form responses untouched.

## Mock input B — Operations + service upsell case (backup)

Text:

`We are a boutique hotel with 52 rooms. Occupancy is good on weekends but weekday revenue is unstable. We want better pre-arrival communication, easier check-in instructions, and more upsell of breakfast and late checkout. Team is small, so we need changes that staff can maintain without extra headcount.`

Expected NL outcomes to call out:

- Inferred focus on guest journey and pre-arrival communication.
- Suggested value points around upsell opportunities and operational simplicity.
- Clear rationale messages for applied hints.

## Suggested request parameters for stable demo behavior

- `min_confidence`: `medium` (default-safe narrative).
- `persist_draft`: `true` for main happy path; keep one backup run with `false`.
- `x-idempotency-key`: set per rerun to avoid accidental duplicates in live demos.

## 4) KPI pack and hotspot narrative

## KPI pack for business audience

- Primary metrics:
  - `sessions`
  - `questionShown`
  - `dropOff`
  - `dropOffRate`
  - `medianQuestionsToReadiness`
  - `sessionFunnel`
  - `topDropOffHotspots`

## Narrative template (say this in dashboard section)

- "We are not just counting completions; we are identifying where intent is lost."
- "This hotspot has high exposure and high drop-off rate, so wording or sequencing here has the highest ROI."
- "Median questions to readiness tells us whether we are making the path shorter without sacrificing quality."

## Hotspot decision framework

For each hotspot in `topDropOffHotspots`, map to an action:

1. If `shownCount` high + `dropOffRate` high:
   - simplify wording and reduce cognitive load.
2. If `shownCount` moderate + `dropOffCount` high:
   - add helper copy or examples.
3. If early-funnel hotspot repeats across sessions:
   - move question later or split into two smaller prompts.

## Outcome framing for hotel stakeholders

- Revenue impact: improves direct-booking conversion path quality.
- Operational impact: fewer repetitive clarifications by front desk/team.
- Governance impact: decisions backed by measured funnel behavior, not intuition.

## 5) Pre-demo risk checklist (flags, token, roles, fallback)

Run this checklist 30-60 minutes before the call.

## A) Feature flags and rollout gates

- Confirm diagnostic intake pilot is enabled on server (`FEATURE_DIAGNOSTIC_INTAKE_PILOT`).
- Confirm NL ingress mode is expected for demo (`FEATURE_NL_INGRESS_LLM`, rollout mode/percent/allowlist if used).
- Validate frontend/server flag parity for intake-related UI surface visibility.

## B) Token and path readiness

- Generate a fresh intake token for demo account.
- Verify token format and expiry window in advance.
- Open `/intake/:token` once before demo to validate happy path.

## C) Role/access readiness

- Consultant account can open KPI dashboard route.
- Public browser/incognito can open intake link without auth issues.
- If internal route is role-gated, keep public-only backup story prepared.

## D) Data readiness (avoid empty dashboard)

- Seed minimum events before demo:
  - at least 5 sessions,
  - at least 20 `question_shown`,
  - at least 3 `drop_off`.
- Verify `topDropOffHotspots` is non-empty and interpretable.

## E) Fallback package

- Backup 1: short screen recording of full happy path (intake -> NL -> KPI).
- Backup 2: static screenshots for each major step.
- Backup 3: one-page verbal script with timestamps to stay on track if live environment degrades.

## 6) Q&A sheet for objections

### Data/privacy

- Q: "Is free text stored unsafely?"
- A: NL text path includes PII scrubbing for emails/phones before LLM mapping, and intake controls remain token-based.

### Reliability

- Q: "What if LLM inference fails?"
- A: Flow has fallback behavior and can continue with deterministic mapping; authoritative explicit responses remain primary.

### Business value

- Q: "How quickly can we see impact?"
- A: First insights are immediate in KPI funnel/hotspots; operational wording changes can be tested in 1-2 weeks.

### Scale beyond hotels

- Q: "Can this work for other verticals?"
- A: Yes, the same intake intelligence pattern generalizes; only scenario wording and domain emphasis change.

## 7) Rehearsal protocol (must-run)

- Do 2 full dry-runs:
  - Run 1: normal pace, verify technical flow.
  - Run 2: strict 10-minute limit, verify business storytelling.
- Track two quality checks:
  - any step taking >90 seconds needs simplification;
  - any claim without metric evidence must be rephrased or removed.
