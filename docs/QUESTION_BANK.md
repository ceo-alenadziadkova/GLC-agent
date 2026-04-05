# GLC Audit — Question Bank & Intake Logic

> Полная спецификация вопросов, ветвления и маппинга на доменных агентов.
> Заменяет плоский список из 25 вопросов.

---

## 1. Диагноз текущих вопросов

**Что не так:**

| Проблема | Пример | Последствие |
|----------|--------|-------------|
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

---

## 2. Архитектура вопросов

### 2.1. Три контекста сбора

| Контекст | Кто заполняет | Сколько | Что получает |
|----------|---------------|---------|--------------|
| **Pre-brief** (ссылка перед встречей) | Клиент | 5-7 вопросов, 5 мин | Alena приходит подготовленной |
| **Full intake** (wizard/interview) | Клиент или Alena | 25-35 вопросов, 30-40 мин | Полный аудит |

В приложении режим **«All sections»** (классическая форма) и **пошаговый wizard** используют **один и тот же** набор видимых id банка (`filterVisibleQuestions` + merge legacy→bank); отличается только подача — все секции сразу или один вопрос на шаг. См. `getVisibleBankBriefSections` / `BankClassicBriefFields` в коде и [FRONTEND.md](./FRONTEND.md).
| **Discovery** (Mode C, нет сайта) | Клиент + Alena | **16** вопросов (банк), ~15 мин | Понимание бизнеса → конвертация в full |

### 2.2. Секции (клиент видит)

Вопросы организованы по 6 секциям — **для клиента**, не по нашим доменам:

| # | Секция | Внутреннее название | Кормит домены |
|---|--------|---------------------|---------------|
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
|------|--------|-------------- |
| `has_website` | "Do you have a website?" | Нет → секция C переключается на light mode, site-questions скрыты |
| `industry` | "Which industry?" | Появляются 2-4 отраслевых вопроса в секциях B, C, D |
| `team_size` | "How big is your team?" | Solo → процессные вопросы упрощаются; 50+ → появляются вопросы о документации |
| `has_crm` | Ответ в tools_daily | Да → "Какой CRM?"; Нет → "Как отслеживаете клиентов?" |
| `handles_payments` / `a6` | Ранний ответ в секции A (или уточнение в E) | Да → раньше включаем PCI/GDPR-контекст и полный блок E; Нет → E остаётся видимым для EU/GDPR, детали про платежи можно сжать |
| `website_maturity` *(сигнал, не predicate)* | `c9` (возраст сайта) | Попадает в **context slice** tech/strategy через §5; **не** ключ в `BRANCH_RULES` — видимость вопросов не переключается отдельным gate |
| `automation_attempt` *(сигнал, не predicate)* | `d_automation_attempt` | Ответ уходит в **automation_processes** (§5); в `question-bank.v1.json` у вопроса **нет** `branch` — это не условие `evalBranchCondition` |

**Реализация веток:** канон — `server/src/intake/branch-rules.ts` (`BRANCH_RULES`, `evalBranchCondition`). Неизвестный `branchCondition` в JSON → в лог пишется предупреждение `[branch-rules] Unknown branchCondition`, вопрос по умолчанию **показывается** (fail-open).

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

**Markdown не является каноном для того, какой ответ какому агенту попадает.** Единственный источник истины — объект **`QUESTION_FEED_ROLES`** в [`server/src/intake/question-feed-roles.ts`](../server/src/intake/question-feed-roles.ts) (от него строятся `DOMAIN_TO_QUESTIONS_RAW` → `DOMAIN_TO_QUESTION_IDS` и контекст в `ContextBuilder`).

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
| | Options: Launching / Growing fast / Stabilising / Scaling / Mature & optimising | | | | | |
| | *Зачем:* тон рекомендаций и приоритет «quick wins vs. foundation» сильно меняется между «запускаемся» и «оптимизируем зрелый процесс». | | | | | |
| `a8` | Approximately how many **customers or orders** do you serve in a typical month? | select | Recommended | 2 | strategy (P), automation_processes (P); ux_conversion (S), marketing_utp (S) | — |
| | Options: < 50 / 50–200 / 200–1,000 / 1,000+ / Not sure | | | | | |
| | *Helper:* «A rough range is enough — this helps us see where digital or automation improvements could have the **biggest impact** (value at scale).» | | | | | |

