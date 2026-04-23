# GLC Audit — Question Bank & Intake Logic

> Полная спецификация вопросов, ветвления и маппинга на доменных агентов.
> Заменяет плоский список из 25 вопросов.

---

## 1. Диагноз текущих вопросов

**Что не так:**


| Проблема | Пример | Последствие |
| ---------------------------- | --------------------------------------- | -------------------------------- |
| Одинаковые для всех отраслей | Госпиталь отвечает на вопросы про OTA | Клиент чувствует generic-подход |
| Сайтоцентричные | "What's your CMS?" при отсутствии сайта | Без сайта клиент = пустышка |
| Слишком технические рано | "Do you have staging environment?" | Пугает нетехнического клиента |
| Нет эмоционального discovery | Сразу к метрикам, не к болям | Не понимаем зачем человек пришёл |
| Жёсткие опции без "Не знаю" | Конверсия rate = обязательное число | Клиент бросает заполнение |
| Не ветвятся по контексту | CRM-вопрос есть, даже если клиент solo | Нерелевантность |
| Смешаны в одну кучу | Бизнес + техника + цели в одном блоке | Нет ощущения структуры |


**Что нужно:**

- Вопросы как **разговор**, не как анкета
- **Ветвление** по: отрасли, наличию сайта, размеру команды, фокусу клиента
- **Select/multiselect** по максимуму, textarea только для "расскажите своими словами"
- **"Не знаю"** — легитимный ответ, не тупик
- **Отраслевые** вопросы, которые показывают экспертизу GLC
- **Без сайта** → разворот на процессы, операции, рост

