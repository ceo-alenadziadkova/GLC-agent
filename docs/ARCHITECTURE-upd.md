# GLC Audit Pipeline v1 — Architecture

> Техническая архитектура пайплайна.
> Идея, принятые решения и бизнес-контекст — в [CONCEPT-upd.md](./CONCEPT-upd.md).
> Каноническая архитектура репозитория (реализованный продукт) — в [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 0. ADR — TypeScript-first (v1)

| Field | Decision |
|-------|----------|
| **Status** | Accepted |
| **Context** | Нужно как можно быстрее довести **Free UX Snapshot** и **Express Audit** до живых клиентов; кодовая база уже на Node.js/TypeScript + Supabase. |
| **Decision** | **v1 = TS-first:** оркестрация, агенты, verification, отчёты и snapshot — на TypeScript (Express, `cheerio`, Zod, Anthropic SDK). |
| **Consequence** | Python не является обязательным runtime пайплайна в v1. Тяжёлый crawl / OCR / NLP / ML при необходимости выносятся в **отдельный Python-микросервис** только после срабатывания go/no-go критериев (см. [§12](#12-v2-architecture-notes--python-go-no-go)). |

---

## 1. Overview

**Цель:** Полуавтоматический аудит-пайплайн. На входе — URL + Intake Brief.
На выходе — структурированный Markdown-отчёт со scorecard (1–5 + цвет + текст).

**Стек (v1, реализация):** Node.js **20+** + **TypeScript** + Express + **Supabase** (PostgreSQL, Auth, Realtime) + **Claude API** (`claude-sonnet-4-20250514`) + `cheerio` (парсинг HTML) + **Zod** (контракты ответов) + `fetch` (HTTP). Фронтенд: React 18 + Vite (см. [ARCHITECTURE.md](./ARCHITECTURE.md)).

**Режим:** Полуавтоматический — Data First.
Все данные от клиента и автосканов собираются ДО запуска доменных агентов.
Alena ревьюит в двух точках. Галлюцинации запрещены на уровне архитектуры.

**Продуктовые режимы:**

| Режим | Фазы | Бриф | Competitor |
|-------|-------|------|------------|
| Free UX Snapshot | 0 + 4 (partial) | Нет | 1 мини |
| Express Audit | 0–4 | 🔴 only | 1 |
| Full Audit | 0–7 | Full | 2–3 |

---

## 2. Pipeline Flow — Data First

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1A: BASE INTAKE BRIEF                                │
│                                                             │
│  ┌──────────────────────────────────────────────────┐       │
│  │  Universal Intake Brief (~25 questions)           │       │
│  │  Client fills BEFORE anything else                │       │
│  │  🔴🟡🟢 — same for all industries                │       │
│  └──────────────────────┬───────────────────────────┘       │
│                         ▼                                    │
│  STEP 1B: RECON + BRIEF ENRICHMENT                          │
│                                                             │
│  ┌──────────────────────────┐                               │
│  │  Phase 0: RECON AGENT    │                               │
│  │  (crawl + auto-detect)   │                               │
│  │  URL → tech, social,     │                               │
│  │  languages, structure    │                               │
│  └──────────┬───────────────┘                               │
│             ▼                                                │
│  ┌──────────────────────────┐                               │
│  │  ENRICHMENT:             │                               │
│  │  Recon adds 2-5 industry │                               │
│  │  specific questions      │                               │
│  │  (e.g. "Cloudbeds —      │                               │
│  │  единственная система?") │                               │
│  │  Client answers → merge  │                               │
│  └──────────┬───────────────┘                               │
│             ▼                                                │
│  ┌──────────────────────────┐                               │
│  │  MERGED DATA SET         │                               │
│  │  brief + recon + enriched│                               │
│  │  discrepancies flagged   │                               │
│  └──────────┬───────────────┘                               │
│             ▼                                                │
│  ┌──────────────────────────┐                               │
│  │  Competitor Recon (opt.) │                               │
│  │  2-3 competitors, Alena  │                               │
│  │  confirms list at RP#1   │                               │
│  └──────────┬───────────────┘                               │
└─────────────┼───────────────────────────────────────────────┘
              ▼
   ★ REVIEW POINT #1 ★
   Alena: data complete?
   🔴 gaps → collect more
   discrepancies → resolve
   competitor list → confirm
              ▼
┌─────────────┴───────────────────────────────────────────────┐
│  STEP 2: DOMAIN AGENTS (parallel wings in v1)              │
│                                                             │
│  Auto wing — Phases 1–4 in PARALLEL:                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ Phase 1:     │ │ Phase 2:     │ │ Phase 3:     │         │
│  │ TECH INFRA   │ │ SECURITY &   │ │ SEO &        │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│  ┌──────────────┐                                           │
│  │ Phase 4: UX  │                                           │
│  └──────────────┘                                           │
│                                                             │
│  Analytic wing — Phases 5–6 in PARALLEL, then Phase 7 seq.: │
│  ┌──────────────┐ ┌──────────────┐         ┌──────────────┐ │
│  │ Phase 5:     │ │ Phase 6:     │   →     │ Phase 7:     │ │
│  │ MARKETING    │ │ AUTOMATION   │         │ STRATEGY     │ │
│  └──────────────┘ └──────────────┘         └──────────────┘ │
│                                                             │
│  Each agent:                                                │
│  1. Receives CONTEXT SLICE (not full state — see §4.0)      │
│  2. Runs analysis + self-check                              │
│  3. Writes ONLY its domain row / strategy (Supabase)        │
│  4. Marks [UNKNOWN] for missing data — never assumes        │
│  5. Idempotent: can be re-run without side effects          │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌──────────────────────┴──────────────────────────────────────┐
│  STEP 3: VERIFICATION LAYER                                 │
│                                                             │
│  ┌──────────────────────────┐                               │
│  │ Cross-agent consistency  │  ← автоматическая проверка    │
│  │ check contradictions     │  противоречий между агентами  │
│  └────────────┬─────────────┘                               │
│               ▼                                              │
│  ┌──────────────────────────┐                               │
│  │ Quality gate             │  ← confidence: low?           │
│  │ no unresolved issues     │  ← [DISCREPANCY] resolved?    │
│  │ all 🔴 brief answered?   │  ← evidence for all recs?     │
│  └────────────┬─────────────┘                               │
└───────────────┼─────────────────────────────────────────────┘
                ▼
     ★ REVIEW POINT #2 ★
     Alena: QA Checklist (7 points)
     focus on medium/low confidence
                ▼
     ┌────────────────────────┐
     │  Phase 7: STRATEGY &   │  ← синтез всех фаз
     │  ROADMAP               │
     └───────────┬────────────┘
                 ▼
     ┌────────────────────────┐
     │  REPORT GENERATOR      │  ← Markdown (profile-based)
     │  + Action Plan CSV     │
     └────────────────────────┘
```

---

## 3. Data Contract (JSON)

**Логический контракт** ниже описывает форму «единого state» (как если бы это был `audit_state.json`): одна сущность аудита, секции `meta`, `intake_brief`, `recon`, `domains`, `strategy_roadmap`, `verification`.

**Физическое хранение (v1):** PostgreSQL через **Supabase** — строки в `audits`, `intake_brief`, `audit_recon`, `audit_domains`, `audit_strategy`, `review_points`, `pipeline_events`, `collected_data`. API может собрать эквивалент JSON для экспорта/отладки.

Каждый доменный агент обновляет **только** свою запись в `audit_domains` (по `domain_key`), не перезаписывая чужие домены.

```json
{
  "meta": {
    "audit_id": "glc-audit-2026-03-28-hotelxyz",
    "company_url": "https://hotelxyz.com",
    "created_at": "2026-03-28T10:00:00Z",
    "pipeline_version": "v1.0",
    "product_mode": "full",
    "status": "in_progress",
    "current_phase": 0,
    "report_config": {
      "profiles": ["owner", "full"],
      "lang_primary": "en",
      "lang_summary": "es",
      "include_competitor_benchmark": true,
      "scope": ["tech_infrastructure", "security_compliance", "seo_digital",
                "ux_conversion", "marketing_utp", "automation_processes"]
    }
  },

  "intake_brief": {
    "status": "completed",
    "answered_required": 7,
    "answered_recommended": 10,
    "answered_optional": 3,
    "sla_met": true,
    "responses": {
      "business_description": "Boutique hotel in Palma old town...",
      "ideal_client": "European couples, 30-55, seeking authentic...",
      "main_problem": "Low direct bookings, too dependent on OTAs...",
      "differentiator": "Historic building, rooftop restaurant...",
      "daily_routine": "...",
      "repeated_tasks": "...",
      "audit_focus": ["marketing", "tech", "ux"]
    },
    "unanswered_required": [],
    "unanswered_recommended": ["backup_monitoring", "tech_budget"],
    "industry_specific_questions": [
      "Cloudbeds — единственная система, или есть другие каналы?"
    ]
  },

  "recon": {
    "status": "completed",
    "company_name": "Hotel XYZ",
    "industry": "hospitality / tourism",
    "industry_subcategory": "boutique hotel",
    "location": "Palma de Mallorca, Spain",
    "languages_detected": ["es", "en", "de"],
    "estimated_size": "10-50 employees",
    "business_model": "B2C, direct + OTA",
    "target_audience": "European tourists, couples",
    "key_services_products": ["rooms", "rooftop restaurant", "events"],
    "value_proposition_detected": "Historic charm in Palma center",
    "mallorca_relevance": "Peak season May-Oct, German market 40%",
    "website_pages_crawled": [
      {"url": "/", "title": "Hotel XYZ — Boutique Hotel Palma", "status": 200}
    ],
    "tech_stack_hints": {
      "cms": ["WordPress"],
      "analytics": ["Google Analytics 4"],
      "hosting_cdn": ["Cloudflare"],
      "booking": ["Cloudbeds"]
    },
    "social_profiles": {
      "instagram": "hotelxyz",
      "tripadvisor": "Hotel_Review-..."
    },
    "competitors_detected": ["Hotel ABC", "Hotel DEF"],
    "contact_info": {},
    "discrepancies_with_brief": []
  },

  "competitors": [
    {
      "name": "Hotel ABC",
      "url": "https://hotelabc.com",
      "type": "direct_local",
      "recon_summary": {
        "tech_stack": {"cms": ["Wix"]},
        "languages": ["es", "en"],
        "pages_count": 8,
        "has_booking_engine": true,
        "has_de_version": false
      }
    }
  ],

  "competitor_benchmark": {
    "tech_infrastructure": {"client": 3, "Hotel ABC": null, "Hotel DEF": null},
    "security_compliance": {"client": 2, "Hotel ABC": null, "Hotel DEF": null},
    "seo_digital":         {"client": null, "Hotel ABC": null, "Hotel DEF": null},
    "ux_conversion":       {"client": null, "Hotel ABC": null, "Hotel DEF": null},
    "marketing_utp":       {"client": null, "Hotel ABC": null, "Hotel DEF": null},
    "notes": []
  },

  "domains": {
    "tech_infrastructure": {
      "status": "completed",
      "score": 3,
      "color": "yellow",
      "label": "Needs Improvement",
      "summary": "WordPress 5.8 with outdated plugins...",
      "strengths": [
        {
          "item": "SSL certificate valid until 2027",
          "impact": "low",
          "evidence_refs": [{"type": "ssl_scan", "url": "https://hotelxyz.com"}],
          "confidence": "high",
          "data_source": "auto_detected"
        }
      ],
      "weaknesses": [
        {
          "item": "WordPress version 5.8 (current: 6.5)",
          "impact": "high",
          "effort": "medium",
          "quick_win": false,
          "recommendation": "Update WordPress to 6.5",
          "estimated_time": "4-8 hours",
          "estimated_cost": "€200-500",
          "business_impact": "12 known vulnerabilities patched",
          "evidence_refs": [
            {
              "type": "html_meta_tag",
              "url": "https://hotelxyz.com",
              "finding": "<meta name='generator' content='WordPress 5.8'>",
              "timestamp": "2026-03-28T10:15:00Z"
            }
          ],
          "agent_name": "tech_infrastructure",
          "confidence": "high",
          "data_source": "auto_detected",
          "relevance": "HIGH_VALUE",
          "verified_by": null
        }
      ],
      "quick_wins": [],
      "recommendations": [],
      "unknown_items": [
        {
          "item": "Backup status",
          "reason": "Not provided in brief",
          "suggestion": "Verify with hosting provider"
        }
      ],
      "raw_data": {}
    }
  },

  "verification": {
    "cross_agent_checks": [
      {
        "type": "consistency",
        "agents": ["tech_infrastructure", "seo_digital"],
        "issue": null,
        "status": "passed"
      }
    ],
    "quality_gate": {
      "all_required_brief_answered": true,
      "no_low_confidence_unreviewed": true,
      "no_unresolved_discrepancies": true,
      "passed": true
    }
  },

  "strategy_roadmap": {
    "status": "pending",
    "executive_summary": null,
    "overall_score": null,
    "scorecard_summary": [],
    "quick_wins": [],
    "medium_term": [],
    "strategic": [],
    "v2_teaser": [
      "Воронки и конверсионные пути",
      "Структура продаж и подогрев лидов",
      "Прогрев через контент и лид-магниты",
      "Поиск суперсилы вашего бизнеса"
    ]
  }
}
```

### 3.1. Finding Schema (provenance)

Каждая находка (strength / weakness / recommendation) хранит:

```json
{
  "item": "description",
  "impact": "high|medium|low",
  "evidence_refs": [{"type": "...", "url": "...", "finding": "..."}],
  "agent_name": "domain_key",
  "confidence": "high|medium|low",
  "data_source": "auto_detected|from_brief|inferred|competitor_comparison|web_search",
  "relevance": "CRITICAL|HIGH_VALUE|NICE_TO_HAVE|NOT_APPLICABLE",
  "verified_by": null
}
```

**Без `evidence_refs` + `confidence` → находка не попадает в отчёт.**

### 3.2. Score Scale

| Score | Color | Label | Meaning |
|-------|-------|-------|---------|
| 5 | 🟢 green | Excellent | Лучшие практики |
| 4 | 🟢 green | Good | Работает хорошо, minor improvements |
| 3 | 🟡 yellow | Needs Improvement | Значимые пробелы |
| 2 | 🟠 orange | Significant Issues | Серьёзные проблемы |
| 1 | 🔴 red | Critical | Требуют немедленных действий |
| — | ⚪ gray | Insufficient Data | Недостаточно данных |

### 3.3. Confidence Levels — Criteria and Mapping

**Критерии присвоения (граница между уровнями):**

| Level | Критерий | Примеры |
|-------|----------|---------|
| `high` | Машинный скан / объективный факт, проверяемый повторным запуском | SSL expiry, HTTP headers, meta tags, page load time |
| `medium` | Аналитика на основе ≥2 независимых сигналов | "УТП слабое" (анализ текстов + сравнение с конкурентом) |
| `low` | Один слабый сигнал ИЛИ противоречивые данные | Regex-паттерн без подтверждения, единичное упоминание |

**Маппинг в клиентский отчёт:**

| Internal | In client report |
|----------|------------------|
| `high` | Показывается как факт |
| `medium` | "Based on our analysis of..." |
| `low` | НЕ в отчёте без ревью Alena |

---

## 4. Agent Specifications

### 4.0. Common Rules (all agents)

**Anti-Hallucination (в каждом промпте):**
1. Только `[VERIFIED]` / `[FROM BRIEF]` / `[UNKNOWN]`. Запрещено: `[ASSUMED]`.
2. Каждая рекомендация → `evidence_refs` + `confidence`.
3. Self-check: "Не выдумал ли я? Могу ли указать источник?"
4. Данные брифа НЕ меняются — только `[DISCREPANCY]`.
5. `confidence: low` → не в отчёт без ревью.
6. Неизвестные параметры → `unknown_items[]`.

**Context Slicing (контроль токенов и качества):**
Каждый агент получает НЕ полный снимок state, а **срез**, собранный из БД и коллекторов:

| Агент | Получает из state |
|-------|-------------------|
| Tech Infra | `recon.tech_stack_hints`, `recon.website_pages_crawled`, `intake_brief.responses.{tech-related}` |
| Security | `recon.tech_stack_hints`, page headers, `intake_brief.responses.{security-related}` |
| SEO | `recon.website_pages_crawled` (meta, headings, structured_data), `competitors[].recon_summary`, `intake_brief.responses.{seo-related}` |
| UX | `recon.website_pages_crawled` (structure, CTA, forms), `intake_brief.responses.{ux-related}` |
| Marketing | `recon.{company_name, industry, value_proposition, social_profiles}`, `competitors[]`, `intake_brief.responses.{marketing-related}` |
| Automation | `recon.tech_stack_hints`, `recon.contact_info`, `intake_brief.responses.{process-related}` |
| Strategy | ALL `domains.*` (scores, summaries, quick_wins, recommendations), `recon` summary, `competitors[]` |

Каждому агенту также всегда передаются: `recon.industry`, `recon.estimated_size`,
`recon.business_model`, `recon.mallorca_relevance` — для калибровки.

**Реализация (код):** `ContextBuilder.build()` + `formatPrompt()` в `server/src/services/context-builder.ts` (срез брифа по домену, recon, `collected_data`, завершённые домены, review notes).

**Идемпотентность:**
Каждый агент перезаписывает ТОЛЬКО свою строку `audit_domains` для своего `domain_key`.
Повторный запуск фазы безопасен: кэш сырых данных в `collected_data`, повторный вызов Claude при retry.

**Операционно:** перезапуск одной фазы — через API пайплайна (`POST .../pipeline/next`, retry phase), а не через отдельный CLI.

**Error Handling:**
- Краулинг: если < 50% страниц успешно → `recon.coverage: "partial"`, агенты адаптируют.
- Claude API: несколько попыток с exponential backoff (см. `BaseAgent`); после исчерпания → `status: "error"`, агент не записывает фейковые данные.
- Парсинг: если данные невалидны → `confidence: low` + `data_source: "parse_error"`, не попадает в отчёт.

---

### 4.1. Phase 0: Reconnaissance Agent ✅

**Input:** URL (+brief для обогащения). **Output:** `recon` + `competitors[]`.

Краулинг до 30 страниц. 80+ tech-паттернов. Social profiles. Languages.
Claude интерпретирует: отрасль, размер, модель, ЦА.
Competitor Recon: light crawl 2–3 конкурентов.
Маркировка `discrepancies_with_brief`.

**НЕ делает:** не оценивает, не рекомендует — только факты.

---

### 4.2. Phase 1: Tech Infrastructure Agent

**Input:** recon + brief. **Output:** `domains.tech_infrastructure`.

| Что проверяет | Source | Confidence |
|---------------|--------|------------|
| Performance (load time, size) | Lighthouse / parse | high |
| Mobile readiness | Viewport + responsive | high |
| CMS version | Meta generator | high |
| Code quality | HTML analysis | high |
| Hosting & CDN | Headers + DNS | high |
| Integrations | Script detection | medium |
| Backups, monitoring | Brief 🟡 | from_brief |

---

### 4.3. Phase 2: Security & Compliance Agent

**Input:** recon + brief. **Output:** `domains.security_compliance`.

| Что проверяет | Source | Confidence |
|---------------|--------|------------|
| HTTPS, SSL/TLS, expiry | SSL scan | high |
| Security headers | HTTP headers | high |
| Cookies | Cookie analysis | high |
| GDPR compliance | HTML analysis | high |
| Form security | HTML analysis | high |
| Payment processing | Brief 🔴 | from_brief |
| Verifactu readiness | Brief 🔴 | from_brief |

---

### 4.4. Phase 3: SEO & Digital Presence Agent

**Input:** recon + brief + competitors. **Output:** `domains.seo_digital`.

| Что проверяет | Source | Confidence |
|---------------|--------|------------|
| Meta tags, canonical, OG | HTML analysis | high |
| Heading structure | HTML analysis | high |
| robots.txt, sitemap.xml | HTTP fetch | high |
| Structured data | HTML analysis | high |
| hreflang | HTML analysis | high |
| Google indexation | Web search | medium |
| Core Web Vitals | Lighthouse | high |
| Social presence | Recon + search | medium |
| vs Competitors | Competitor Recon | medium |

---

### 4.5. Phase 4: UX & Conversion Agent

**Input:** recon + brief + tech data. **Output:** `domains.ux_conversion`.

| Что проверяет | Source | Confidence |
|---------------|--------|------------|
| Mobile responsiveness | Auto scan | high |
| Navigation | HTML analysis | high |
| CTA analysis | HTML analysis | high |
| Form UX | HTML analysis | high |
| Readability, hierarchy | Heading structure | high |
| Accessibility (WCAG) | Auto scan | high |
| Performance | Lighthouse | high |
| Primary user actions | Brief 🔴 | from_brief |

**Free UX Snapshot:** partial output (2/7 issues, 2 quick wins, 1 competitor mini).

---

### 4.6. Phase 5: Marketing & УТП Agent

**Input:** recon + brief + competitors. **Output:** `domains.marketing_utp`.

Без 🔴 ответов из брифа → `Score: — ⚪ Insufficient Data`.

| Что проверяет | Source | Confidence |
|---------------|--------|------------|
| Site copy, offers, CTA | Recon crawl | medium |
| Competitor positioning | Competitor Recon | medium |
| Social, tone of voice | Recon | medium |
| Ideal client | Brief 🔴 | from_brief |
| Differentiator | Brief 🔴 | from_brief |
| Trust signals | Site + brief | high/medium |

---

### 4.7. Phase 6: Automation & Processes Agent

**Input:** recon + brief. **Output:** `domains.automation_processes`.

Без 🔴 ответов из брифа → `Score: — ⚪ Insufficient Data`.

| Что проверяет | Source | Confidence |
|---------------|--------|------------|
| Detected integrations | Recon tech stack | high |
| Site forms | HTML analysis | high |
| Daily routine | Brief 🔴 | from_brief |
| Repeated tasks | Brief 🔴 | from_brief |
| Process documentation | Brief 🟡 | from_brief |

**Выход:** часы/€ экономии + несколько вариантов решения.

---

### 4.8. Phase 7: Strategy & Roadmap Agent

**Input:** ALL phases + brief + competitors. **Output:** `strategy_roadmap`.

1. Executive Summary (топ-3 инсайта, суммарный потенциал).
2. Scorecard Summary table.
3. Competitor Benchmark table (if enabled).
4. Prioritized Roadmap: Quick Wins → Medium → Strategic.
5. v2 Teaser.
6. Recommended GLC package.
7. Action Plan CSV export.

**Partial failure handling:**
Если 1–2 домена в `status: "error"` или `"insufficient_data"`:
- Roadmap строится по доступным доменам.
- Домены с ошибками отображаются как "Not assessed (technical error / insufficient data)".
- Scorecard показывает `— ⚪` для этих доменов, overall score считается только по доступным.
- В Executive Summary явно указывается: "This audit covers N of 6 domains. [Domain X] could not be assessed due to [reason]."
- Alena получает уведомление (лог + пометка в state) для принятия решения: перезапустить агент или выпустить отчёт как есть.

---

## 5. Verification Layer

### 5.1. Self-check (per agent, in prompt)
- "Каждая рекомендация → evidence?"
- "Противоречия с брифом?"
- "Не выдумал ли цифры?"
- "Могу указать источник?"

### 5.2. Cross-agent Consistency
- Tech vs SEO: CMS/framework match?
- Score logic: Tech 1/5 + Security 5/5 → маловероятно.
- Marketing vs Site: "нет УТП" vs явное УТП на сайте.

### 5.3. Quality Gate
Блокирует отчёт если: `confidence: low` без ревью, неразрешённые `[DISCREPANCY]`,
🔴 вопросы без ответа (Full Audit).

### 5.4. Human QA Checklist (7 пунктов)
1. ☐ Рекомендации → evidence?
2. ☐ Нет `confidence: low` без пометки?
3. ☐ Нет `[DISCREPANCY]` без резолюции?
4. ☐ Scorecard адекватен контексту?
5. ☐ Quick wins реалистичны?
6. ☐ Tone — профессиональный?
7. ☐ Нет фактических ошибок?

---

## 6. LLM Orchestration

### 6.1. Prompt Management

**Сейчас (v1):** системные инструкции задаются в коде агентов (getter `instructions` в `server/src/agents/*.ts`, базовый контракт в `BaseAgent`), пользовательское сообщение — фактический контекст из `ContextBuilder.formatPrompt()` (system / user split).

**Целевое улучшение:** вынести промпты в `server/prompts/*.md` (или аналог) и версионировать в Git; опционально писать `prompt_version` в метаданные запуска / события.

Токены и модель логируются в `pipeline_events` (`token_usage`) и в `TokenTracker`.

### 6.2. LLM Client

**Реализация:** `BaseAgent` + `@anthropic-ai/sdk` в `server/src/agents/base.ts` (и переопределения в `recon.ts` / `strategy.ts` где нужен особый save path).

- System = роль агента; user message = срез контекста (см. `ContextBuilder`).
- **Retry:** до нескольких попыток с exponential backoff на 429/5xx.
- **Структурированный вывод:** `tool_use` + JSON schema из Zod (`zodToJsonSchema`), затем `safeParse` / `parse`.
- **Fact-check** после вызова: `FactChecker` (`server/src/services/fact-checker.ts`).
- **Метрики:** `pipeline_events` (`token_usage`, `fact_check`, `quality_gate`).

Пример полезной телеметрии (ориентир для observability):

```json
{
  "domain_key": "tech_infrastructure",
  "input_tokens": 3200,
  "output_tokens": 1800,
  "model": "claude-sonnet-4-20250514",
  "phase": 1
}
```

### 6.3. Token Budget

| Режим | Примерный бюджет (input + output) | Агенты |
|-------|-----------------------------------|--------|
| Free Snapshot | ~15K tokens | Recon (partial) + UX (partial) |
| Express | ~60K tokens | Recon + 4 auto-agents |
| Full Audit | ~120K tokens | Recon + 6 agents + Strategy |

Бюджет — ориентировочный, зависит от размера сайта.

### 6.4. Configuration

**Сейчас:** пороги и лимиты разнесены по коду (`server/src/config/model.ts`, `server/src/collectors/crawler.ts`, `audits.token_budget`, rate limits, Zod-схемы) и переменным окружения.

**Целевое состояние:** единый файл конфигурации (YAML/JSON) или таблица настроек, отражающая ниже логические значения — без дублирования магических чисел в агентах.

Ориентир по полям (как в прежнем `config.yaml`):

```yaml
# Reference — not necessarily a physical file in repo yet
crawl:
  max_pages: 30
  min_coverage_ratio: 0.5

brief:
  required_questions_sla: all required answered before Phase 0

llm:
  model: "claude-sonnet-4-20250514"
  token_budget_per_audit: 200000  # default в проде; free_snapshot может быть ниже

free_snapshot:
  max_issues_shown: 2
  max_quick_wins_shown: 2
```

---

## 7. Data Scope per Product Mode

### 7.1. Free Snapshot — минимальный state

Для бесплатных лидов **не отдаём клиенту** полный отчёт и **не строим** продукт как полный file-based export. В БД всё равно создаются строки `audits` / `audit_recon` / `audit_domains` для оркестрации; публичный ответ API **урезан** (например, до 2 issues и 2 quick wins). Логический минимум:

```json
{
  "meta": {"audit_id": "...", "company_url": "...", "product_mode": "free_snapshot"},
  "recon": {"company_name": "...", "industry": "...", "pages_count": 5},
  "domains": {
    "ux_conversion": { "score": 3, "summary": "...", "partial_issues": [...] }
  }
}
```

**Privacy / маркетинг:** не собирать email на snapshot, если не нужен follow-up; при добавлении email — отдельная политика и согласие.

### 7.2. Express/Full — полный state

Полные данные аудита в **Supabase**: recon, все домены, strategy, `collected_data`, события. Экспорт `action_plan.csv` и multi-profile Markdown — **roadmap продукта** (см. `GET /api/audits/:id/report`, расширение профилей).

Retention: по договору с клиентом (например, проект + 1 год) — политика хранения задаётся операционно, не только технически.

---

## 8. Report Profiles

| Profile | Content | Use case |
|---------|---------|----------|
| `full` | Все секции, все домены | Core deliverable |
| `owner` | Summary + Scorecard + Roadmap + costs | Собственник |
| `marketing` | Domains 3-5 + competitor detail | Маркетолог |
| `tech` | Domains 1-2 + code-level detail | CTO / IT |
| `onepager` | Scorecard + top-3 + next steps | Quick overview |
| `free_snapshot` | UX partial + 1 competitor mini | Lead magnet |

**Action Plan CSV:** отдельный файл с колонками
Title, Domain, Priority, Effort, Cost, Impact, Owner, Type.

---

## 9. Repository Layout (v1 — monorepo)

Реализация — **один репозиторий**, не Python-дерево из ранних черновиков:

```
GLC-agent/
├── docs/                    ← CONCEPT-upd.md, ARCHITECTURE-upd.md, ARCHITECTURE.md, …
├── server/                  ← Express + TypeScript backend
│   ├── src/
│   │   ├── agents/          ← BaseAgent, recon, domain agents, strategy
│   │   ├── collectors/    ← programmatic crawl / fetch (no LLM)
│   │   ├── config/        ← model, industry weights, env
│   │   ├── middleware/    ← requireAuth (JWT)
│   │   ├── routes/        ← REST under /api/*
│   │   ├── schemas/       ← Zod domain output contracts
│   │   ├── services/      ← pipeline.ts, context-builder, fact-checker, …
│   │   └── types/
│   └── package.json
├── src/                     ← React 18 + Vite frontend
│   └── app/
├── supabase/                ← миграции / схема (если в репо)
└── package.json             ← корневой workspace при необходимости
```

**Где что искать (шпаргалка):**

| Область | Путь |
|---------|------|
| Оркестрация фаз, review gates | `server/src/services/pipeline.ts` |
| Срез контекста для Claude | `server/src/services/context-builder.ts` |
| Fact-check / quality signals | `server/src/services/fact-checker.ts` |
| HTTP API | `server/src/routes/` |
| События пайплайна (Realtime) | `pipeline_events` в Supabase |

**Логи и отладка:** не локальный `audits/*/logs/`, а `pipeline_events` + серверные логи Railway. Сырые LLM-ответы по умолчанию не пишутся в открытый лог (privacy).

---

## 10. Roadmap — фокус go-live (v1)

Ближайший **продуктовый** приоритет — стабильный вывод к клиентам:

| Приоритет | Цель | Примечание |
|-----------|------|------------|
| **P0** | **Free UX Snapshot** | Предсказуемый SLA, урезанный публичный output, lead magnet |
| **P0** | **Express Audit** | Фазы 0–4, quality gate, отчёт для платящего клиента |
| **P1** | Полировка отчётов | Профили, `GET /api/audits/:id/report`, Action Plan CSV по мере готовности |
| **P1** | Набор реальных аудитов на Майорке | Метрики качества из §12 CONCEPT-upd |

Инженерный бэклог (уже в коде в основной части): все 8 фаз, Supabase state, parallel wings 1–4 и 5–6, Realtime UI — см. [ARCHITECTURE.md](./ARCHITECTURE.md).

**Тестирование:** unit/integration по мере расширения покрытия; приоритет — регрессия пайплайна и контрактов Zod для критичных доменов.

---

## 11. HTTP API (вместо CLI)

Пайплайн управляется **REST API** с аутентификацией (`requireAuth`). Ориентиры (полный список — `ARCHITECTURE.md`):

```http
POST   /api/audits
GET    /api/audits
GET    /api/audits/:id
DELETE /api/audits/:id
POST   /api/audits/:id/pipeline/start
POST   /api/audits/:id/pipeline/next
GET    /api/audits/:id/pipeline/status
POST   /api/audits/:id/reviews/:phase
GET    /api/audits/:id/report
```

Перезапуск / продолжение фазы — через `pipeline/next` и статус аудита, а не через `run_agent.py`.

---

## 12. v2+ заметки и Python go/no-go

### 12.1. Уже не «будущее v1», а текущая база

- **Параллельное выполнение** доменных фаз (крылья 1–4 и 5–6) — **уже в v1** (см. §2).
- **Хранение state** — **PostgreSQL / Supabase**, не единый `audit_state.json` на диске (логический JSON-контракт остаётся полезной моделью — §3).
- **Web UI** — React-приложение для портфолио, пайплайна и workspace аудита.

### 12.2. Что осознанно откладываем в v2+

- **Multilingual reports:** ES/CA/DE и флаги `report_lang_primary` / `report_lang_summary` в конфиге отчёта.
- **Шаблоны отчётов:** отдельные шаблонизаторы или генераторы под профили.
- **Industry modules:** Hotel / Real Estate / Restaurant как расширяемые пакеты контекста.
- **Опционально — n8n / внешняя оркестрация:** только если появится сильная операционная потребность; **TS-оркестрация остаётся source of truth** до явного ADR.

### 12.3. Выделение Python-микросервиса — go/no-go (минимум **3 из 4**)

Отдельный **internal** Python-сервис (crawl/feature extraction/OCR/NLP/ML) вводится только если одновременно выполняются **не меньше трёх** условий:

1. Новая **core-ценность** продукта реально зависит от Python-native tooling (тяжёлый crawl, OCR, NLP/ML, специализированные security-данные и т.п.).
2. **> 50%** новой продуктовой логики естественно пишется на Python-библиотеках, а не на TS.
3. **Команда и hiring** смещаются к Python как основному языку бэкенда для этой области.
4. Есть **измеримый** проигрыш текущего TS-подхода по скорости разработки, качеству результата или стоимости сопровождения.

**Если go:** не мигрировать монолит — узкий **versioned JSON API**, idempotent jobs, **Express/TS остаётся оркестратором**.