**8 вопросов в универсальном ядре A (7 в Layer 1 / pre+disc, `a8` — Layer 2). ~4–5 минут с учётом Layer 2. Gate: industry, team_size, has_website, handles_payments, business_stage.**

---

### Section B: Your Customers & Growth

*"Understanding your customers helps us evaluate whether your marketing and messaging are hitting the mark."*

| ID | Question | Input | Priority | Layer | Agent feeds (P / S) | Branch |
|----|----------|-------|----------|-------|-------|--------|
| `b1` | Who is your ideal customer? | textarea | Required | 1, pre | ux_conversion (P), marketing_utp (P) | — |
| | *Helper:* «Think about **who you create the most value for today**: who they are, where they come from, and what problem or job they solve with you.» | | | | | |
| | *Example: "European couples aged 30–55 looking for an authentic boutique experience"* | | | | | |
| `b2` | How do most of your new customers find you? | multi | Required | 1, disc | marketing_utp (P), seo_digital (P); strategy (S), automation_processes (S) | — |
| | Options: Google / Social media / OTA/marketplace (Booking, Airbnb, Idealista…) / Word of mouth / Paid ads / Email / Partnerships / Offline (walk-ins, events) / Other → text | | | | | |
| | *Framing (acquisition pain):* подсказка микротекста — «Where growth feels stuck or expensive helps us judge positioning vs. channels.» | | | | | |
| `b3` | What is the **main promise or value** for your best customers compared to competitors? | textarea | Required | 1, pre | marketing_utp (P) | — |
| | *Helper (b3):* в UI — короткие паттерны (price, speed/service, unique experience/location); клиент может выбрать паттерн + одно предложение своими словами. Язык **ценности для клиента**, не «нас отличает цена». | | | | | |
| | *Example: "Historic building with a rooftop restaurant and best-price guarantee"* | | | | | |
| `b4` | How would you describe your pricing compared to competitors? | select | Recommended | 2 | marketing_utp (P), strategy (P) | — |
| | Options: Lower than average / About the same / Higher, premium positioning / Hard to compare | | | | | |
| `b5` | Is your business seasonal? | select | Recommended | 2 | marketing_utp (P), strategy (P) | — |
| | Options: Yes, very (summer peak) / Yes, slightly / No, steady all year / Not sure | | | | | |
| `b6` | Do you offer any guarantees to customers? | multi | Recommended | 2 | marketing_utp (P), ux_conversion (P) | — |
| | Options: Money-back / Best price guarantee / Free cancellation / Satisfaction guarantee / None / Other → text | | | | | |
| `b7` | Is your revenue mostly **repeat / recurring customers**, or **mostly one-off** transactions? | select | Recommended | 2 | marketing_utp (P), ux_conversion (P), strategy (P) | — |
| | Options: Mostly repeat / Mix of both / Mostly one-off / Not sure | | | | | |
| | *Зачем:* retention-воронка, LTV и автоматизация (напоминания, CRM, подписки) принципиально отличаются от чистого acquisition; без этого агенты ошибают приоритет. | | | | | |

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
| | *We'll use them for benchmarking — not shared in your report.* | | | | | |
| `c9` | Roughly how long has your current live website been in production? | select | Recommended | 1 | tech_infrastructure (P) | has_website |
| | Options: Under 6 months / 6 months – 2 years / 2–5 years / 5+ years / Not sure | | | | | |
| `c1` | *Auto-prefill:* "We detected [WordPress + Cloudflare + Cloudbeds]. Is this correct?" | confirm | Recommended | 2 | tech_infrastructure (P) | has_website |
| | Options: Yes, correct / Not quite (→ text) / I don't know | | | | | |
| | *Контракт `ReconConflict`: если клиент выбирает «Not quite» или значение расходится с реконом — фиксируем запись в `reconConflicts[]` (см. §11).* | | | | | |
| `c2` | Who maintains your website? | select | Recommended | 2 | tech_infrastructure (P) | has_website |
| | Options: Me / someone in-house / Freelancer / Agency / No one regularly / Don't know | | | | | |
| `c3` | Do you have Google Analytics or another analytics tool installed? | select | Required | 2 | seo_digital (P) | has_website |
| | Options: Yes, GA4 / Yes, another tool / I think so, but I don't check it / No / Don't know | | | | | |
| `c4` | Is Google Search Console set up? | select | Nice-to-have | 2 | seo_digital (P) | has_website |
| | Options: Yes / No / What's that? | | | | | |
| `c7` | Where are you active on social media? | multi | Recommended | 2 | marketing_utp (P), seo_digital (P) | — |
| | Options: Instagram / Facebook / TikTok / LinkedIn / YouTube / Google Business / TripAdvisor / None / Other → text | | | | | |