**Persisted URL when the client has no public website (full audit / portal):** The backend stores the canonical sentinel **`NO_PUBLIC_WEBSITE_URL`** from **`@glc/intake-core`** (`https://glc-audit.placeholder/no-public-website`) in **`audits.company_url`** so collectors skip real HTTP crawls. Do not change this literal without a coordinated package + data migration; see [DEPLOYMENT.md — Immutable product constants](./DEPLOYMENT.md#immutable-product-constants) and [DATABASE.md — `audits`](./DATABASE.md#audits).

---

## 2. Архитектура вопросов

### 2.0. Legal metadata (GDPR mapping, sidecar)

Per bank question id, **`packages/intake-core/src/question-bank-legal-meta.v1.ts`** supplies non-branching metadata: **`purpose`**, **`legal_basis`** (`contract` \| `consent` \| `legitimate_interest`), **`sensitive`**, **`requires_dpa_client_ack`**. Coverage is enforced by **`packages/intake-core/src/tests/question-bank-legal-meta-coverage.test.ts`** (every id in **`question-bank.v1.json`** must have an entry). The compact brief schema API includes an optional **`legal`** object keyed by visible question ids (`GET /api/audits/:id/brief/schema` — see [API.md](./API.md)).

### 2.1. Три контекста сбора


| Контекст | Кто заполняет | Сколько | Что получает |
| ------------------------------------- | ---------------- | ------------------------------- | -------------------------------------- |
| **Pre-brief** (ссылка перед встречей) | Клиент | 5-7 вопросов, 5 мин | Alena приходит подготовленной |
| **Full intake** (wizard/interview) | Клиент или Alena | 25-35 вопросов, 30-40 мин | Полный аудит |
| **Discovery** (Mode C, нет сайта) | Клиент + Alena | policy-driven subset (wizard обычно 11 шагов) | Понимание бизнеса → конвертация в full |


В приложении режим **«All sections»** (классическая форма) и **пошаговый wizard** используют **один и тот же** набор видимых id банка (`filterVisibleQuestions` по текущим ответам); отличается только подача — все секции сразу или один вопрос на шаг. Канонические id ответов — **question-bank v1** (плюс identity; revenue — bank id **`a10`**). **Готовность к старту пайплайна** (full vs express, pre-brief submit): `brief_gates` — `resolveFullSlaRequiredIds` / `resolveExpressSlaRequiredIds`; на фронте зеркало — `pipelineRequiredIdsForProductMode` ([FRONTEND.md](./FRONTEND.md)). См. `getVisibleBankBriefSections` / `BankClassicBriefFields`.

**Guardrail for legacy removal (semantic parity):**

- **Meaning parity:** новый канонический путь переносит тот же бизнес-сигнал и intent.
- **Direction parity:** downstream-поведение эквивалентно по результату (visibility / gates / policy / persisted cells).
- **Coverage proof:** в том же изменении обновлены тесты и docs; если parity не доказан, legacy-ветку сужаем guardrails-ами, а не удаляем вслепую.

**Pre-brief (публичная ссылка) и policy:**

- Узкий список вопросов на экране задаётся только `**modes.pre_brief.bankIncluded`** в `intake-policy.v1.json` (плюс identity). Текущий набор bank id: **`f1`**, **`f2`**, **`f8`**, **`a7`**, **`b1`**, **`a10`**, **`a6`** (без **`c5`** / **`c3`** — они остаются в express/full intake, но не в публичном pre-brief по ссылке). В коде тот же срез доступен как **`PRE_BRIEF_BANK_INCLUDED_IDS`** из `@glc/intake-core` (см. `intake_brief_policy_sync.test`).
- Линт политики: `syntheticRequired` не должен случайно дублировать произвольные bank id; **исключение** — канонический revenue **`a10`** (`ALLOWED_SYNTHETIC_BANK_OVERLAP` в `lint_bank_policy`), чтобы full/discovery могли держать тот же id, что и в банке.
- В **замороженных** снимках policy поле `bankIncluded` может отсутствовать (legacy): тогда pre-brief eligible шире, чем у текущей policy — сервер подгружает артефакты по сохранённому `**intake_versions`** tuple (`resolveIntakeArtifacts`, реестр в `resolve-intake-artifacts.ts`).
- Поле `**slaVisibleBankIds**` в `IntakePlan` — это набор bank-stub id, по которому считается **required** для express/full SLA; для `collection_mode === 'pre_brief'` он шире, чем то, что показывается в узком pre-brief UI (см. `buildIntakePlan`).
- **Производный слой плана (ADR backlog B):** `derivedFacts` (в т.ч. `aiReadinessScore` и `segmentHints.websiteGate` — см. §8), `coverage.byDomain` (доля отвеченных primary-вопросов банка в области `slaVisibleBankIds` по доменам из `QUESTION_FEED_ROLES`), `confidence.overall` (0–1, эвристика из readiness + data quality по видимым stub). Считается в `plan_derived` внутри `buildIntakePlan`. Консультантский рабочий UI: `/admin/intake-wording` (черновики формулировок); CLI-диагностика: `pnpm intake-plan-debug` в `server/`.
- **Компактная схема для API (ADR Phase D):** `GET /api/audits/:id/brief/schema` — JSON с наборами плана + `questions` по видимым id банка + блок `derived`; см. [API.md](./API.md).
- **Матрица клиентских поверхностей (Phase 5):**

| Surface | Endpoint / module | Водитель списка вопросов | Примечание |
| --- | --- | --- | --- |
| Public pre-brief (`/intake/:token`) | `intake` | `buildIntakePlan(... pre_brief, client_form ...)` + `getBriefQuestionsByIds(plan.visible)` | Identity поля всегда добавляются явно |
| Consultant/client brief (`GET /api/audits/:id/brief`) | `audits` | `buildIntakePlan(... context ...)` + `getBriefQuestionsByIds(plan.visible)` | Возвращает plan-driven rows вместо полного `BRIEF_QUESTIONS` |
| Compact schema (`GET /api/audits/:id/brief/schema`) | `build_brief_schema_snapshot` | `plan.visible` + `getQuestionBankSchemaMeta` | Канонический bank-only snapshot для UI/инструментов |
| Discovery | `GET /api/discover/ui-fragment` + `discovery_flow` | `buildDiscoveryWizardQuestions()` (`question-bank.v1.json` + `bank-question-ui-overrides.ts`) + `buildIntakePlan` | Порядок id — `PUBLIC_DISCOVERY_WIZARD_BANK_IDS`; тексты/опции не дублируются в TS |
- **Canon `reportUse` (ADR Phase E):** у **каждого** bank id в `question-bank.v1.json` задан уникальный непустой тег `reportUse` для `derivedFacts.reportAnchors` и промпта `intake_report_anchors` (`getQuestionBankReportUse`). Линтер `lintCanonQuestionMetadataKeys` в `lint-bank-policy.ts` запрещает пропуски и дубликаты тегов. Примеры имён: `recon_company_summary`, `mkt_acquisition_channels`, `seo_analytics_tool`, `strategy_pain_anchor`.
- **Canon `answer` (ADR — answer contract):** у **каждого** bank id задан объект `**answer`** (`type`: `text` | `textarea` | `single_select` | `multi_select` | `scale` | `boolean`, опционально `maxLength`, `options` или `optionsRef` в корневой `**optionCatalogs**`). Генерация из UI-оверрайдов: `pnpm embed-question-bank-answers` в `server/` (`scripts/embed-question-bank-answers.ts`). API: `getQuestionBankAnswerContract`, `expandAnswerContractForApi` в `question_bank`; снимок `GET .../brief/schema` включает `answer` по видимым id. Замороженный банк **1.0.0** без `answer`: `question_bank_1.0.0` (tuple в `resolve-intake-artifacts.ts`).
- **Ветки (ADR Phase C / C2):** `branch_condition_deps` — ключи ответов на правило, топо-порядок оценки, `**QUESTION_BANK_V1_STUB_EVAL_ORDER`** для live v1 stubs; `**listBankStubIdsInvalidatedByResponseKeys**` — обратный индекс ключ → bank id (подготовка к частичному пересчёту). Кэш предикатов в `evaluateCanonEligibility`. Public Discovery: канонический порядок шагов — **`PUBLIC_DISCOVERY_WIZARD_BANK_IDS`** в `discovery_wizard_questions`; SPA деривация **`DISCOVERY_WIZARD_BANK_IDS`** в `discovery-flow.ts` совпадает с `buildPublicDiscoveryUiFragment()`; тест ⊆ policy — `discovery_policy_sync.test`.
- **Classic consultant brief UI (ADR Phase A):** каталог для классической формы собирается в **`@glc/intake-core`** (`intake-brief-catalog-meta.ts` из **`intake-policy.v1.json`** → **`modes.classic_brief`** + банк); в приложении — реэкспорт через **`intake_brief_questions`** (`BRIEF_QUESTIONS`, `INTAKE_IDENTITY_BRIEF_QUESTIONS`). Тексты/типы/опции для каждой строки **`modes.classic_brief.main`** — через **`buildBriefQuestionStemFromBankId(bankId)`**; **ключ ответа в `responses` = bank id** (например `f1`, `b1`, `c5`). Исключение — уточнение для отрасли «Other»: **`intake_industry_specify`** (см. `choiceSpecifyResponseKey('a2')`). **`prepareBriefForValidation`** применяет **answer contract** только по ключу bank id. `intake_brief` реэкспортирует определения и добавляет Zod. Фронт: `briefQuestions` — типы и хелперы. **public Discovery** — `GET /api/discover/ui-fragment`. Анти-drift: `brief_spa_parity.test`, `bank_question_ui_catalog_parity.test`. Полная сводка A–G: [ADR-INTAKE-UNIFIED-QUESTION-BANK.md](adrs/ADR-INTAKE-UNIFIED-QUESTION-BANK.md) § «Implementation coverage matrix».
- `**PRE_BRIEF_REQUIRED_SUBMIT_IDS`** — это **`requiredAlways`** + **`requiredIfVisible`**, пересечённые с **`modes.pre_brief.bankIncluded`** (см. `intake-brief-catalog-meta.ts`). Публичный submit и прогресс `/intake/:token` используют **`resolvePreBriefSubmitExpressBankIds`** (ветки + tuple), чтобы слоты не требовали полей вне pre-brief UI.

### 2.1.1 Intake Intelligence Contract (Sprint 2)

English contract for decision-oriented metadata (see [ADR-DECISION-IMPACT-METADATA-V1.md](adrs/ADR-DECISION-IMPACT-METADATA-V1.md)):

- **Canonical modules:** `packages/intake-core/src/config/intake-intelligence-types.ts` (shared types), `packages/intake-core/src/config/intake-intelligence-contract.ts` (resolver + coverage), `packages/intake-core/src/config/intake-intelligence-gate-metadata.ts` (Sprint 2 gate rows), `packages/intake-core/src/config/intake-intelligence-sprint2.ts` (gate id computation + completeness rules).
- **Core Diagnostic Spine:** `semanticDomain` must be one of `market` \| `value` \| `economics` \| `operations` \| `resources` \| `risks` (validated by `lint-intelligence-contract.ts`).
- **Sprint 2 gate set:** section **A** ∪ **B** ∪ `{ c1, c2, c3, c4, d2, d_closing_flow, f1–f9, f_idea_1–f_idea_4 }` — currently **47** bank ids. Each must satisfy **full contract**: `required_now` fields, no `todo`, `stewardship` (`ownerDomain` from `IntakeIntelligenceOwnerDomain`, optional `ownerAlias`, `reviewByIsoDate` `YYYY-MM-DD`), `signalContribution[]` with `signalKey` matching pilot signals and `expectedInfoGainBits` ≥ `MIN_EXPECTED_INFO_GAIN_BITS_SPRINT2` (**0.3**), plus `followupPolicy` / `stopCondition`.
- **Anti-patterns** (label + `whyAsked` heuristics): generic, leading, tautological, vanity, outside-spine, low info-gain, double-barreled; duplicate-intent fingerprint across completed contracts. **As implemented:** all anti-pattern heuristics except duplicate-intent are enforced as **errors** in `lintIntelligenceContractV1`; `INTELLIGENCE_DUPLICATE_INTENT` remains **warn** (see §16.1).
- **Adding a bank question:** extend `question-bank.v1.json`, then either attach to Sprint 2 gate (expand `computeIntakeIntelligenceSprint2GateIds` + metadata) or keep `{ todo: DEFAULT_TODO }` fallback until product assigns stewardship. Follow [`intake-question-bank-change-protocol.mdc`](../.cursor/rules/intake-question-bank-change-protocol.mdc).

### 2.2. Секции (клиент видит)

Вопросы организованы по 6 секциям — **для клиента**, не по нашим доменам:


| # | Секция | Внутреннее название | Кормит домены |
| --- | ----------------------------- | ------------------- | -------------------------------------- |
| A | **Your Business** | identity | recon, marketing_utp, strategy |
| B | **Your Customers & Growth** | growth | marketing_utp, ux_conversion |
| C | **Your Online Presence** | digital | tech_infra, seo_digital, ux_conversion |
| D | **Your Daily Operations** | operations | automation_processes |
| E | **Your Safety & Compliance** | compliance | security_compliance |
| F | **Your Goals for This Audit** | goals | strategy, all agents (calibration) |


Клиент может заполнять секции **в любом порядке** и **пропускать** те, которые ему неинтересны.
Пропущенная секция → домены получают `[UNKNOWN]`, но аудит не блокируется
(кроме обязательных (**required**) вопросов из секций A и F).

### 2.3. Ключевые ветки (branching gates)


| Gate | Вопрос | Что меняется |
| --------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `has_website` | "Do you have a website?" | Нет → секция C переключается на light mode, site-questions скрыты |
| `industry` | "Which industry?" | Появляются 2-4 отраслевых вопроса в секциях B, C, D |
| `team_size` | "How big is your team?" | Solo → процессные вопросы упрощаются; 50+ → появляются вопросы о документации |
| `has_crm` | Мультивыбор **`d1`** (инструменты/стек) + нормализация CRM-сигнала | Да → показывается **`d1a`** (какой CRM); Нет → **`d1b`** (как отслеживаете клиентов) — см. `branch-rules` / `includesCrmTool` в discover |
| `handles_payments` / `a6` | Ранний ответ в секции A (или уточнение в E) | Да → раньше включаем PCI/GDPR-контекст и полный блок E; Нет → E остаётся видимым для EU/GDPR, детали про платежи можно сжать |
| `website_maturity` *(сигнал, не predicate)* | `c9` (возраст сайта) | Попадает в **context slice** tech/strategy через §5; **не** ключ в `BRANCH_RULES` — видимость вопросов не переключается отдельным gate |
| `automation_attempt` *(сигнал, не predicate)* | `d_automation_attempt` | Ответ уходит в **automation_processes** (§5); в `question-bank.v1.json` у вопроса **нет** `branch` — это не условие `evalBranchCondition` |


**Реализация веток:** канон — `branch_rules` (`BRANCH_RULES`, `evalBranchCondition`). Неизвестный `branchCondition` в JSON → в лог пишется предупреждение `[branch-rules] Unknown branchCondition`, вопрос по умолчанию **показывается** (fail-open).

**Отрасль в UI:** в выпадающем списке больше ярлыков, чем отраслевых веток с дополнительными вопросами. Явные `branch`-вопросы есть только для hospitality, real estate, restaurant & F&B, professional services, healthcare, marine; остальные индустрии калибруют общие вопросы и веса, без отраслевого пакета в банке.

**Секция E (видимость):** блок **всегда показываем** для EU-ориентированного продукта: даже без онлайн-платежей релевантны GDPR, политика, куки. Копирайтинг секции подчёркивает «быстрый чеклист и спокойствие», а не «только PCI».

### 2.4 Tone of voice — value-first intake copy

Руководство для **всех будущих** вопросов и helper-текстов GLC Audit (не копия стиля конкретной фирмы — общие практики стратегических digital / AI audits, UX и SEO case studies):

1. **Сначала бизнес-ценность, не инструмент.** Формулировка про проблему, результат или «зачем», а не «какой тул». Правило: *сначала что волнует / что хотим понять, потом чем измеряем* (инструмент может быть опцией внутри варианта ответа).
2. **Язык impact и outcomes.** Связывать подсказки с влиянием: рост, прибыльность, эффективность, риск, опыт клиентов, время. Маркеры: *value, impact, profitable, risk, wasted time, opportunities* — уместно, если остаётся понятно владельцу SMB.
3. **Снять стыд за «не знаю».** Для сложных и техвопросов — опции *Not sure* / *Someone else handles this*; в helper прямо: *«If you're not sure, that's fine — we'll flag this for deeper analysis in the audit.»*
4. **Конкретно и приземлённо.** Профтермины (*conversion, margin, manual work, risk*) — когда помогают; вместо абстракции «оптимизация процессов» — *«work that repeats every week and doesn't create direct value for the customer»*.
5. **Примеры в helper из реальных болей.** 2–4 коротких примера бизнес-языком (без забрасывания GA4/LCP в лицо клиенту — это зона агентов и отчёта).
6. **Без оценивающих формулировок.** Не «почему до сих пор нет…»; вместо этого — *«Where do you feel you're leaving value on the table today?»*, партнёрский тон («совместно поймать value»).
7. **Связь вопроса с пользой аудита.** Одна короткая фраза: *«This helps us see where improvements will have the biggest impact»* / *«…so we don't recommend changes that don't fit your scale or readiness»*.

---

## 3. Complete Question Bank

### Источник истины по срезам агентов

**Markdown не является каноном для того, какой ответ какому агенту попадает.** Единственный источник истины — объект `**QUESTION_FEED_ROLES`** в `question_feed_roles` (от него строятся `DOMAIN_TO_QUESTIONS_RAW` → `DOMAIN_TO_QUESTION_IDS` и контекст в `ContextBuilder`).

- Менять срезы нужно **в TypeScript**, затем **подтянуть §3 / §5 в этом файле** как человекочитаемое зеркало (или сгенерировать его скриптом).
- Колонка **Agent feeds (P / S)** ниже: **(P)** = primary, **(S)** = secondary (тот же ответ дублируется в срез другого агента). Формат `домен (P), …; домен (S), …` — часть после `;` опускается, если secondaries нет.
- Продуктовые формулировки вроде «all (calibration)» ниже — **пояснение для людей**, не отдельные домены в коде, пока не заведены в `QUESTION_FEED_ROLES`.

### Обозначения

- **Priority:** **Required** / **Recommended** / **Nice-to-have**
- **Input:** `select` / `multi` / `text` / `textarea` / `number` / `rating` / `confirm`
- **Agent feeds (P / S):** как в `QUESTION_FEED_ROLES` (см. выше). Имена доменов как в коде: `recon`, `tech_infrastructure`, `security_compliance`, `seo_digital`, `ux_conversion`, `marketing_utp`, `automation_processes`, `strategy`.
- **Branch:** условие показа (пустое = всегда)
- **Layer:** 1 = Quick Intake / 2 = Deep Intake / pre = Pre-brief / disc = Discovery

**Примечание:** `d1` в **seo_digital** как **(S)** включён **всегда** (MVP); условная подстройка среза только при сигнале аналитики в `d1`/`c3` — отдельная задача.

---

### Section A: Your Business (identity)

*"Let's start with who you are — this helps us tailor everything to your context."*

| ID | Question | Input | Priority | Layer | Agent feeds (P / S) | Branch |
|----|----------|-------|----------|-------|-------|--------|
| `a1` | How would you describe your business in one sentence? | textarea | Required | 1, pre, disc | recon (P) | — |
| | *Example: "We run a boutique hotel in Palma's old town with a rooftop restaurant"* | | | | | |
| `a2` | Which industry are you in? | select | Required | 1, pre, disc | recon (P) | — |
| | Options: Hospitality (hotels, apartments, tours) / Real Estate / Restaurant & F&B / Professional Services (legal, consulting, gestoría) / Healthcare & Wellness / Retail & E-commerce / Marine & Yachting / Education / SaaS & Software / Manufacturing / Media & Entertainment / Non-profit / Other → text | | | | | |
| `a3` | Where is your business based? | text | Required | 1, pre | recon (P) | — |
| | *Placeholder: "Palma de Mallorca, Spain"* | | | | | |
| `a4` | How big is your team? | select | Recommended | 1, disc | recon (P), strategy (P) | — |
| | Options: Just me / 2–10 people / 11–50 / 51–200 / 200+ | | | | | |
| `a5` | Do you have a website? | select | Required | 1, pre, disc | recon (P), tech_infrastructure (P) | — |
| | Options: Yes, multi-page site / Yes, single landing page / Under construction / No website yet | | | | | |
| `a6` | Do customers pay you online today (card, booking engine, invoice link, or deposits)? | select | Required | 1, pre, disc | recon (P), security_compliance (P) | — |
| | Options: Yes / Sometimes / Rarely / No, offline only / Not sure | | | | | |
| | *Если `No` — в Layer 2 вопрос `e1` можно сократить или пропустить (ветка `handles_payments`); GDPR-вопросы E остаются.* | | | | | |
| `a7` | How would you describe where your business is **right now**? (not company age — the *moment*) | select | Required | 1, pre, disc | recon (P), strategy (P) | — |
| | Options: Launching / Growing fast / Stabilising / Scaling / Mature and optimising | | | | | |
| | *Зачем:* тон рекомендаций и приоритет «quick wins vs. foundation» сильно меняется между «запускаемся» и «оптимизируем зрелый процесс». | | | | | |
| `a8` | Approximately how many **customers or orders** do you serve in a typical month? | select | Recommended | 2 | strategy (P), automation_processes (P); ux_conversion (S), marketing_utp (S) | — |
| | Options: < 50 / 50–200 / 200–1,000 / 1,000+ / Not sure | | | | | |
| | *Helper:* «A rough range is enough — this helps us see where digital or automation improvements could have the **biggest impact** (value at scale).» | | | | | |
| `a9` | What languages do your customers communicate in? | multi | Optional | 2, disc | marketing_utp (P), automation_processes (P) | — |
| | Options: Spanish / English / German / French / Russian / Other | | | | | |
| | *Helper:* «Helps us evaluate your content reach, multilingual SEO opportunities, and whether automation tools (chatbots, email flows) need to support multiple languages.» | | | | | |
| `a10` | Which monetization model best describes your business? | multi | Required | 1, pre | marketing_utp (P), recon (P); strategy (S) | — |
| | Options (канон `question-bank.v1.json`): One-time services (projects, consulting) / Recurring services (retainers) / Product sales (online or offline) / Subscription / membership / Commission or marketplace fees / Lead generation / referrals / Ads / sponsorships / Other | | | | | |
| | *UI hint (`bank-question-ui-overrides`):* core monetization (not repeat vs one-off); select up to **2** options that represent most revenue today. | | | | | |

**10 вопросов в универсальном ядре A (8 в Layer 1 / pre+disc, `a8` и `a9` — Layer 2). ~5–6 минут с учётом Layer 2. Gate: industry, team_size, has_website, handles_payments, business_stage.**

---

### Section B: Your Customers & Growth

*"Understanding your customers helps us evaluate whether your marketing and messaging are hitting the mark."*

| ID | Question | Input | Priority | Layer | Agent feeds (P / S) | Branch |
|----|----------|-------|----------|-------|-------|--------|
| `b1` | Who is your ideal customer? | textarea | Required | 1, pre | ux_conversion (P), marketing_utp (P) | — |
| | *Helper:* «Think about **who you create the most value for today**: who they are, where they come from, and what problem or job they solve with you.» | | | | | |
| | *Example: "European couples aged 30–55 looking for an authentic boutique experience"* | | | | | |
| `b2` | How new customers find you | multi | Required | 1, disc | marketing_utp (P), seo_digital (P); strategy (S), automation_processes (S) | — |
| | Options (канон): Google / search / Paid ads / Social / Referrals / Cold outreach / Events / Partners / Other | | | | | |
| | *UI hint:* how customers first discover you — word of mouth, platforms, ads, events. | | | | | |
| `b3` | What is the **main promise or value** for your best customers compared to competitors? | select | Required | 1, pre | marketing_utp (P) | — |
| | *Helper (b3):* в UI — короткие паттерны (price, speed/service, unique experience/location, trust/expertise). Клиент выбирает паттерн и при необходимости добавляет уточнение через `b3__other`. Язык **ценности для клиента**, не «нас отличает цена». | | | | | |
| | *Example: "Historic building with a rooftop restaurant and best-price guarantee"* | | | | | |
| `b4` | How would you describe your pricing compared to competitors? | select | Recommended | 2 | marketing_utp (P), strategy (P) | — |
| | Options: Lower than average / About the same / Higher, premium positioning / Hard to compare | | | | | |
| | *Helper:* rough positioning is enough, this helps avoid recommendations that conflict with your pricing strategy. | | | | | |
| `b5` | Is your business seasonal? | select | Recommended | 2 | marketing_utp (P), strategy (P) | — |
| | Options: Yes, very (summer peak) / Yes, slightly / No, steady all year / Not sure | | | | | |
| | *Helper:* seasonality changes channel mix and implementation timing. If unsure, choose the closest option. | | | | | |
| `b6` | Do you offer any guarantees to customers? | multi | Recommended | 2 | marketing_utp (P), ux_conversion (P) | — |
| | Options: Money-back / Best price guarantee / Free cancellation / Satisfaction guarantee / No explicit guarantees / Other → text | | | | | |
| | *Helper:* guarantees are trust signals and often improve conversion without increasing traffic spend. | | | | | |
| `b7` | Is your revenue mostly **repeat / recurring customers**, or **mostly one-off** transactions? | select | Recommended | 2 | marketing_utp (P), ux_conversion (P), strategy (P) | — |
| | Options: Mostly repeat customers / Mix of repeat and one-off / Mostly one-off transactions / Not sure | | | | | |
| | *Зачем:* retention-воронка, LTV и автоматизация (напоминания, CRM, подписки) принципиально отличаются от чистого acquisition; без этого агенты ошибают приоритет. | | | | | |
| `b_growth_attempts` | Growth attempts (past 1–2 years) | multi | Recommended | 2 | marketing_utp (P), strategy (P) | — |
| | Options (канон): Paid ads (Google, Meta) / Marketing agency or freelancer / More social media content / New platforms or directories / Improved the service itself / Nothing specific yet / Other | | | | | |

**Отраслевые вопросы (появляются по `industry`):**

*Перегрузка Hospitality:* 6 базовых + 2 отраслевых = 8 в одной секции — на верхней границе; новым отраслям лучше выносить редкие ветки в Layer 2 или conditional packs.

| ID | Question | Input | Priority | Layer | Agent feeds (P / S) | Shows when |
|----|----------|-------|----------|-------|-------|------------|
| `b_hotel_1` | Which booking channels do you use? | multi | Recommended | 2 | marketing_utp (P) | industry = Hospitality |
| | Options: Direct website / Booking.com / Airbnb / Expedia / TripAdvisor / Other → text | | | | | |
| `b_hotel_2` | What % of bookings come through your own site vs. OTAs? | select | Recommended | 2 | marketing_utp (P) | industry = Hospitality |
| | Options: Mostly OTA (80%+) / More OTA than direct / About 50-50 / More direct / Almost all direct / Don't know | | | | | |
| `b_realestate_1` | Which property portals do you list on? | multi | Recommended | 2 | marketing_utp (P) | industry = Real Estate |
| | Options: Idealista / Fotocasa / Kyero / Rightmove / Own website / None / Other → text | | | | | |
| `b_restaurant_1` | Do you use a reservation system? | select | Recommended | 2 | marketing_utp (P); ux_conversion (S) | industry = Restaurant |
| | Options: TheFork / Resy / CoverManager / Phone only / Walk-in only / Other → text | | | | | |
| `b_services_1` | How do clients typically book your services? | select | Recommended | 2 | ux_conversion (P) | industry = Professional Services |
| | Options: Contact form / Phone call / Email / WhatsApp / Online booking / In person / Other → text | | | | | |
| `b_health_1` | Do patients book appointments online? | select | Recommended | 2 | ux_conversion (P) | industry = Healthcare |
| | Options: Yes, through our site / Yes, through a platform (Doctoralia, etc.) / No, phone/in-person only | | | | | |
| `b_marine_1` | Which charter platforms do you use? | multi | Recommended | 2 | marketing_utp (P) | industry = Marine |
| | Options: Click&Boat / SamBoat / Nautal / Yachtall / Direct only / None / Other → text | | | | | |

---

### Section C: Your Online Presence (digital)

*"This helps us evaluate your website, visibility, and technical setup."*

**Full mode** (has_website = Yes):

*Рекомендованный порядок в мастере (эмоция и GTM → конкуренты, пока клиент свежий → возраст сайта → подтверждение рекона и техника): **c5 → c6 → c8 → c9 → c1 → c2 → c3 → c4 → c7**.* 
`c8` (конкуренты) сознательно **не** в хвосте Layer 2: к концу блока клиент устал; ранний ввод повышает качество ответов.

| ID | Question | Input | Priority | Layer | Agent feeds (P / S) | Branch |
|----|----------|-------|----------|-------|-------|--------|
| `c5` | What's the main thing you want visitors to do on your site? | select | Required | 1 | ux_conversion (P) | has_website |
| | Options: Book / Buy / Fill out a contact form / Call / WhatsApp / Download something / Just browse | | | | | |
| `c6` | What frustrates you most about your website right now? | textarea | Required | 1, 2 | ux_conversion (P), tech_infrastructure (P); seo_digital (S), strategy (S) | has_website |
| | *Required в Layer 1 при has_website; уточнение/деталь — Layer 2 при необходимости.* | | | | | |
| | *Helper (UX/CRO-style examples):* «For example: “People visit but rarely contact us”, “It’s slow on mobile”, “I can’t update content without a developer”, “Hard to tell which pages or campaigns actually work”.» | | | | | |
| `c8` | Name 2–3 of your direct competitors (company name or URL). | textarea | Recommended | 2 | marketing_utp (P) | has_website |
| | *We'll use them for benchmarking — not shared in your report.* Value-first framing in UI: this helps avoid generic recommendations and compare what actually works in your local market. | | | | | |
| `c9` | Roughly how long has your current live website been in production? | select | Recommended | 1 | tech_infrastructure (P) | has_website |
| | Options: < 6 months / 6–24 months / 2–5 years / 5+ years / Not sure | | | | | |
| | *Helper:* site age is a proxy for technical debt and maintenance risk. A rough range is enough. | | | | | |
| `c1` | *Auto-prefill:* "We detected [WordPress + Cloudflare + Cloudbeds]. Is this correct?" | select | Recommended | 2 | tech_infrastructure (P) | has_website |
| | Options: Yes, correct / Not quite (I will clarify) → text / I don't know | | | | | |
| | *Контракт `ReconConflict`: если клиент выбирает «Not quite» или значение расходится с реконом — фиксируем запись в `reconConflicts[]` (см. §11).* | | | | | |
| `c2` | Who maintains your website? | select | Recommended | 2 | tech_infrastructure (P) | has_website |
| | Options: Me / someone in-house / Freelancer / Agency / No one regularly / Don't know | | | | | |
| | *Helper:* this helps us match recommendations to your real delivery model. "Don't know" is acceptable. | | | | | |
| `c3` | Do you have Google Analytics or another analytics tool installed? | select | Required | 2 | seo_digital (P) | has_website |
| | Options: Yes, GA4 / Yes, another tool / No / Don't know | | | | | |
| | *Helper:* if you are unsure, that is fine. We will verify analytics coverage during the audit. | | | | | |
| `c4` | Is Google Search Console set up? | select | Nice-to-have | 2 | seo_digital (P) | has_website |
| | Options: Yes / No / What's that? | | | | | |
| `c7` | Where are you active on social media? | multi | Recommended | 2 | marketing_utp (P), seo_digital (P) | — |
| | Options: Instagram / Facebook / TikTok / LinkedIn / YouTube / Google Business / TripAdvisor / None / Other → text | | | | | |

**Light mode** (has_website = No / Under construction):

| ID | Question | Input | Priority | Layer | Agent feeds (P / S) | Branch |
|----|----------|-------|----------|-------|-------|--------|
| `c_nosite_1` | Where are you visible online today? | multi | Recommended | 2 | seo_digital (P) | !has_website |
| | Options: Google / search / Google Business listing / Social media / OTA or marketplace / Word of mouth / Not really online yet — **multi-select**, aligned with bank UI overrides and public `/discovery`. | | | | | |
| `c_nosite_2` | Anything else about your online presence? | select | Optional | 2 | seo_digital (P); strategy (S) | !has_website |
| | Options: Yes, soon / Yes, but not sure how / Eventually / Not a priority right now. | | | | | |
| `c_nosite_3` | Which social or messaging channels do you use for the business? | multi | Recommended | 2 | seo_digital (P) | `nosite_social` |
| | Options: Instagram, Facebook, TikTok, LinkedIn, YouTube, Google Business, TripAdvisor, None, Other — **only if** `c_nosite_1` includes the exact option **Social media** (see `BRANCH_RULES.nosite_social`). | | | | | |


---

### Section D: Your Daily Operations

*"The more we understand how your team works day-to-day, the better we can spot where time and money are being wasted."*

**Структурная заметка (перегрузка):** после `d_automation_attempt`, AI readiness и **`d6`** (типы данных) секция плотная; `d6` и **`a8`** — осознанно Layer 2, мягкие диапазоны, без «финансовой исповеди».

| ID | Question | Input | Priority | Layer | Agent feeds (P / S) | Branch |
|----|----------|-------|----------|-------|-------|--------|
| `d1` | Which tools does your team use every day? | multi | Required | 1, disc | automation_processes (P), tech_infrastructure (P); strategy (S), seo_digital (S) | — |
| | Options (канон `question-bank.v1.json`): Email / Spreadsheets / CRM (→ d1a) / Project or task tool / Booking or PMS / Accounting / Support ticketing / Voice notes or WhatsApp audio / Other | | | | | |
| `d1a` | Which CRM do you use? | select | Recommended | 2 | automation_processes (P) | d1 includes "CRM" |
| | Options: HubSpot / Pipedrive / Salesforce / Zoho / Monday / Notion / Other → text | | | | | |
| `d1b` | How do you keep track of clients and leads? | select | Recommended | 2 | automation_processes (P) | d1 does NOT include "CRM" |
| | Options: Spreadsheet / Email inbox / Notebook / WhatsApp chats / I don't really track consistently / Other → text | | | | | |
| `d_response_time` | Response speed to new inquiries | select | Recommended | 2 | automation_processes (P), ux_conversion (P) | — |
| | Options (канон): Within minutes — I'm always on / Within a few hours / Same day / Next day or later / It depends — sometimes fast, sometimes slow | | | | | |
| `d_closing_flow` | Steps between first contact and payment | multi | Recommended | 2 | automation_processes (P), ux_conversion (P) | — |
| | Options (канон): I send a quote or price manually / We have a call or meeting first / They visit in person / I send them to a booking platform / They pay immediately on first contact / It varies a lot / Other | | | | | |
| `d_billing_flow` | How quotes and invoices are sent | select | Recommended | 2 | automation_processes (P), security_compliance (P) | — |
| | Options (канон): WhatsApp message or voice note / Email with a document attached / In person or printed / Accounting software (Holded, Factusol…) / Booking platform handles it / We don't send formal confirmations / Other | | | | | |
| `d2` | Biggest manual time sink (single bottleneck bucket) | select | Required | 1, disc | automation_processes (P); ux_conversion (S), marketing_utp (S) | — |
| | Options: Following up with leads and prospects / Scheduling and confirming appointments / Creating and sending quotes or invoices / Reporting and tracking what is working / Onboarding new clients / Managing team tasks and handoffs / Something else → specify (`d2__other`) | | | | | |
| `d_automation_attempt` | Have you already tried to automate or streamline that work (tool, Zapier/Make, freelancer, agency)? | select | Recommended | 1, disc | automation_processes (P) | — |
| | Options: Yes, it helped / Tried, then abandoned / Not yet / Not sure | | | | | |
| `d3` | Roughly how many hours per week does your team spend on repetitive manual tasks? | select | Recommended | 2 | automation_processes (P) | — |
| | Options: Less than 5h / 5–10h / 10–20h / 20–40h / 40h+ / No idea | | | | | |
| | *Helper:* a rough estimate is enough. We use it to size the impact of automation opportunities. | | | | | |
| `d4` | If you had to explain your **main service or delivery process** to a new hire today — where would you send them **first**? | select | Recommended | 2 | automation_processes (P) | team_size > Solo |
| | Options: Written playbook / SOP doc / Internal wiki / Loom or recorded video / I'd walk them through it live / WhatsApp or chat history / We'd figure it out together / Not applicable (solo) | | | | | |
| | *Поведенческий срез вместо «насколько у вас документация»: совпадающие самооценкой ответы больше не склеивают «мы всё задокументировали» и «реально есть источник правды».* | | | | | |
| `d4a` | Do you already use AI tools in everyday work (ChatGPT, copilots, meeting notes, translation)? | select | Recommended | **2** | automation_processes (P), strategy (P) | — |
| | Options: Daily / Occasionally / Tried, stopped / No / Prefer not to say | | | | | |
| | *Helper:* this is not about being advanced. It helps estimate implementation friction and rollout speed. | | | | | |
| | *Только Deep Intake (Layer 2), не Quick.* | | | | | |
| `d4b` | Can you export key customer or ops data cleanly — e.g. bookings, clients, inventory — to a **spreadsheet or CSV** without losing half a day? | select | Recommended | **2** | automation_processes (P), strategy (P) | — |
| | Options: Yes, usually quick / Sometimes / Rarely — it's painful / No / Don't know | | | | | |
| | **Helper text (обязательно в UI):** *«Example: exporting last month's reservations or a full client list — could you do it in minutes, or would it mean chasing someone or manual copy-paste?»* | | | | | |
| `d6` | Which **types of data** do you work with most often? | multi | Recommended | 2 | automation_processes (P), strategy (P) | — |
| | Options: Bookings / transactions / Deals or orders / Contacts & leads / Inventory or stock / Finance & invoices / HR & shifts / Other → text | | | | | |
| | *Helper:* «Rough picture is enough — this helps **automation** and **strategy** prioritise which processes to tackle first.» | | | | | |
| | *Value note:* bookings plus invoices often signal immediate ROI opportunities for automation. | | | | | |
| `d5` | Do you use automated email sequences? (welcome, follow-up, reminders) | select | Recommended | 2 | automation_processes (P) | — |
| | Options: Yes, actively / We set something up but it's not maintained / No / What's that? | | | | | |
| | *Helper:* automated follow-ups often recover demand that already exists. | | | | | |

**Отраслевые вопросы:**

| ID | Question | Input | Priority | Layer | Agent feeds (P / S) | Shows when |
|----|----------|-------|----------|-------|-------|------------|
| `d_hotel_1` | Do you use a Property Management System (PMS)? | select | Recommended | 2 | tech_infrastructure (P), automation_processes (P) | industry = Hospitality |
| | Options: Cloudbeds / Opera / Mews / Beds24 / Other → text / None | | | | | |
| `d_hotel_2` | How do you handle check-in/check-out? | select | Recommended | 2 | automation_processes (P) | industry = Hospitality |
| | Options: Manual at reception / Self-check-in (digital key) / PMS-integrated / Mixed | | | | | |
| `d_realestate_1` | How do you manage property listings across portals? | select | Recommended | 2 | automation_processes (P) | industry = Real Estate |
| | Options: Manual updates per portal / Multi-listing tool (Sooprema, Inmovilla…) / CRM handles it / Agency does it | | | | | |
| `d_restaurant_1` | What POS system do you use? | select | Recommended | 2 | tech_infrastructure (P), automation_processes (P) | industry = Restaurant |
| | Options: Square / SumUp / Lightspeed / Revo / Glovo integration / Other → text / None | | | | | |

---

### Section E: Safety & Compliance

*"Quick check on security and legal basics — important for EU businesses."* 
**Framing (обязательная видимость):** секция не прячется полностью при отсутствии онлайн-платежей: клиенты в EU всё равно нуждаются в понятном GDPR/куки/политика контексте. Копия UI: «Даже если платежи офлайн, это 3 минуты, чтобы мы не промахнулись с рисками в отчёте.» При `a6 = No` блок про PCI можно сжать до одного уточняющего вопроса или опираться только на `e1`.

| ID | Question | Input | Priority | Layer | Agent feeds (P / S) | Branch |
|----|----------|-------|----------|-------|-------|--------|
| `e1` | Does your business accept online payments? | select | Recommended | 2 | security_compliance (P) | — |
| | Options: Yes, on our website / Yes, through a third party (Booking, Stripe checkout, etc.) / No, cash/transfer only | | | | | |
| | *Helper:* this scopes payment-risk checks, not a compliance exam. | | | | | |
| `e2` | Does your business operate in the EU or serve EU customers? | select | Recommended | 2 | security_compliance (P) | — |
| | Options: Yes / No / Not sure | | | | | |
| | *Helper:* we use this only to size compliance depth in the audit. A best guess is enough. | | | | | |
| `e3` | How confident are you that your GDPR setup is complete? (cookie banner, privacy policy, consent) | select | Recommended | 2 | security_compliance (P) | — |
| | Options: Very confident / Something is in place, but I'm not sure it's complete / Probably incomplete / Haven't looked into this yet | | | | | |
| | *Раскрытие ограничено:* это **самооценка** клиента; реальную картину дают Recon + Security agent. Вопрос нужен для **приоритизации тона** в отчёте и triage, не как истина. | | | | | |
| `e4` | Are you using or planning to use e-invoicing / Verifactu? | select | Nice-to-have | 2 | security_compliance (P) | location contains "Spain" |
| | Options: Already using / Planning to / Not yet / What's that? | | | | | |

---

### Section F: Your Goals for This Audit

*"Last step — help us focus on what matters most to YOU."*

| ID | Question | Input | Priority | Layer | Agent feeds (P / S) | Branch |
|----|----------|-------|----------|-------|-------|--------|
| `f1` | Main business problem to solve | multi | Required | 1, pre, disc | strategy (P) | — |
| | Options: Not enough qualified leads or new customers / Too many visitors but low conversion to inquiries/sales / Too much manual work and operational overload / Revenue is unstable or highly seasonal / Overdependence on one channel/platform / Low customer retention or repeat purchases / Margins are too low / Other → text | | | | | |
| | *Helper:* Select up to 2 primary pain points. If needed, choose Other and add a short clarification. | | | | | |
| `f2` | Which areas are you most interested in **improving** with this audit? | multi | Required | 1, pre | strategy (P) | — |
| | Options: **Website performance & technology** (speed, stability, technical health) / **Online visibility & SEO** (finding and attracting the right traffic) / **Customer experience & conversions** (turning visitors into customers) / **Marketing & positioning** (clarity of message and differentiation) / **Process automation & efficiency** (less manual work and handoffs) / **Security, compliance & risk** (avoiding costly surprises) | | | | | |
| | *Express mode UX contract:* show all options for transparency, but lock **Marketing & positioning** and **Process automation & efficiency** (lock icon + non-selectable). Explanatory copy must state that Express deep analysis covers Tech/Security/SEO/UX; the locked areas are captured for prioritization and full-audit planning. | | | | | |
| `f3` | How do you rate your current digital setup overall? | rating 1–5 | Recommended | 1 | strategy (P); marketing_utp (S), ux_conversion (S), automation_processes (S) | — |
| | 1 = "Struggling" … 3 = "Okay-ish" … 5 = "We're nailing it" | | | | | |
| | *Важно для тона отчёта:* 2/5 и 4/5 — разная эмоциональная и директивная подача рекомендаций. | | | | | |
| | *Follow-up (wizard, следом после f3):* «Who else decides on **digital or marketing** changes?» — free text или multi (owner / partner / ops / agency). Пока это **не отдельный id банка**, в срезы агентов не попадает; при добавлении вопроса — завести строку в `QUESTION_FEED_ROLES`. | | | | | |
| `f4` | How **ready** are you to implement changes based on this audit? | select | Recommended | 2 | strategy (P) | — |
| | Options: Ready to move quickly on clear **quick wins** / Ready to invest if **ROI and impact** are clear / Prefer to **understand the situation** for now / Need to **align first** with partner, owner, or team / Not sure yet | | | | | |
| | *Helper:* «This doesn’t lock you into anything. It helps us balance **quick wins** versus **deeper change** in systems and processes in your report.» | | | | | |
| `f5` | What approximate **budget range** do you have in mind for improvements over the **next 3–12 months**? | select | Nice-to-have | 2 | strategy (P) | — |
| | Options: Under €500 / €500–2,000 / €2,000–10,000 / Over €10,000 / **No clear budget yet** — depends on the recommendations / Prefer not to share yet | | | | | |
| | *Helper:* «We use this as a **guideline** to match recommendations to your **level of ambition** — from low-cost quick wins to larger changes.» | | | | | |
| `f6` | Anything you specifically do NOT want us to recommend? | textarea | Nice-to-have | 2 | strategy (P) | — |
| | *Example: "No more SaaS subscriptions", "Don't touch the current CMS"* | | | | | |
| `f7` | Who would **approve a new automation or AI tool** if we recommended one? | select | Recommended | 1, 2 | strategy (P), automation_processes (P) | — |
| | Options: Me / Ops or office manager / IT provider or agency / Owner or partner / Board or investor / Not sure | | | | | |
| | *Helper:* this helps sequence recommendations that can actually be implemented without internal friction. | | | | | |
| | *Перенесён из Section D (`d4c`). В мастере показывать **сразу после** f3 + follow-up на маркетинг/цифру.* | | | | | |
| `f8` | Is there a **deadline or key moment** driving this audit? | select | Recommended | 1, 2 | strategy (P) | — |
| | Options: Opening or launch soon / Seasonal peak coming / Investor, partner, or board review / Contract or compliance milestone / No specific deadline | | | | | |
| | *Helper:* deadline context helps prioritize quick wins vs deeper system changes in wave 1. | | | | | |
| | *Urgency:* «открываемся через 2 месяца» vs «без срочности» меняет последовательность рекомендаций. | | | | | |
| `f9` | Anything else we should account for in your audit context? | select + specify | Nice-to-have | 2, disc | strategy (P) | — |
| | Options: No, I have already shared everything relevant / Yes, there are additional details (+ `f9__other`) | | | | | |
| | *Helper:* use this for constraints or context not covered by the flow (for example, tax/legal setup in another country). | | | | | |

---

## 4. Layer Composition

### Pre-brief (ссылка перед встречей, ~5 мин)

| Order | ID | Question |
|-------|----|----------|
| 1 | a1 | Describe your business |
| 2 | a2 | Industry |
| 3 | a7 | Where the business is right now (stage) |
| 4 | a5 | Do you have a website? (+ URL) |
| 5 | a6 | Online payments today? (ранний commercial/security gate) |
| 6 | b1 | Ideal customer |
| 7 | f2 | Areas of interest (**перед** f1 — сужаем фокус) |
| 8 | f1 | главная **business problem** (solve with audit) |
| 9 | b3 | main **value promise** vs competitors |

**Результат:** консультант видит стадию бизнеса, риск-профиль платежей, фокус аудита и дифференциацию до созвона. Recon уже прокраулил сайт (если есть).

### Quick Intake — Layer 1 (~12 мин)

Pre-brief + дополнительно:

| Order | ID | Question |
|-------|----|----------|
| 10 | a3 | Location |
| 11 | a4 | Team size |
| 12 | a7 | Business stage (если не был в pre-brief) |
| 13 | b2 | How customers find you |
| 14 | c5 | Главное действие на сайте (if has_website) |
| 15 | c6 | Главное раздражение сайтом (**required** при has_website) |
| 16 | f8 | Deadline / urgency (рекомендуется в Layer 1 для tone strategy) |
| 17 | d1 | Daily tools |
| 18 | d2 | Biggest manual time-sink |
| 19 | d_automation_attempt | Пробовали ли уже автоматизировать (опц., рекомендуется) |
| 20 | f3 | Self-rating 1–5 |
| 21 | f7 | Approver для автоматизации/AI (можно сразу после f3 в мастере) |


**Total: ~17–19+ вопросов (зависит от веток и того, был ли pre-brief). Достаточно для Express Audit.**

### Deep Intake — Layer 2 (+15 мин)

Оставьте в этом слое в том числе `**a8`** (объём клиентов/заказов в месяц), `**d6**` (типы данных), расширенные B/C/D/E/F, отраслевые ветки.
Показываются **только релевантные** (по branching gates).
Типичный клиент увидит 12–22 дополнительных вопросов, не все строки банка.

### Discovery — Mode C (нет сайта, ~22–29 вопросов, 25–35 мин)

**Operations-first audit.** Для клиентов без сайта ценность аудита — в автоматизации, конверсии и операционной эффективности, а не в техстеке. Discovery path охватывает все домены наравне с full-site path. Рекомендация «создать сайт» выводится из данных, а не наоборот.

**Активация:** `a5 = "No website yet" | "Under construction"` + wizard активен → `collectionMode = 'discovery'`.

**Видимых вопросов после ветвления:**

- Generic industry, solo: ~22
- Hospitality, small team: ~27
- Максимум (с industry + CRM ветками): ~29

#### 6-Phase Sequence


| Phase | IDs | Focus |
| --------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------- |
| **Identity** | a1, a2, a3, a4, a6, a7, a8, a9 | Who, where, stage, scale, languages |
| **Customers** | b1, b2, b3, b7, b_growth_attempts + [industry B] | ICP, acquisition channels, growth history |
| **Digital trace** | c_nosite_1, c_nosite_4, c_nosite_5, c_nosite_reviews, c_nosite_2, c_nosite_3 | Online presence without a site |
| **Conversion pipeline** | d1, d1a/d1b, d_response_time, d_closing_flow, d_billing_flow | Inquiry → payment funnel |
| **Operations & Automation** | d2, d_automation_attempt, d4a, d4b, d6, d5 + [industry D] | Manual bottlenecks, AI/automation readiness |
| **Goals** | f1, f_idea_1, f_idea_2, f_idea_3, f_idea_4, f2, f7, f8, f4, f9 | Problem to solve, idea-stage validation, focus areas, readiness, urgency, additional context |


#### Full ID Set (policy-driven; currently 50 IDs)

```
Section A (10): a1, a2, a3, a4, a5, a6, a7, a8, a9, a10
Section B (5 universal + up to 2 industry-specific):
 b1, b2, b3, b7, b_growth_attempts
 b_hotel_1, b_hotel_2 (is_hospitality)
 b_realestate_1 (is_real_estate)
 b_restaurant_1 (is_restaurant)
 b_services_1 (is_services)
 b_health_1 (is_healthcare)
 b_marine_1 (is_marine)
Section C (6, all branch: no_website):
 c_nosite_1, c_nosite_4, c_nosite_5, c_nosite_reviews, c_nosite_2, c_nosite_3
Section D (13 universal + up to 2 industry-specific):
 d1, d1a (has_crm), d1b (no_crm)
 d_response_time, d_closing_flow, d_billing_flow
 d2, d_automation_attempt, d4a, d4b, d6, d5
 d_hotel_1, d_hotel_2 (is_hospitality)
 d_realestate_1 (is_real_estate)
 d_restaurant_1 (is_restaurant)
Section E (4): e1, e2, e3, e4
Section F (10): f1, f_idea_1, f_idea_2, f_idea_3, f_idea_4, f2, f4, f7, f8, f9
```

**Intentionally excluded from the public Discovery wizard UI (not from discovery policy):**

- `a5` — в публичном wizard не спрашивается (default `a5 = no_website`), но id остаётся в policy-level discovery subset.
- `d3` — clients reliably underestimate hours on repetitive work; low signal quality in self-serve context. Kept in bank for full-intake consultant mode.
- `d4` — `not_solo` branch gates this correctly; solo clients (~60% of discovery) do not see it
- `e1`/`e2`/`e3`/`e4` — в публичном wizard исключены ради короткого флоу, но остаются частью policy-level discovery subset.

**Note — `c7` and Discovery:** в каноне `c7` сейчас без `branch`. В публичном discovery-флоу вопрос не показывается, потому что список wizard ids фиксируется `buildPublicDiscoveryUiFragment` / `discovery-wizard-questions`, а не потому что у `c7` стоит `has_website`.

**Architecture status (Phase 5):**

- `discovery_flow` uses the shared resolver (`buildIntakePlan`) and shared wizard question builder.
- `GET /api/discover/ui-fragment` is the runtime source for public Discovery copy/options; client fallback uses the same server-side builder shape.
- Maturity scoring/findings remain Discovery-specific product logic, but question identity/visibility are no longer maintained as a separate questionnaire.

This means Discovery no longer has a separate semantic question model; it is a projection over the unified bank/policy/layout layers.

**Discovery outro (copy):** *"Thank you — we already have a clear operational picture. Next step: a short call to align on audit depth and access. Our report leans on your processes just as heavily as on your online presence."*

---

## 5. Domain Agent ← Question Mapping

**Не правьте эту таблицу как первичный источник.** Сначала меняйте `**QUESTION_FEED_ROLES`** в `question-feed-roles.ts`, затем обновляйте списки здесь и колонку **Agent feeds (P / S)** в §3. Иначе документация снова разойдётся с рантаймом.

Ниже: какой агент какие ответы получает (context slice). Состав строки = **primary ∪ secondary**; в промпте роль **P/S** не дублируется построчно — см. §3. Порядок id внутри домена — порядок банка (`DOMAIN_TO_QUESTION_IDS`).


| Agent | Questions used (IDs) |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **recon** | a1, a2, a3, a4, a5, a6, a7, **a10** (+ auto-crawl) |
| **tech_infrastructure** | a5, c9, c1, c2, c6, d1 (tools → tech signals), d_hotel_1, d_restaurant_1 |
| **security_compliance** | a6 (gate), e1, e2, e3, e4, **d_billing_flow** (Verifactu signal) |
| **seo_digital** | c3, c4, c7, c_nosite_1, c_nosite_2, c_nosite_3, **c_nosite_5** (Google Business), **c_nosite_reviews** (reputation), b2 (traffic sources) |
| **ux_conversion** | b1 (ideal customer), b6 (guarantees), b7 (repeat vs one-off), c5 (main action), c6 (frustrations), b_services_1, b_health_1, **d_response_time**, **d_closing_flow** |
| **marketing_utp** | **a9** (customer languages), **a10**, b1, b2, b3, b4, b5, b6, b7, **b_growth_attempts**, c7, c8 (competitors), **c_nosite_4**, **c_nosite_5**, **c_nosite_reviews**, b_hotel_1, b_hotel_2, b_realestate_1, b_marine_1 |
| **automation_processes** | **a9**, d1, d1a/d1b, **d_response_time**, **d_closing_flow**, **d_billing_flow**, d2, d_automation_attempt, d3, d4, d4a, d4b, **d6** (data types), d5, **a8** (monthly volume), f7 (approver), **c_nosite_4**, d_hotel_1, d_hotel_2, d_realestate_1, d_restaurant_1 |
| **strategy** | f1, f2, f3, f4, f5, f6, f7, f8 (urgency), f9 (additional context), a4, a7, **a8** (scale), **a10** (S), b4, b5, b7, **b_growth_attempts**, d4a, d4b, **d6** |


**Правило:** агент получает только свои вопросы (context slicing), не весь бриф. Цепочка в коде: `QUESTION_FEED_ROLES` → `DOMAIN_TO_QUESTIONS_RAW` (реэкспорт в `domain-slice-data.ts`) → `DOMAIN_TO_QUESTION_IDS` в `question-bank.ts`.

---

## 6. Branching Logic (implementation)

Каноническая реализация: `**branch_rules`** — `BRANCH_RULES`, нормализация `a5`/`a6`/`a4`/`a2`, `evalBranchCondition`. Вызов видимости: `is_visible`.

- Декларативный артефакт `packages/intake-core/src/branch-rules.v1.json` — версия **1.1.0** (Sprint 4 stage-gate / артефактный bump; набор предикатов см. JSON и `evalRuleEntry` в `branch-rules.ts`).
- Ключи в `branch` / `branchCondition` JSON **должны** совпадать с ключами `BRANCH_RULES`. Неизвестный ключ → `console.warn` с префиксом `[branch-rules] Unknown branchCondition`, вопрос считается **видимым** (fail-open).
- Ниже — краткая шпаргалка по ключам (без дословного кода; детали смотри в репозитории).


| Key | Назначение |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `has_website` / `no_website` | Ворота по ответу «сайт» (`a5`, нормализация в enum gate) |
| `nosite_social` | `no_website` и в `c_nosite_1` выбран пункт **Social media** (точное совпадение строки) |
| `is_hospitality`, `is_real_estate`, `is_restaurant`, `is_services`, `is_healthcare`, `is_marine` | Отраслевые ветки (ярлык индустрии мапится из dropdown через `INDUSTRY_LABEL_TO_BRANCH_SLUG`) |
| `has_crm` / `no_crm` | Наличие CRM в мультивыборе `d1` (в т.ч. нормализованные / синтетические значения после парсинга ответа) |
| `handles_payments` | Предикат читает нормализованный **`a6`** (`normalizePayments`): сначала ячейка **`a6`**, иначе legacy **`handles_payments`**; старые формулировки classic brief (карта на сайте / hosted checkout / «no payments») сводятся к **yes / sometimes / no** и согласуются с веткой |
| `not_solo` | Команда ≠ solo (`a4`) |
| `spain_based` | Локация (`a3`) |


**UX:** скрытые вопросы не показываются. Клиент не знает, что вопрос существует. Wizard адаптируется динамически.

**Other → specify (банк + классическая форма):** при выборе вариантов, требующих уточнения (`Other`, «Yes, other tool» / «Yes, another tool», «Something else», «Not quite (I will clarify)» — см. `CHOICE_OPTION_LABELS_REQUIRING_SPECIFY` и `choiceSpecifyResponseKey` в `@glc/intake-core`; SPA и сервер импортируют только оттуда), показывается поле; значение пишется в `**${questionId}__other`**, для `**a2**` / `**intake_industry**` — в `**intake_industry_specify**`. Discovery: `**${bankId}__other**`, для `**a2**` при конвертации дублируется в `**intake_industry_specify**`. См. `BriefField`, `IntakeBankWizard`, `DiscoverPage`.

---

## 7. UX Copy & Framing

### Section openers (микротексты)


| Section | Opener | Why it works |
| --------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------- |
| A: Your Business | "Let's start with who you are — this helps us tailor everything to your context." | Клиент чувствует: персонализация, не generic |
| B: Customers & Growth | "Understanding your customers helps us evaluate whether your marketing is hitting the mark." | Привязка к ценности: мы поможем с маркетингом |
| C: Online Presence | "This helps us evaluate your visibility and technical setup." | Конкретная цель, не "заполните форму" |
| D: Operations | "The more we understand how you work, the better we spot where time and money are wasted." | Прямая связь с экономией |
| E: Compliance | "Quick check on security and legal basics — important for EU businesses." | "Quick" снижает тревогу |
| F: Goals | "Last step — help us focus on what matters most to YOU." | Контроль в руках клиента |


### "I don't know" framing

Каждый сложный вопрос (метрики, технические детали) имеет:

- Опцию "Don't know" / "Not sure" / "Someone else handles this"
- Подсказку: *"That's fine — we'll mark this area for a deeper look during the audit."*

Это уходит в `source: "unknown"` в state и в `unknown_items[]` у агента.

### Progress & nudge copy

- After pre-brief: *"You're all set for our first meeting. We've already started analyzing your online presence."*
- After Layer 1: *"Express Audit ready! Want a deeper picture? 15 more minutes unlocks Marketing & Automation analysis."*
- After Layer 2: *"Full picture complete. Your audit will be significantly more accurate."*
- Data quality meter: *"Required: 7/7 complete · Recommended: 9/13 (69%) — a few more answers will sharpen the results"*

---

## 8. AI Readiness Score (продуктовый блок)

Отдельный **индикатор для UI и strategy** (не путать с доменным score 1–5): агрегирует **d4a**, экспорт данных **d4b**, поведенческий источник правды **d4**, долю ручной работы **d3**, узкие места **d2** / **d_automation_attempt**, governance **f7**, и опционально **масштаб** (**a8**, **d6**) для приоритизации «где выше потенциальный impact».

**Шкала 0–100 (heuristic v1 — `calcAiReadinessScore` в `ai_readiness`):**
Normalization of intake answers is centralized in `answer_normalizers` (also reused by discovery mappings), so readiness and discovery logic interpret labels consistently.

| Компонент | Сигнал | Значение |
|-----------|--------|---------|
| База | — | +45 |
| `exportData` | `normalizeD4bExportReadiness(d4b)` | +18 when `quick`; -5 when `painful` or `no` |
| `governance` | `f7` = ясный ответ (не "Not sure") | +17 |
| `automationAttempt` | `normalizeAutomationAttempt(d_automation_attempt) = helped` | +10 |
| `d4aBonus` | `normalizeD4aAiUsage(d4a)` = `daily` / `weekly_or_occasional` | +8 |
| `d2Bonus` | `d2`: длинный текст (legacy) **или** выбран конкретный bucket (не «Something else») | +5 |
| `scaleBonus` | `isA8KnownScale(a8)` | +5 |
| `scaleBonus` | `d6` ≥ 3 типа данных | +5 |
| `scaleBonus` | `a5` = no\_website / under\_construction | +5 (greenfield — см. ниже) |
| Штраф | `normalizeD4aAiUsage(d4a)=low` + `normalizeD3ManualLoad(d3)=high` | −18 |
| Штраф | «размытый» `d4` + команда > solo | −12 |

**Greenfield-бонус (no\_website / under\_construction):** клиент без сайта не несёт legacy web-tech долга; весь scope аудита смещается на process automation, где барьеры внедрения новых инструментов ниже. +5 отражает эту структурную готовность — не компетентность клиента, а меньшее трение для изменений.

Карта в агентов:

- **automation_processes** — полный срез d и auto-attempt.
- **strategy** — интерпретация рисков внедрения и последовательности пилотов.
- **marketing_utp** / **ux_conversion** — только если ответы пересекаются с GTM/контентом (например AI в контенте — через свободный текст в Layer 2 при необходимости).

---

## 9. Total Count Summary

| Category | Universal | Hospitality | Real Estate | Restaurant | Services | Healthcare | Marine |
|----------|-----------|-------------|-------------|------------|----------|------------|--------|
| Section A | 10 | — | — | — | — | — | — |
| Section B | 7 | +2 | +1 | +1 | +1 | +1 | +1 |
| Section C (site) | 9 | — | — | — | — | — | — |
| Section C (no site) | 6 | — | — | — | — | — | — |
| Section D | 14 | +2 | +1 | +1 | — | — | — |
| Section E | 4 | — | — | — | — | — | — |
| Section F | 9 | — | — | — | — | — | — |
| **Total (with site)** | **54+** | **+4** | **+2** | **+2** | **+1** | **+1** | **+1** |
| **Total (no site)** | **51+** | **+4** | **+2** | **+2** | **+1** | **+1** | **+1** |


*После переноса `d4c` → `f7` в D на один id меньше (`f7` считается в F), но операционный блок всё ещё плотный — см. заметку перегрузки в Section D.*

Из-за branching типичный клиент видит существенно меньше, чем полный банк.
Pre-brief: **7** bank id в `modes.pre_brief.bankIncluded` (плюс identity). Quick Intake: **~18–21** (зависит от веток и сайта). Deep Intake: +12–22. Discovery (Mode C): policy-level subset — `intake-policy.v1.json` → `modes.discovery.included` (**50 ids** на текущей версии policy), тогда как публичный discovery wizard intentionally показывает компактный runtime-набор (сейчас 11 шагов из `buildPublicDiscoveryUiFragment`).

---

## 10. Data quality score

**Назначение:** одно число `dataQualityScore ∈ [0,1]` для бейджа прогресса и API (см. `intake_brief`).

**Базовая формула (канон для v1):**

```
requiredWeight = (# answered required visible questions) / (# visible required)
recommendedWeight = (# answered recommended visible) / (# visible recommended)
optionalWeight = (# answered optional visible) / (# visible optional)

dataQualityScore = 0.55 * requiredWeight + 0.35 * recommendedWeight + 0.10 * optionalWeight
```

- «Visible» = множество `plan.visible` из **`buildIntakePlan`** (ветки + политика + layout); для сохранённого поля **`data_quality_score`** в БД используется тот же резолвер с поверхностью **`consultant_interview`** и продуктом **`full`** (см. `DATA_QUALITY_DEFAULT_PLAN_INPUT` в `visibility_from_plan`).
- Пустые / whitespace-only значения не считаются answered.
- Веса можно калибровать по режиму продукта (`express` снижает долю optional).

---

## 11. Recon prefill & conflicts

При подтверждении **c1** или других рекон-полей:

```typescript
interface ReconConflict {
 questionId: string; // e.g. "c1"
 detectedValue: string; // from recon collector
 clientValue: string; // free text or structured override
 status: 'open' | 'resolved';
 resolvedAt?: string; // ISO
 notes?: string;
}
```

`reconConflicts[]` хранится рядом с `reconPrefills` в брифе; агенты получают **краткий слайс** «известные расхождения клиент vs crawl» в `AgentContext`.

---

## 12. Post-audit questions (lifecycle)

`postAuditQuestions[]` пополняется из review gates, strategy follow-ups и ручных пометок консультанта.

```typescript
interface PostAuditQuestionItem {
 id: string;
 domain?: string;
 question: string;
 reason: string;
 answered: boolean;
 answeredAt?: string;
 source?: 'review_gate' | 'strategy' | 'consultant';
}
```

Правила: элемент не удаляется при `answered=true` (аудит истории); UI показывает выполненные свёрнутым списком.

---

## 13. TypeScript Interface

```typescript
type Priority = 'required' | 'recommended' | 'nice';
type InputType = 'select' | 'multi' | 'text' | 'textarea' | 'number' | 'rating' | 'confirm';
type Layer = 'pre' | '1' | '2' | 'disc';

interface IntakeQuestion {
 id: string; // e.g. "a1", "b_hotel_1"
 section: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
 priority: Priority;
 inputType: InputType;
 layers: Layer[]; // which layers include this question
 label: string; // question text
 helperText?: string; // example / hint
 options?: { value: string; label: string }[];
 allowOther?: boolean; // adds "Other → text" option
 allowUnknown?: boolean; // adds "Don't know" option
 branchCondition?: string; // key in BRANCH_RULES
 feedsDomains: string[]; // which agents use this answer
}

interface IntakeResponse {
 value: string | string[] | number | boolean | null;
 source: 'client' | 'consultant' | 'recon_confirmed' | 'unknown';
 answeredAt?: string; // ISO timestamp
}

interface IntakeBrief {
 status: 'pre_brief' | 'layer_1' | 'layer_2' | 'complete';
 collectedBy: 'client' | 'consultant' | 'mixed';
 collectionMode: 'self_serve' | 'interview' | 'discovery';
 dataQualityScore: number; // 0.0 – 1.0 (см. §10)
 aiReadinessScore?: number; // 0 – 100 (см. §8)
 responses: Record<string, IntakeResponse>;
 reconPrefills: Record<string, { detected: string; confirmedByClient: boolean | null }>;
 reconConflicts?: ReconConflict[];
 postAuditQuestions: PostAuditQuestionItem[];
}
```

---

## 14. Что убрано из текущего набора и почему


| Текущий вопрос | Решение | Причина |
| -------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `monthly_visitors` | Убран | Клиент редко знает точно; GA/Recon покроет если есть доступ |
| `monthly_revenue` | Убран | Слишком личный для первого контакта; нерелевантен для tech-аудита |
| `conversion_rate` | Убран | Почти никто не знает; агент сам определит по данным |
| `top_keywords` | Убран | Агент сам найдёт через Recon/SERP; клиент обычно не знает |
| `hosting_provider` | Заменён на c1 (confirm Recon) | Recon сам определит; клиенту проще подтвердить |
| `has_staging` | Убран | Слишком техничный; релевантен только для 10% клиентов |
| `has_privacy_policy` | Убран из вопросов | Recon сам проверит наличие; это задача Security Agent |
| `email_automation` | Стал d5 (проще) | Был слишком технический; теперь select с human-friendly опциями |

**Classic intake — те же опции, прежние ключи в `responses`:** в классической форме для платежей, бюджета и email-автоматизации в JSON по-прежнему пишутся **`handles_payments`**, **`budget_for_changes`**, **`email_automation`**, а тексты и option set совпадают с банком **`a6`**, **`f5`**, **`d5`** (`classicBankBriefRow` + `responseId`). При конвертации Discovery в бриф, если задан только **`a6`**, патч дублирует значение в **`handles_payments`**, чтобы ячейка classic ключа не оставалась пустой.

**Добавлено:** отраслевые вопросы (10+), value-first формулировки целей (**f1–f2**, **b3**, helpers), стадия бизнеса (**a7**), ранний платёжный gate (**a6**), масштаб без финансовой детали (**a8**), типы данных (**d6**), руководство по тону (**§2.4**), self-rating (f3), frustrations (c6), guarantees (b6), no-site path, branching по CRM.

---

## 15. Question bank change protocol (mandatory)

Use this checklist for **any** change to `question_bank.v1`, answer options, or wording that affects runtime behavior.

1. **Update canon and UI overrides together**
 - Update `question-bank.v1.json` (`answer` contract and labels where needed).
 - Update `bank_question_ui_overrides` when UI type/options/hints change.
 - If needed, regenerate canon contracts via `server/scripts/embed-question-bank-answers.ts`.

2. **Keep “specify” behavior in sync**
 - If a new option requires clarification text, update `choice_specify_triggers`.
 - Confirm `__other` capture works in both classic and wizard flows.

3. **Re-evaluate derived logic and AI readiness**
 - Review `ai_readiness` and `answer_normalizers` for string/value assumptions tied to changed options.
 - Review discovery conversion and findings logic (`discovery_flow`, `discover`) for hardcoded option text. Server-side brief seeding from Discovery uses **`discovery_brief_mapping`** (`DISCOVERY_BRIEF_PATCH_A5_NO_WEBSITE_YET` from the bank JSON, plus **`C_NOSITE_1_LEGACY_FIRST_PARTY_WEB_LABELS`** for old stored answers) — extend there instead of duplicating display strings in `discover.ts`.
 - **Synthetic `uses_crm` cell** (not a bank id): stored values are defined in **`discovery-brief-contract.v1.json`** as **`uses_crm:yes` / `uses_crm:no`**; English display and i18n keys live in the same file. Use **`normalizeUsesCrmBriefStoredValue`** when interpreting persisted briefs (handles legacy **`Yes` / `No`**).

4. **Verify API and schema surfaces**
 - Confirm `GET /api/audits/:id/brief/schema` returns the updated `answer` contract.
 - Ensure `buildPublicDiscoveryUiFragment` still matches expected question ids/options.

5. **Run required tests before merge**
 - Frontend:
 - `pnpm vitest bank_question_ui_catalog_parity.test`
 - `pnpm vitest discovery_flow.test`
 - Server (`server/`):
 - `pnpm vitest src/tests/question-bank-answer-contract.test.ts`
 - `pnpm vitest src/tests/discovery-ui-fragment.test.ts`

6. **Update docs in the same PR**
 - Update this file (`QUESTION_BANK.md`) wherever question type/options/flow semantics changed.
 - Update `docs/API.md` if response contract behavior changed.
 - Add a short note in PR summary about affected surfaces (New Audit, Audit Workspace, Discovery, API schema, AI readiness).

7. **Vertical expansion order is mandatory (post-KPI)**
 - Apply new vertical packs only in this order: `E-commerce` -> `SaaS / Software` -> `Retail`.
 - One vertical pack per release train; do not parallelize pack rollouts.
 - For each pack, add/update parity tests and sequencing artifact metadata before enabling traffic.

## 16. Intake Intelligence Contract v1 (baseline + Sprint 2 gate)

This section is the **documentation mirror** of `lintIntelligenceContractV1`, `intake-intelligence-contract.test.ts`, and [`ADR-DECISION-IMPACT-METADATA-V1.md`](./adrs/ADR-DECISION-IMPACT-METADATA-V1.md). Sprint 1 definitions still apply; Sprint 2 adds a **47-question full-contract gate** (see §2.1.1).

- Contract location: `packages/intake-core/src/config/intake-intelligence-contract.ts`
- Sprint 2 gate rows: `packages/intake-core/src/config/intake-intelligence-gate-metadata.ts`
- Gate rules and info-gain floor: `packages/intake-core/src/config/intake-intelligence-sprint2.ts` (see [`ADR-INFO-GAIN-THRESHOLD-V1.md`](./adrs/ADR-INFO-GAIN-THRESHOLD-V1.md))
- Required now (`required_now`) fields:
  - `whyAsked`
  - `semanticDomain` (`market | value | economics | operations | resources | risks`)
  - `decisionImpact` (minimum one item)
- Sprint 2 **full** contract (gate ids only): `required_now` + `stewardship` + non-empty `signalContribution` with `expectedInfoGainBits` ≥ **0.3** + `followupPolicy` + `stopCondition`, and **no** `todo`.
- Optional-with-todo fields for ids **outside** the Sprint 2 gate (when not yet Sprint-2-complete):
  - `signalContribution`, `followupPolicy`, `stopCondition`
  - `todo` (`ownerDomain`, `reviewByIsoDate`, `todoReason`) for non-P0 questions, or partial P0 extensions documented in `intake-intelligence-contract.ts`

P0 scope is computed from:
- all bank ids used by critical signals registry (`packages/intake-core/src/artifacts/intake-critical-signals-pilot-1.0.0.json`)
- all Section `F` (goals) bank questions

Lint and fallback behavior:
- `lintIntelligenceContractV1` blocks CI when a P0 question misses any `required_now` field
- `semanticDomain` outside Core Spine is a hard error
- any id in the **Sprint 2 gate set** missing the full Sprint 2 contract shape → **`INTELLIGENCE_SPRINT2_INCOMPLETE`** (**error**)
- anti-pattern heuristics: **errors** for leading / tautological / vanity / double-barreled / generic / outside-scope / low-gain labels; duplicate-intent fingerprint remains warn unless embedding-threshold duplicate triggers an error.
- owner governance: `ownerDomain` is derived from `decisionImpact.target` domain and linted for consistency (`INTELLIGENCE_OWNER_DOMAIN_MISMATCH`).
- runtime fallback keeps questions visible and emits `intelligence_metadata_incomplete` trace when metadata is incomplete
- canonical ADR: [`ADR-DECISION-IMPACT-METADATA-V1.md`](./adrs/ADR-DECISION-IMPACT-METADATA-V1.md)

Current enforcement matrix:

| Rule | Level | Checked in |
| --- | --- | --- |
| P0 question has `whyAsked`, `semanticDomain`, and `decisionImpact[0]` | error | `lintIntelligenceContractV1`, `intake-intelligence-contract.test.ts` |
| `semanticDomain` belongs to Core Diagnostic Spine | error | `lintIntelligenceContractV1`, `lint-intelligence-contract.test.ts` |
| Sprint 2 gate id missing full contract (stewardship, signalContribution ≥ 0.3 bits, follow-up, stop, no todo) | error | `lintIntelligenceContractV1` (`INTELLIGENCE_SPRINT2_INCOMPLETE`) |
| Non-P0 question outside Sprint-2-complete: valid `todo` | error in tests; lint may warn on incomplete todo rows | `intake-intelligence-contract.test.ts`, `lintIntelligenceContractV1` |
| Anti-pattern heuristics (see §16.1) | error or warn per code | `lintIntelligenceContractV1` |
| Incomplete metadata does not break runtime plan build | runtime guard | `build-intake-plan.ts`, `intelligence-fallback-runtime.test.ts` |

Deterministic baseline snapshot (**must match** `intake-intelligence-contract.test.ts`):
- `question_count = 78`
- `P0_question_count = 17` (derived from critical signals ∪ section **F**)
- `fully_covered_questions = 78` (`required_now` present via `hasIntakeIntelligenceRequiredNow`) = **100%**
- `fully_covered_P0_questions = 17` (**100%** of P0)
- `Sprint_2_gate_question_count = 47`; **`Sprint_2_complete_questions = 47`** (`getIntakeIntelligenceSprint2CoverageSummary`, ratio **1**)

Baseline release gate policy:
- Any PR that changes `question-bank.v1.json`, P0 scope, Sprint 2 gate ids, or intelligence contract coverage must update:
  - `packages/intake-core/src/tests/intake-intelligence-contract.test.ts` (deterministic baseline expectations)
  - this section baseline snapshot values
- Mismatched updates are treated as a release-blocking contract drift.

### 16.1 Anti-pattern taxonomy (mixed severity)

Lint codes in `lint-intelligence-contract.ts` (label-based heuristics unless noted):

| Category | Lint code (prefix `INTELLIGENCE_ANTIPATTERN_*` where applicable) | Severity |
| --- | --- | --- |
| Generic opening | `GENERIC` | **error** |
| Leading framing | `LEADING` | **error** |
| Tautological | `TAUTOLOGICAL` | **error** |
| Vanity metrics | `VANITY` | **error** |
| Outside spine (label shape) | `OUTSIDE_SCOPE` | **error** |
| Low gain (label) | `LOW_GAIN` | **error** |
| Double-barreled | `DOUBLE_BARRELED` | **error** |
| `whyAsked` contains low-information phrases | `INTELLIGENCE_LOW_GAIN_WHY_ASKED` | **error** |
| Duplicate intent fingerprint vs same `semanticDomain` + `decisionImpact[0].target` | `INTELLIGENCE_DUPLICATE_INTENT` | warn |

Editorial guidance for authors is unchanged; only CI severity differs by row.

### 16.2 Decision-Intelligence DoD (single source of truth)

| Criterion | Proof path | Command / test | Pass condition |
| --- | --- | --- | --- |
| P0 has required-now fields (`whyAsked`, `semanticDomain`, `decisionImpact[0]`) | `packages/intake-core/src/config/intake-intelligence-contract.ts`, `packages/intake-core/src/tests/intake-intelligence-contract.test.ts` | `pnpm -w exec vitest run packages/intake-core/src/tests/intake-intelligence-contract.test.ts` | All P0 ids pass `hasIntakeIntelligenceRequiredNow` |
| Invalid `semanticDomain` is blocked | `packages/intake-core/src/core/lint-bank-policy/lint-intelligence-contract.ts`, `packages/intake-core/src/tests/lint-intelligence-contract.test.ts` | `pnpm -w exec vitest run packages/intake-core/src/tests/lint-intelligence-contract.test.ts` | Lint emits `INTELLIGENCE_SEMANTIC_DOMAIN_INVALID` as `error` |
| Missing required-now for P0 is blocked | same as above | same as above | Lint emits `INTELLIGENCE_REQUIRED_NOW_MISSING` as `error` |
| Non-P0 outside Sprint-2-complete has valid `todo` | `packages/intake-core/src/tests/intake-intelligence-contract.test.ts` | `pnpm -w exec vitest run packages/intake-core/src/tests/intake-intelligence-contract.test.ts` | All such ids pass `isValidIntakeIntelligenceTodo` |
| Sprint 2 gate fully enriched | `intake-intelligence-sprint2.ts`, `intake-intelligence-gate-metadata.ts`, `intake-intelligence-contract.test.ts` | same Vitest file | `gateQuestionCount === 47` and `sprint2CompleteRatio === 1` |
| Runtime fallback never crashes on incomplete metadata | `packages/intake-core/src/core/build-intake-plan.ts`, `packages/intake-core/src/tests/intelligence-fallback-runtime.test.ts` | `pnpm -w exec vitest run packages/intake-core/src/tests/intelligence-fallback-runtime.test.ts` | Plan build succeeds and emits `intelligence_metadata_incomplete` trace when applicable |
| Baseline remains deterministic (`78` / `17` P0 / `54` required_now / `47` Sprint2 / P0 `100%`) | `packages/intake-core/src/tests/intake-intelligence-contract.test.ts`, this doc section | `pnpm -w exec vitest run packages/intake-core/src/tests/intake-intelligence-contract.test.ts` | Snapshot numbers match tests and docs |
| Package-level verification is green | `packages/intake-core/src/tests/` | `pnpm -w exec vitest run packages/intake-core/src/tests/intake-intelligence-contract.test.ts packages/intake-core/src/tests/lint-intelligence-contract.test.ts packages/intake-core/src/tests/intelligence-fallback-runtime.test.ts` | Command exits 0 |

Release `go/no-go` rule:
- `go` only when every row above is green in the same branch.
- Any failure is `no-go` until code + docs are reconciled.

### 16.3 Post-Sprint roadmap lock (sequence)

Rollout order (items **1–2** are shipped in code + UI; **3+** remain iterative):

1. ~~Sprint 2 / Phase 1b~~: public intake shows `whyAsked`, `decisionImpact`, readiness + signal state (`IntakeBriefFormPhase`, `useIntakeBriefController`).
2. ~~Sprint 2.5 (partial)~~: anti-pattern **hard errors** for selected codes in `lintIntelligenceContractV1`; remaining heuristics stay **warn**.
3. **Sprint 3+**: progressive certainty trace vocabulary, KPI pipeline coverage, follow-up/stop **runtime** consumer, NL orchestration (see ADR changelog).
4. **After KPI baseline**: NL-first polish and governance; stage-aware branching + vertical packs per checklist item **7. Vertical expansion order is mandatory (post-KPI)** in this document.

Still strict out-of-scope for ungoverned rollout:
- embedding-based semantic dedup gates,
- numeric info-gain **runtime** scoring beyond the authored `expectedInfoGainBits` field,
- stage-aware branching expansion **without** question-bank protocol + tests (when enabled, follow checklist item **7** in this document).

## Для разработчиков

Ниже перечислены технические пути реализации для инженерной навигации.

- `packages/intake-core/src/brief-gates.ts`
- `server/src/tests/intake-brief-policy-sync.test.ts`
- `packages/intake-core/src/core/lint-bank-policy/` (facade: `lint-bank-policy.ts`)
- `packages/intake-core/src/core/plan-derived.ts`
- `server/src/routes/intake.ts`
- `server/src/routes/audits.ts`
- `packages/intake-core/src/core/build-brief-schema-snapshot.ts`
- `src/app/lib/discovery-flow.ts`
- `packages/intake-core/src/question-bank.ts`
- `packages/intake-core/src/artifacts/question-bank-1.0.0.json`
- `packages/intake-core/src/core/branch-condition-deps.ts`
- `packages/intake-core/src/discovery-wizard-questions.ts`
- `server/src/tests/discovery-policy-sync.test.ts`
- `server/src/schemas/intake-brief-questions.ts`
- `server/src/schemas/intake-brief.ts`
- `src/app/data/briefQuestions.ts`
- `src/app/data/brief-spa-parity.test.ts`
- `src/app/data/bank-question-ui-catalog-parity.test.ts`
- `packages/intake-core/src/branch-rules.ts`
- `packages/intake-core/src/is-visible.ts`
- `packages/intake-core/src/ai-readiness.ts`
- `packages/intake-core/src/answer-normalizers.ts`
- `packages/intake-core/src/visibility-from-plan.ts`
- `packages/intake-core/src/question-bank.v1.json`
- `packages/intake-core/src/bank-question-ui-overrides.ts`
- `packages/intake-core/src/choice-specify-triggers.ts`
- `server/src/routes/discover.ts`
- `packages/intake-core/src/discovery-brief-mapping.ts`
- `packages/intake-core/src/question-feed-roles.ts`
- `src/app/lib/discovery-flow.test.ts`
