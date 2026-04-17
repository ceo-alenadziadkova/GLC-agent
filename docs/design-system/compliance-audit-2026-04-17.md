# Отчёт аудита соответствия дизайн-системе (strict, без рекомендаций)

**Дата снимка:** 2026-04-17 (согласовано с шапкой [violations-export.md](./violations-export.md) после `pnpm run audit:ds:export-violations` и с [inventory-dump.md](./inventory-dump.md) после `pnpm run audit:ds:inventory-dump`).

**SSOT:** [current.md](./current.md) §1–§10.  
**Первичные машинные источники (no allowlist):** [violations-export.md](./violations-export.md), [compliance-findings.full.txt](./compliance-findings.full.txt) (дедуп: см. Summary в `violations-export.md`; после волны SAFE — преимущественно `unit-literal` в app scope; перегенерировать после миграций).  
**Контекст внедрения/политики:** [roadmap-notes.md](./roadmap-notes.md), allowlist: [scripts/design-system-baseline.allowlist.txt](../../scripts/design-system-baseline.allowlist.txt).  
**Скрипты правил:** [scripts/design-system-raw-values-check.mjs](../../scripts/design-system-raw-values-check.mjs) (`unit-literal`, `hex-color`, `rgb-color` в app scope), [scripts/design-system-enforcement-check.mjs](../../scripts/design-system-enforcement-check.mjs) (`inline-visual-style`, `config-token-like-raw`, `utility-visual-style`; в текущем снимке экспорта в merged-типах доминируют два класса ниже).

**Ограничение охвата:** автоматический аудит не претендует на полный перечень ARIA/ролей по всему приложению; раздел 7 фиксирует только то, что следует из SSOT и из типов находок.

---

## 1. HARD VIOLATIONS (CRITICAL)

### 1.1 Hardcoded values вместо токенов (агрегат)

Сводка по [violations-export.md](./violations-export.md) (merged raw + enforcement, allowlist отключён):

| Тип | Количество | Смысл (как определено скриптами) |
| --- | ---: | --- |
| `unit-literal` | *см. violations-export* | Литералы `px` / `rem` / `em` в целевых TS/TSX (app scope raw-values); после миграции инлайнов — основной остаток дрифта |
| `inline-visual-style` | 0 | *(в актуальном снимке enforcement app — нет строк в merged-выгрузке)* |
| `rgb-color` | 0 | *(в текущем снимке app-scope — нет строк в merged-выгрузке)* |
| `hex-color` | 0 | *(в текущем снимке app-scope — нет строк в merged-выгрузке)* |
| **Итого дедуп** | *см. violations-export* | Один файл [compliance-findings.full.txt](./compliance-findings.full.txt) |

Точные счётчики и сырые строки до дедупа: таблица Summary в [violations-export.md](./violations-export.md) (регенерация: `pnpm run audit:ds:export-violations`).

**Формат детализации:** каждая строка — точная трассировка (файл, строка, значение/фрагмент строки). Литералы `rgb`/`hex` в целевых app-деревьях в этом снимке не попали в merged-типы `hex-color` / `rgb-color`; репозиторий в целом по-прежнему содержит hex/rgb в CSS/прочих путях — см. [inventory-dump.md](./inventory-dump.md) и §2.6 [current.md](./current.md). Историческая выборка: [token-replacement-matrix.md](./token-replacement-matrix.md).

Колонку «Expected token» **не заполняю**: это было бы нормативным исправлением; SSOT задаёт канон в [src/styles/tokens.css](../../src/styles/tokens.css), а литералы — факт отклонения.

### 1.2 Дублирование значений по слоям (факт)