**Light mode** (has_website = No / Under construction):

| ID | Question | Input | Priority | Layer | Agent feeds (P / S) | Branch |
|----|----------|-------|----------|-------|-------|--------|
| `c_nosite_1` | Where are you visible online today? | multi | Recommended | 2 | seo_digital (P) | !has_website |
| | Options: Full website (multi-page) / Single landing page / Website in development / Social media / Marketplaces or other online platforms / Mostly offline or referrals — **multi-select**, aligned with public `/discovery` (`discovery-flow.ts`). | | | | | |
| `c_nosite_2` | Anything else about your online presence? | textarea | Optional | 2 | seo_digital (P); strategy (S) | !has_website |
| | Free text; optional context (forums, app, launch, links). | | | | | |
| `c_nosite_3` | Which social or messaging channels do you use for the business? | multi | Recommended | 2 | seo_digital (P) | `nosite_social` |
| | Options: Instagram, Facebook, LinkedIn, TikTok, YouTube, X, Telegram, WhatsApp Business — **only if** `c_nosite_1` includes the exact option **Social media** (see `BRANCH_RULES.nosite_social`). | | | | | |

---

### Section D: Your Daily Operations

*"The more we understand how your team works day-to-day, the better we can spot where time and money are being wasted."*

**Структурная заметка (перегрузка):** после `d_automation_attempt`, AI readiness и **`d6`** (типы данных) секция плотная; `d6` и **`a8`** — осознанно Layer 2, мягкие диапазоны, без «финансовой исповеди».

| ID | Question | Input | Priority | Layer | Agent feeds (P / S) | Branch |
|----|----------|-------|----------|-------|-------|--------|
| `d1` | Which tools does your team use every day? | multi | Required | 1, disc | automation_processes (P), tech_infrastructure (P); strategy (S), seo_digital (S) | — |
| | Options: WhatsApp / Email (Gmail, Outlook) / Google Sheets or Excel / CRM (→ branch d1a) / Accounting software / Project management tool / Industry-specific software (PMS, POS, etc.) / Nothing specific | | | | | |
| `d1a` | Which CRM do you use? | select | Recommended | 2 | automation_processes (P) | d1 includes "CRM" |
| | Options: HubSpot / Pipedrive / Salesforce / Zoho / Monday / Notion / Other → text | | | | | |
| `d1b` | How do you keep track of clients and leads? | select | Recommended | 2 | automation_processes (P) | d1 does NOT include "CRM" |
| | Options: Spreadsheet / Email inbox / Notebook / WhatsApp chats / I don't really / Other → text | | | | | |
| `d2` | What is the **single manual task** that consumes the most time for you or your team? | textarea | Required | 1, disc | automation_processes (P); ux_conversion (S), marketing_utp (S) | — |
| | *Helper (value framing):* «Think about work that **doesn’t create direct value for customers** but still eats hours every week.» | | | | | |
| | *Examples:* «Copying inquiries from WhatsApp or email into a spreadsheet», «Manually issuing invoices», «Answering the same questions every day across chat and social media», «Re-typing bookings into another system». | | | | | |
| `d_automation_attempt` | Have you already tried to automate or streamline that work (tool, Zapier/Make, freelancer, agency)? | select | Recommended | 1, disc | automation_processes (P) | — |
| | Options: Yes, it helped / Tried, abandoned / Not yet / Not sure | | | | | |
| `d3` | Roughly how many hours per week does your team spend on repetitive manual tasks? | select | Recommended | 2 | automation_processes (P) | — |
| | Options: Less than 5h / 5–10h / 10–20h / 20–40h / 40h+ / No idea | | | | | |
| `d4` | If you had to explain your **main service or delivery process** to a new hire today — where would you send them **first**? | select | Recommended | 2 | automation_processes (P) | team_size > Solo |
| | Options: Written playbook / SOP doc / Internal wiki / Loom or recorded video / I'd walk them through it live / WhatsApp or chat history / We'd figure it out together / Not applicable (solo) | | | | | |
| | *Поведенческий срез вместо «насколько у вас документация»: совпадающие самооценкой ответы больше не склеивают «мы всё задокументировали» и «реально есть источник правды».* | | | | | |
| `d4a` | Do you already use AI tools in everyday work (ChatGPT, copilots, meeting notes, translation)? | select | Recommended | **2** | automation_processes (P), strategy (P) | — |
| | Options: Daily / Occasionally / Tried, stopped / No / Prefer not to say | | | | | |
| | *Только Deep Intake (Layer 2), не Quick.* | | | | | |
| `d4b` | Can you export key customer or ops data cleanly — e.g. bookings, clients, inventory — to a **spreadsheet or CSV** without losing half a day? | select | Recommended | **2** | automation_processes (P), strategy (P) | — |
| | Options: Yes, usually quick / Sometimes / Rarely — it's painful / No / Don't know | | | | | |
| | **Helper text (обязательно в UI):** *«Example: exporting last month's reservations or a full client list — could you do it in minutes, or would it mean chasing someone or manual copy-paste?»* | | | | | |
| `d6` | Which **types of data** do you work with most often? | multi | Recommended | 2 | automation_processes (P), strategy (P) | — |
| | Options: Bookings / transactions / Deals or orders / Contacts & leads / Inventory or stock / Finance & invoices / HR & shifts / Other → text | | | | | |
| | *Helper:* «Rough picture is enough — this helps **automation** and **strategy** prioritise which processes to tackle first.» | | | | | |
| `d5` | Do you use automated email sequences? (welcome, follow-up, reminders) | select | Recommended | 2 | automation_processes (P) | — |
| | Options: Yes, actively / We set something up but it's not maintained / No / What's that? | | | | | |

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
| `e2` | Does your business operate in the EU or serve EU customers? | select | Recommended | 2 | security_compliance (P) | — |
| | Options: Yes / No / Not sure | | | | | |
| `e3` | How confident are you that your GDPR setup is complete? (cookie banner, privacy policy, consent) | select | Recommended | 2 | security_compliance (P) | — |
| | Options: Very confident / Something's there, not sure if complete / Probably not / Haven't thought about it | | | | | |
| | *Раскрытие ограничено:* это **самооценка** клиента; реальную картину дают Recon + Security agent. Вопрос нужен для **приоритизации тона** в отчёте и triage, не как истина. | | | | | |
| `e4` | Are you using or planning to use e-invoicing / Verifactu? | select | Nice-to-have | 2 | security_compliance (P) | location contains "Spain" |
| | Options: Already using / Planning to / Not yet / What's that? | | | | | |

---

### Section F: Your Goals for This Audit

*"Last step — help us focus on what matters most to YOU."*