- **CSS:** [src/styles/tokens.css](../../src/styles/tokens.css) — канон переменных (зафиксировано в [roadmap-notes.md](./roadmap-notes.md)).
- **TS-фасад:** [src/design-system/tokens/](../../src/design-system/tokens/index.ts) отражает `var(--…)` (SSOT §1.8, §10.2).
- **Повтор тех же величин вне токенов:** в актуальном no-allowlist снимке остаются преимущественно `unit-literal` и `inline-visual-style`; цветовые литералы в TS/TSX целевых путях в классах `hex-color` / `rgb-color` не эмитятся. Полный перечень совпадений по значению не автоматизирован в отчёте; машинный список значений — [inventory-dump.md](./inventory-dump.md) (литералы) против имён `--*`.

### 1.3 Обход темы / семантики

- **Инлайн-визуал:** при появлении в снимке — обход слоя «токены + классы» (правила: [design-system-enforcement-check.mjs](../../scripts/design-system-enforcement-check.mjs), `INLINE_STYLE_VISUAL_KEYS`). Волна SAFE свела merged `inline-visual-style` к нулю; дальнейший контроль — через `audit:ds:export-violations`.
- **Литеральные RGBA в app-scope находках:** в текущем [compliance-findings.full.txt](./compliance-findings.full.txt) строк с `rgba(` нет; цветовой дрифт в кодовой базе вне этого снимка по-прежнему отражён в [inventory-dump.md](./inventory-dump.md) (секция rgb-color) и в §2.1 [current.md](./current.md).
- **Тёмная тема:** любой литерал/инлайн, не завязанный на переменные с переопределением в `html.dark`, потенциально обходит токенную схему SSOT §1.1; отдельного скрипта «dark bypass» в репозитории нет — фиксируется как класс риска при наличии `rgb-color` / `hex-color` / `inline-visual-style`.

---

## 2. STRUCTURAL VIOLATIONS

### 2.1 Смешанные парадигмы стилей

Зафиксировано в SSOT §10 и [roadmap-notes.md](./roadmap-notes.md): сосуществуют **CSS variables**, **Tailwind utility**, **feature/components.css / features.css**, **legacy `glc-*`**, **inline `style`**. Аудит количественно подтверждает инлайн и литералы; CVA+Tailwind в [src/app/components/ui](../../src/app/components/ui) даёт плотность `unit-literal` (в т.ч. в примитивах).

### 2.2 Границы компонентов

- Примитивы реализованы в [src/app/components/ui](../../src/app/components/ui); «официальный» узкий экспорт — [src/design-system/ui](../../src/design-system/ui) (7 символов) при глубоком каталоге UI — **двойная поверхность потребления** (roadmap: «Import surface» deferred).
- Находки `inline-visual-style` на уровне страниц/фич (`SnapshotScoreKit`, `ScoreBadge`, studio sections и др.) — стили вне примитивного API на участках продукта.

### 2.3 Несогласованное использование / дубли паттернов

Явно задокументировано как технический долг: **Score / badge / snapshot виджеты** — несколько реализаций ([roadmap-notes.md](./roadmap-notes.md) «Deferred epics»); это дублирование структуры/назначения, не сведённое к одному API.

---

## 3. TOKEN SYSTEM ISSUES

### 3.1 Неиспользуемые токены

Полный индекс имён `--*` в [inventory-dump.md](./inventory-dump.md) (**357** имён в снимке `tokens.css`). **Обратный анализ «определён, но ни разу не встречается в src»** в данном отчёте не выполнялся отдельным скриптом — для исчерпывающего списка нужна отдельная машинная crosswalk-процедура (не входит в текущий экспорт нарушений).

### 3.2 Повторяющиеся нетокенизированные значения

- **122** уникальных hex + **159** записей в группе rgb/rgba в литеральном инвентаре репозитория — см. [current.md](./current.md) §2.6 и счётчики в [inventory-dump.md](./inventory-dump.md) (hex-color / rgb-color).
- В `compliance-findings` для текущего снимка преобладают кластеры вроде `1px`, `3px`, `0.9375rem` и инлайн-стили с `var(--…)` (всё равно фиксируются как `inline-visual-style` по ключам); частотный срез по полю value — `grep`/`awk` по [compliance-findings.full.txt](./compliance-findings.full.txt).