| ID | Question | Input | Priority | Layer | Agent feeds (P / S) | Branch |
|----|----------|-------|----------|-------|-------|--------|
| `f1` | What is the **single most important business problem** you want this audit to help you **solve**? | textarea | Required | 1, pre, disc | strategy (P) | — |
| | *Helper:* «For example: “Too much manual work eating our time”, “Not enough direct bookings vs OTAs”, “We don’t know which channels bring **profitable** clients”, “Our digital setup feels chaotic and we’re not sure where to start”.» | | | | | |
| `f2` | Which areas are you most interested in **improving** with this audit? | multi | Required | 1, pre | strategy (P) | — |
| | Options: **Website performance & technology** (speed, stability, technical health) / **Online visibility & SEO** (finding and attracting the right traffic) / **Customer experience & conversions** (turning visitors into customers) / **Marketing & positioning** (clarity of message and differentiation) / **Process automation & efficiency** (less manual work and handoffs) / **Security, compliance & risk** (avoiding costly surprises) | | | | | |
| `f3` | How do you rate your current digital setup overall? | rating 1–5 | Recommended | 1 | strategy (P); marketing_utp (S), ux_conversion (S), automation_processes (S) | — |
| | 1 = "Struggling" … 3 = "Okay-ish" … 5 = "We're nailing it" | | | | | |
| | *Важно для тона отчёта:* 2/5 и 4/5 — разная эмоциональная и директивная подача рекомендаций. | | | | | |
| | *Follow-up (wizard, следом после f3):* «Who else decides on **digital or marketing** changes?» — free text или multi (owner / partner / ops / agency). Пока это **не отдельный id банка**, в срезы агентов не попадает; при добавлении вопроса — завести строку в `QUESTION_FEED_ROLES`. | | | | | |
| `f4` | How **ready** are you to implement changes based on this audit? | select | Recommended | 2 | strategy (P) | — |
| | Options: Ready to move quickly on clear **quick wins** / Ready to invest if **ROI and impact** are clear / Prefer to **understand the situation** for now / Need to **align first** with partner, owner, or team | | | | | |
| | *Helper:* «This doesn’t lock you into anything. It helps us balance **quick wins** versus **deeper change** in systems and processes in your report.» | | | | | |
| `f5` | What approximate **budget range** do you have in mind for improvements over the **next 3–12 months**? | select | Nice-to-have | 2 | strategy (P) | — |
| | Options: Under €500 / €500–2,000 / €2,000–10,000 / Over €10,000 / **No clear budget yet** — depends on the recommendations | | | | | |
| | *Helper:* «We use this as a **guideline** to match recommendations to your **level of ambition** — from low-cost quick wins to larger changes.» | | | | | |
| `f6` | Anything you specifically do NOT want us to recommend? | textarea | Nice-to-have | 2 | strategy (P) | — |
| | *Example: "No more SaaS subscriptions", "Don't touch the current CMS"* | | | | | |
| `f7` | Who would **approve a new automation or AI tool** if we recommended one? | select | Recommended | 1, 2 | strategy (P), automation_processes (P) | — |
| | Options: Me / Ops or office manager / IT provider or agency / Owner or partner / Board or investor / Not sure | | | | | |
| | *Перенесён из Section D (`d4c`). В мастере показывать **сразу после** f3 + follow-up на маркетинг/цифру.* | | | | | |
| `f8` | Is there a **deadline or key moment** driving this audit? | select | Recommended | 1, 2 | strategy (P) | — |
| | Options: Opening or launch soon / Seasonal peak coming / Investor, partner, or board review / Contract or compliance milestone / No specific deadline | | | | | |
| | *Urgency:* «открываемся через 2 месяца» vs «без срочности» меняет последовательность рекомендаций. | | | | | |

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

Оставьте в этом слое в том числе **`a8`** (объём клиентов/заказов в месяц), **`d6`** (типы данных), расширенные B/C/D/E/F, отраслевые ветки.
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
|-------|-----|-------|
| **Identity** | a1, a2, a3, a4, a6, a7, a8, a9 | Who, where, stage, scale, languages |
| **Customers** | b1, b2, b3, b7, b_growth_attempts + [industry B] | ICP, acquisition channels, growth history |
| **Digital trace** | c_nosite_1, c_nosite_4, c_nosite_5, c_nosite_reviews, c_nosite_2, c_nosite_3 | Online presence without a site |
| **Conversion pipeline** | d1, d1a/d1b, d_response_time, d_closing_flow, d_billing_flow | Inquiry → payment funnel |
| **Operations & Automation** | d2, d_automation_attempt, d4a, d4b, d6, d5 + [industry D] | Manual bottlenecks, AI/automation readiness |
| **Goals** | f1, f2, f7, f8, f4 | Problem to solve, focus areas, readiness, urgency |

#### Full ID Set (38 IDs)

```
Section A (8):  a1, a2, a3, a4, a6, a7, a8, a9
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
Section D (12 universal + up to 2 industry-specific):
  d1, d1a (has_crm), d1b (no_crm)
  d_response_time, d_closing_flow, d_billing_flow
  d2, d_automation_attempt, d4a, d4b, d6, d5
  d_hotel_1, d_hotel_2 (is_hospitality)
  d_realestate_1 (is_real_estate)
  d_restaurant_1 (is_restaurant)
Section F (5):  f1, f2, f7, f8, f4
```

**Intentionally excluded:**
- `a5` — already answered (triggers discovery mode)
- `d3` — clients reliably underestimate hours on repetitive work; low signal quality in self-serve context. Kept in bank for full-intake consultant mode.
- `d4` — `not_solo` branch gates this correctly; solo clients (~60% of discovery) do not see it
- `e1`/`e2`/`e3` — compliance depth adds friction without changing discovery recommendations

**Branch fix — `c7`:** Added `"branch": "has_website"` to prevent no-website clients from seeing both `c7` (generic social presence) and `c_nosite_3` (richer version with Google Business, TripAdvisor). `c_nosite_3` is the correct question for this path.

**Tech debt:** Two parallel discovery systems exist in the codebase:
1. `server/src/intake/discovery.ts` — bank-integrated, used by `IntakeBankWizard` (this spec)
2. `src/app/lib/discovery-flow.ts` — standalone legacy system with own question set, maturity scoring, and findings format

The legacy system (`discovery-flow.ts`) pre-dates bank v1 integration and is not covered by this spec. It should be evaluated for removal or migration in a future sprint.

**Discovery outro (copy):** *"Thank you — we already have a clear operational picture. Next step: a short call to align on audit depth and access. Our report leans on your processes just as heavily as on your online presence."*

---

## 5. Domain Agent ← Question Mapping

**Не правьте эту таблицу как первичный источник.** Сначала меняйте **`QUESTION_FEED_ROLES`** в [`question-feed-roles.ts`](../server/src/intake/question-feed-roles.ts), затем обновляйте списки здесь и колонку **Agent feeds (P / S)** в §3. Иначе документация снова разойдётся с рантаймом.

Ниже: какой агент какие ответы получает (context slice). Состав строки = **primary ∪ secondary**; в промпте роль **P/S** не дублируется построчно — см. §3. Порядок id внутри домена — порядок банка (`DOMAIN_TO_QUESTION_IDS`).

| Agent | Questions used (IDs) |
|-------|----------------------|
| **recon** | a1, a2, a3, a4, a5, a6, a7 (+ auto-crawl) |
| **tech_infrastructure** | a5, c9, c1, c2, c6, d1 (tools → tech signals), d_hotel_1, d_restaurant_1 |
| **security_compliance** | a6 (gate), e1, e2, e3, e4, **d_billing_flow** (Verifactu signal) |
| **seo_digital** | c3, c4, c7, c_nosite_1, c_nosite_2, c_nosite_3, **c_nosite_5** (Google Business), **c_nosite_reviews** (reputation), b2 (traffic sources) |
| **ux_conversion** | b1 (ideal customer), b6 (guarantees), b7 (repeat vs one-off), c5 (main action), c6 (frustrations), b_services_1, b_health_1, **d_response_time**, **d_closing_flow** |
| **marketing_utp** | **a9** (customer languages), b1, b2, b3, b4, b5, b6, b7, **b_growth_attempts**, c7, c8 (competitors), **c_nosite_4**, **c_nosite_5**, **c_nosite_reviews**, b_hotel_1, b_hotel_2, b_realestate_1, b_marine_1 |
| **automation_processes** | **a9**, d1, d1a/d1b, **d_response_time**, **d_closing_flow**, **d_billing_flow**, d2, d_automation_attempt, d3, d4, d4a, d4b, **d6** (data types), d5, **a8** (monthly volume), f7 (approver), **c_nosite_4**, d_hotel_1, d_hotel_2, d_realestate_1, d_restaurant_1 |
| **strategy** | f1, f2, f3, f4, f5, f6, f7, f8 (urgency), a4, a7, **a8** (scale), b4, b5, b7, **b_growth_attempts**, d4a, d4b, **d6** |

**Правило:** агент получает только свои вопросы (context slicing), не весь бриф. Цепочка в коде: `QUESTION_FEED_ROLES` → `DOMAIN_TO_QUESTIONS_RAW` (реэкспорт в `domain-slice-data.ts`) → `DOMAIN_TO_QUESTION_IDS` в `question-bank.ts`.