### 3.3 Фрагментация семантики

SSOT §2.1 перечисляет множество групп (`--glc-*`, `--score-*`, `--callout-*`, `--ui-*`, shadcn-совместимые `--primary` и т.д.) — **несколько семантических осей** на схожие роли; плюс литералы в коде дают третью ось представления одного и того же оттенка.

---

## 4. STATE SYSTEM ISSUES

По SSOT [current.md](./current.md) §7:

- **Отсутствующие глобальные контракты:** нет единого `success`/`error` variant contract для всех примитивов; `loading` только у `Button`.
- **Смешанная реализация:** псевдоклассы + `data-[state=*]` + `aria-*` — зафиксировано как факт §7 и §10.5.
- **Несогласованность между контекстами:** не измеряется отдельным скриптом; риск следует из смешения парадигм и feature-local стилей.

---

## 5. LAYOUT SYSTEM VIOLATIONS

- SSOT §6: контракты `LAYOUT_CONTRACTS` **и** дополнительные media query (`1024px`, `1280px`, …) **и** `UI_BREAKPOINTS.mobile = 768` — **несколько шкал breakpoints** для схожих задач.
- `unit-literal` концентрируется в маркетинге, discover, snapshot, pipeline monitor (см. топ файлов ниже) — отступы/размеры вне единого выражения через `--space-*` / контракты.

---

## 6. NAMING VIOLATIONS

SSOT §9: сосуществуют `glc-*`, BEM-подобные `__`/`--`, Tailwind, `data-slot`, префиксы `--*`.  
Дополнительно: **два пути импорта примитивов** (`src/design-system/ui` vs `src/app/components/ui`) — несогласованность потребительской поверхности (roadmap).

---

## 7. ACCESSIBILITY GAPS (FACTUAL ONLY)

- DS-аудит **не** эмитит типы вроде `missing-aria`; отчёт ограничен тем, что видно из SSOT §8 (что уже реализовано в части примитивов) и из отсутствия таких находок в `compliance-findings.full.txt`.
- Утверждать «нет focus style на экране X» без построчного обхода TSX **нельзя** в рамках данного артефакта.

---

## 8. DUPLICATION MAP (группировка)

**Повтор цветовых литералов / акцентов (репозиторий в целом):** см. секции hex-color и rgb-color в [inventory-dump.md](./inventory-dump.md); в текущем app-scope merged-экспорте типов `hex-color` / `rgb-color` нет (§1.1).

**Топ файлов по числу находок (merged: `unit-literal` + `inline-visual-style`, без allowlist)** — копия [violations-export.md](./violations-export.md) § Top files на дату снимка:

| Файл | Count |
| --- | ---: |
| `src/app/marketing/MarketingHeader.tsx` | 8 |
| `src/app/marketing/blocks/HomeHeroCockpit.tsx` | 7 |
| `src/app/marketing/blocks/PackageMarketingHero.tsx` | 7 |
| `src/app/marketing/home/sections/HomeHeroSection.tsx` | 7 |
| `src/app/pages/intake-brief/components/IntakeBriefFormPhase.tsx` | 7 |
| `src/app/pages/intake-brief/components/IntakeBriefReviewPhase.tsx` | 7 |
| `src/app/pages/snapshot-landing/components/SnapshotLandingResults.tsx` | 7 |
| `src/app/marketing/blocks/NextStepsCta.tsx` | 6 |
| `src/app/pages/snapshot-landing/SnapshotScoreBadge.tsx` | 6 |
| `src/app/components/question-bank-studio/sections/StudioHeaderSection.tsx` | 5 |
| `src/app/pages/discover/components/AuditTeaser.tsx` | 5 |
| `src/app/pages/pipeline-monitor/sections/PhaseSidebar.tsx` | 5 |
| `src/app/pages/SnapshotLanding.tsx` | 5 |
| `src/app/marketing/home/components/SectionHeading.tsx` | 4 |
| `src/app/pages/discover/components/ContactCaptureForm.tsx` | 4 |
| `src/app/pages/DiscoveryQueue.tsx` | 4 |
| `src/app/pages/new-audit/NewAuditChrome.tsx` | 4 |
| `src/app/pages/new-audit/steps/Step2Confirm.tsx` | 4 |
| `src/app/pages/pipeline-monitor/sections/PhaseDetailPanel.tsx` | 4 |
| `src/app/components/question-bank-studio/sections/StudioModeSummarySection.tsx` | 3 |
| `src/app/components/question-bank-studio/sections/StudioToolbarSection.tsx` | 3 |
| `src/app/components/snapshot/SnapshotAccessBlockedCallout.tsx` | 3 |
| `src/app/components/snapshot/SnapshotScoreKit.tsx` | 3 |
| `src/app/components/ui/switch.tsx` | 3 |
| `src/app/components/ui/tabs.tsx` | 3 |
| `src/app/features/report-viewer/components/DomainScorecard.tsx` | 3 |
| `src/app/features/report-viewer/components/ProfileTabs.tsx` | 3 |
| `src/app/features/report-viewer/components/ReportFindings.tsx` | 3 |
| `src/app/marketing/home/config/home-ui.config.ts` | 3 |
| `src/app/pages/admin-request-queue/components/AuditRequestQueueCard.tsx` | 3 |
| `src/app/pages/audit-workspace/sections/IssuesSection.tsx` | 3 |
| `src/app/pages/client-audit-view/sections/NavigationLinksSection.tsx` | 3 |
| `src/app/pages/login/config/login-ui-policy.ts` | 3 |
| `src/app/pages/new-audit/steps/Step1Brief.tsx` | 3 |
| `src/app/pages/pipeline-monitor/PipelineMonitorPhaseUi.tsx` | 3 |
| `src/app/pages/settings/components/OptionPill.tsx` | 3 |
| `src/app/pages/snapshot-landing/components/results/InsightsGridSection.tsx` | 3 |
| `src/app/components/portal-snapshot-account-mirror/sections/MirrorScoreSection.tsx` | 2 |
| `src/app/components/question-bank-studio/sections/StudioCanvasSection.tsx` | 2 |
| `src/app/components/question-bank-studio/sections/StudioDiffSection.tsx` | 2 |

**Дубли компонентных паттернов:** score/snapshot/badge — см. roadmap deferred epic.

---

## 9. SYSTEM FRAGMENTATION SUMMARY

| Зона | Наблюдение |
| --- | --- |
| **Связная** | Канон токенов в `tokens.css`; TS-зеркала; layout-контракты в `design-system/patterns`; utilities.css ограничены layout (политика). |
| **Фрагментирована** | Страницы discover / intake / snapshot / marketing / studio — высокая концентрация литералов и инлайна; несколько breakpoint-источников; два импорт-пути UI. |
| **Наибольший bypass** | **196** `unit-literal` + **58** `inline-visual-style` в no-allowlist снимке (**254** дедуп-строки); горячие файлы — [violations-export.md](./violations-export.md). |
| **CI vs полный дрифт** | Продакшен CI использует allowlist ([roadmap-notes](./roadmap-notes.md)); данный отчёт — **полный снимок без allowlist** (**254** дедуп-строк в [compliance-findings.full.txt](./compliance-findings.full.txt) на дату снимка). |

---

## Как воспроизвести количества

```bash
pnpm run audit:ds:export-violations
pnpm run audit:ds:inventory-dump
```

После изменений кода перегенерировать [violations-export.md](./violations-export.md), [compliance-findings.full.txt](./compliance-findings.full.txt) и при необходимости [inventory-dump.md](./inventory-dump.md); обновить этот документ при смене даты/снимка.

**Связанные артефакты:** полный перечень находок — [compliance-findings.full.txt](./compliance-findings.full.txt); сводка и топ файлов — [violations-export.md](./violations-export.md).