---

## 6. Branching Logic (implementation)

Каноническая реализация: **`server/src/intake/branch-rules.ts`** — `BRANCH_RULES`, нормализация `a5`/`a6`/`a4`/`a2`, `evalBranchCondition`. Вызов видимости: `server/src/intake/is-visible.ts`.

- Ключи в `branch` / `branchCondition` JSON **должны** совпадать с ключами `BRANCH_RULES`. Неизвестный ключ → `console.warn` с префиксом `[branch-rules] Unknown branchCondition`, вопрос считается **видимым** (fail-open).
- Ниже — краткая шпаргалка по ключам (без дословного кода; детали смотри в репозитории).

| Key | Назначение |
|-----|------------|
| `has_website` / `no_website` | Ворота по ответу «сайт» (`a5`, нормализация в enum gate) |
| `nosite_social` | `no_website` и в `c_nosite_1` выбран пункт **Social media** (точное совпадение строки) |
| `is_hospitality`, `is_real_estate`, `is_restaurant`, `is_services`, `is_healthcare`, `is_marine` | Отраслевые ветки (ярлык индустрии мапится из dropdown через `INDUSTRY_LABEL_TO_BRANCH_SLUG`) |
| `has_crm` / `no_crm` | Наличие CRM в мультивыборе `d1` (в т.ч. синтетические значения при merge из legacy) |
| `handles_payments` | Нормализованный `a6`: yes / sometimes / rarely |
| `not_solo` | Команда ≠ solo (`a4`) |
| `spain_based` | Локация (`a3`) |

**UX:** скрытые вопросы не показываются. Клиент не знает, что вопрос существует. Wizard адаптируется динамически.

**Other → specify (банковский мастер и legacy):** при выборе вариантов, требующих уточнения (`Other`, «Yes, other tool» / «Yes, another tool», «Something else» — см. `CHOICE_OPTION_LABELS_REQUIRING_SPECIFY` в `src/app/lib/choice-specify-triggers.ts`), показывается поле; значение пишется в **`${questionId}__other`**, для **`a2`** / **`intake_industry`** — в **`intake_industry_specify`**. Discovery: **`${bankId}__other`**, для **`a2`** при конвертации дублируется в **`intake_industry_specify`**. См. `BriefField`, `IntakeBankWizard`, `DiscoverPage`.

---

## 7. UX Copy & Framing

### Section openers (микротексты)

| Section | Opener | Why it works |
|---------|--------|--------------|
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

**Идея шкалы 0–100 (implementation):**

- База: положительные ответы по **d4b** и ясный **f7** (или совпадение f7 с decision-follow-up после f3).
- Штрафы: **d4a = No** при высокой ручной нагрузке (**d3** в верхних корзинах); «размытый» ответ **d4** (только устно / WhatsApp) при команде > solo.
- Бонус: **d_automation_attempt = helped** без противоречий с **d2**.

Карта в агентов:

- **automation_processes** — полный срез d\* и auto-attempt.
- **strategy** — интерпретация рисков внедрения и последовательности пилотов.
- **marketing_utp** / **ux_conversion** — только если ответы пересекаются с GTM/контентом (например AI в контенте — через свободный текст в Layer 2 при необходимости).

Точная формула и веса фиксируются в `calcAiReadinessScore()` рядом с `calcDataQualityScore()` (план: `server/src/intake/engine.ts`).

---

## 9. Total Count Summary

| Category | Universal | Hospitality | Real Estate | Restaurant | Services | Healthcare | Marine |
|----------|-----------|-------------|-------------|------------|----------|------------|--------|
| Section A | 8 | — | — | — | — | — | — |
| Section B | 7 | +2 | +1 | +1 | +1 | +1 | +1 |
| Section C (site) | 10 | — | — | — | — | — | — |
| Section C (no site) | 3 | — | — | — | — | — | — |
| Section D | 11 | +2 | +1 | +1 | — | — | — |
| Section E | 4 | — | — | — | — | — | — |
| Section F | 8 | — | — | — | — | — | — |
| **Total (with site)** | **46+** | **+4** | **+2** | **+2** | **+1** | **+1** | **+1** |
| **Total (no site)** | **41+** | **+4** | **+2** | **+2** | **+1** | **+1** | **+1** |

*После переноса `d4c` → `f7` в D на один id меньше (`f7` считается в F), но операционный блок всё ещё плотный — см. заметку перегрузки в Section D.*

Из-за branching типичный клиент видит **27–36 вопросов**, не все строки таблицы.
Pre-brief: **9**. Quick Intake: **~18–21** (зависит от f7/f8 и сайта). Deep Intake: +12–22. Discovery (Mode C): **16** id — полный список в §4 (`DISCOVERY_BANK_IDS`), включает **a5**, **a6**, **a7**, **f8**, **f1** и no-site поля **c_nosite_1**, **c_nosite_2**, **c_nosite_3**.

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

- «Visible» = `isVisible(id, responses)` с учётом веток (`has_website`, industry, …).
- Пустые / whitespace-only значения не считаются answered.
- Веса можно калибровать по режиму продукта (`express` снижает долю optional).

---

## 11. Recon prefill & conflicts

При подтверждении **c1** или других рекон-полей:

```typescript
interface ReconConflict {
  questionId: string;           // e.g. "c1"
  detectedValue: string;        // from recon collector
  clientValue: string;          // free text or structured override
  status: 'open' | 'resolved';
  resolvedAt?: string;          // ISO
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
  id: string;                          // e.g. "a1", "b_hotel_1"
  section: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  priority: Priority;
  inputType: InputType;
  layers: Layer[];                     // which layers include this question
  label: string;                       // question text
  helperText?: string;                 // example / hint
  options?: { value: string; label: string }[];
  allowOther?: boolean;                // adds "Other → text" option
  allowUnknown?: boolean;              // adds "Don't know" option
  branchCondition?: string;            // key in BRANCH_RULES
  feedsDomains: string[];              // which agents use this answer
}

interface IntakeResponse {
  value: string | string[] | number | boolean | null;
  source: 'client' | 'consultant' | 'recon_confirmed' | 'unknown';
  answeredAt?: string;                 // ISO timestamp
}

interface IntakeBrief {
  status: 'pre_brief' | 'layer_1' | 'layer_2' | 'complete';
  collectedBy: 'client' | 'consultant' | 'mixed';
  collectionMode: 'self_serve' | 'interview' | 'discovery';
  dataQualityScore: number;            // 0.0 – 1.0 (см. §10)
  aiReadinessScore?: number;           // 0 – 100 (см. §8)
  responses: Record<string, IntakeResponse>;
  reconPrefills: Record<string, { detected: string; confirmedByClient: boolean | null }>;
  reconConflicts?: ReconConflict[];
  postAuditQuestions: PostAuditQuestionItem[];
}
```

---

## 14. Что убрано из текущего набора и почему

| Текущий вопрос | Решение | Причина |
|----------------|---------|---------|
| `monthly_visitors` | Убран | Клиент редко знает точно; GA/Recon покроет если есть доступ |
| `monthly_revenue` | Убран | Слишком личный для первого контакта; нерелевантен для tech-аудита |
| `conversion_rate` | Убран | Почти никто не знает; агент сам определит по данным |
| `top_keywords` | Убран | Агент сам найдёт через Recon/SERP; клиент обычно не знает |
| `hosting_provider` | Заменён на c1 (confirm Recon) | Recon сам определит; клиенту проще подтвердить |
| `has_staging` | Убран | Слишком техничный; релевантен только для 10% клиентов |
| `has_privacy_policy` | Убран из вопросов | Recon сам проверит наличие; это задача Security Agent |
| `email_automation` | Стал d5 (проще) | Был слишком технический; теперь select с human-friendly опциями |

**Добавлено:** отраслевые вопросы (10+), value-first формулировки целей (**f1–f2**, **b3**, helpers), стадия бизнеса (**a7**), ранний платёжный gate (**a6**), масштаб без финансовой детали (**a8**), типы данных (**d6**), руководство по тону (**§2.4**), self-rating (f3), frustrations (c6), guarantees (b6), no-site path, branching по CRM.
