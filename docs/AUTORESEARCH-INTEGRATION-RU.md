[English](AUTORESEARCH-INTEGRATION.md) | [Русский](AUTORESEARCH-INTEGRATION-RU.md)

# Autoresearch ↔ ForgePlan: интеграция

Как сочетать [`autoresearch`](https://github.com/uditgoenka/autoresearch) (плагин итеративных целевых циклов от Udit Goenka, основанный на [autoresearch Карпатого](https://github.com/karpathy/autoresearch)) с рабочим процессом ForgePlan.

> **TL;DR**: ForgePlan ведёт **отслеживаемый жизненный цикл артефактов** (PRD/RFC/ADR с подсчётом R_eff). Autoresearch ведёт **итерации под мерой** (Modify → Verify → Keep/Discard → Repeat). Они хорошо сочетаются — autoresearch крутит цикл, forgeplan сохраняет результат как Evidence.

---

## Что такое autoresearch

Плагин-скилл для Claude Code (а также OpenCode и Codex), превращающий любую задачу с **измеримой метрикой** в целенаправленный цикл:

```
Цель → цикл:
  Модификация кода → запуск verify → измерение метрики →
    лучше: оставить, закоммитить
    хуже: откатить, попробовать другой вариант
  Стоп когда цель достигнута или бюджет исчерпан
```

Пять команд (v2.0.03):

| Команда | Назначение |
|---|---|
| `/autoresearch:plan` | Анализ кодовой базы, предложение метрик, dry-run verify до запуска |
| `/autoresearch:debug` | Итеративный цикл починки бага под метрикой (доля прохождения тестов, производительность и т.п.) |
| `/autoresearch:security` | Аудит безопасности только-чтение (с опциональным `--fix` для подтверждённых Critical/High) |
| `/autoresearch:predict` | Однократный разбор существующего кода группой из 5 экспертов |
| `/autoresearch:reason` | Итеративное уточнение — конкурирующие варианты, критика, синтез, слепое судейство до сходимости |

**Установка** (отдельно от этого маркетплейса):
```
/plugin marketplace add uditgoenka/autoresearch
/plugin install autoresearch@uditgoenka-autoresearch
```

---

## Зачем сочетать с ForgePlan

Autoresearch и ForgePlan оптимизируют разные вещи:

| | Autoresearch | ForgePlan |
|---|---|---|
| Что оптимизирует | Механическую метрику (тесты, производительность, размер сборки, security findings) | Прослеживаемость + происхождение решений (PRD/ADR/Evidence с R_eff) |
| Цикл | Modify → Verify → Keep/Discard | Route → Shape → Build → Evidence → Activate |
| Что производит | Улучшенный код соответствующий метрике | Граф артефактов + оценённые решения |
| Что НЕ фиксирует | Зачем сделано изменение (намерение, альтернативы) | Тысячу мелких экспериментов которые привели к изменению |
| Обратимость | git-история по итерациям | Состояния lifecycle с valid_until |

В сочетании: autoresearch даёт **измеренное улучшение**, forgeplan фиксирует **след решений** + **оценку**.

---

## Три способа интеграции

### Способ A — Autoresearch как фаза Build в `/forge-cycle`

Когда `/forge-cycle` доходит до шага 5 (Build), и у задачи есть чёткая механическая метрика (доля тестов, p95-задержка, размер бандла), передаём управление в `/autoresearch:plan` вместо `/sprint`:

```
/forge-cycle "снизить p95 чекаута до 200мс"
  → Шаг 1: forgeplan health
  → Шаг 2: задача подтверждена
  → Шаг 3: route → глубина Standard
  → Шаг 4: shape → PRD-NNN с критерием успеха «p95 < 200мс»
  → Шаг 5: BUILD → /autoresearch:plan "снизить p95 до 200мс"
                  (цикл крутится без участия, коммитит каждую итерацию)
  → Шаг 6: ревью
  → Шаг 7: forgeplan new evidence с финальным замером p95
            verdict: supports
            congruence_level: 3
            evidence_type: measurement
  → Шаг 8: активация PRD-NNN если R_eff > 0
```

Критерий успеха PRD становится метрикой autoresearch. Финальное состояние цикла попадает в Evidence с высокой уверенностью CL3 (это прямое измерение).

### Способ B — Autoresearch отдельно → результат в ForgePlan как Evidence

Для разовых улучшений на которые полный PRD неоправдан — запускаем autoresearch отдельно, фиксируем результат как Note + Evidence:

```bash
# Запускаем цикл
/autoresearch:debug "починить нестабильный тест в test/auth.spec.ts"
# Когда готово — фиксируем в forgeplan:
forgeplan new note "починен нестабильный auth-тест — причина: гонка в моке токена"
forgeplan new evidence "/autoresearch:debug 47 итераций; финальная доля 100/100; commit sha=abc123"
forgeplan link EVID-NNN NOTE-MMM
```

Лёгкий вариант — без PRD, без шлюза активации. Просто след показывающий что цикл сделал.

### Способ C — Autoresearch для security-аудита → Evidence

`/autoresearch:security` по умолчанию только-чтение и выдаёт структурный отчёт. Это прямой кандидат на Evidence:

```bash
/autoresearch:security
# После отчёта:
forgeplan new evidence "<scope>: autoresearch:security audit — 2 HIGH, 4 MED findings; 1 HIGH автоматически исправлено через --fix"
# Связываем с релевантным security PRD или ADR:
forgeplan link EVID-NNN ADR-MMM --relation informs
```

Если запускали с `--fix` и применили авто-исправление — сами изменения можно оформить отдельным Evidence (verdict: supports, evidence_type: code_review).

---

## Извлечение знаний из brownfield с autoresearch

Скиллы [`forgeplan-brownfield-pack`](../plugins/forgeplan-brownfield-pack/README-RU.md) могут использовать примитивы autoresearch как цикловой движок:

| Скилл brownfield | Команда autoresearch | Режим |
|---|---|---|
| `intent-inferrer` (C3) | `/autoresearch:reason` | итеративное уточнение конкурирующих гипотез (соответствует ADI: дедукция → индукция) |
| `hypothesis-triangulator` (C6) | `/autoresearch:predict` | разбор 5 экспертов для триангуляции — какая гипотеза переживёт проверку |
| `canonical-reproducer` (C10) | `/autoresearch:debug` | итерации до соответствия воспроизведения реальности (метрика: поведенческое совпадение) |
| `reproducibility-validator` (C11) | verify команда autoresearch | работает как валидационный слой для C10 |

Пакет brownfield содержит рецепт в [`integration/autoresearch-hooks.md`](../plugins/forgeplan-brownfield-pack/integration/autoresearch-hooks.md) показывающий как каждый из 12 скиллов извлечения подключается к командам autoresearch v2.0.03.

---

## Установка

```bash
# 1. Поставить autoresearch (отдельный маркетплейс)
/plugin marketplace add uditgoenka/autoresearch
/plugin install autoresearch@uditgoenka-autoresearch
/reload-plugins

# 2. Сторона ForgePlan (если ещё не сделано)
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install forgeplan-workflow@ForgePlan-marketplace
/reload-plugins

# 3. Проверка
/autoresearch:plan --help    # autoresearch
forgeplan --version          # CLI forgeplan
```

---

## Какой цикл когда использовать

| Ситуация | Что использовать |
|---|---|
| У задачи чёткая механическая метрика (производительность, тесты, размер сборки, security findings) | `/autoresearch:plan` (или сразу `:debug`/`:security`) |
| Нужно рассуждение между вариантами без объективной метрики | `/autoresearch:reason` (итеративное уточнение со слепым судейством) |
| Однократный разбор для решения которое сам примешь | `/autoresearch:predict` (5 экспертов, без цикла) |
| Задача с несколькими ограничениями + нужна прослеживаемость | `/forge-cycle` (lifecycle артефактов), с autoresearch на фазе Build если есть метрика |
| Чистая реализация фичи без метрики | `/sprint` или `/forge-cycle`, autoresearch не нужен |
| Извлечение из brownfield (вывод намерений, триангуляция гипотез) | Скиллы `forgeplan-brownfield-pack` делегирующие в autoresearch |

---

## Чего не делать

- ❌ **Запускать autoresearch без метрики.** Весь движок строится на `Modify → Verify` где Verify выдаёт число. Нет метрики — нет сигнала — цикл бродит впустую.
- ❌ **Сохранять результат autoresearch как Evidence без CL-разметки.** Помечай `congruence_level: 3` (CL3 — тот же контекст) и `evidence_type: measurement` чтобы R_eff корректно посчитался.
- ❌ **Использовать autoresearch для задач требующих творческого суждения** (UX-решения, нейминг, приоритеты). Бери `/refine` или `/fpf-evaluate`.
- ❌ **Забыть закоммититься перед циклом.** Autoresearch коммитит каждую итерацию, но **начальное состояние** тоже должно быть в git чтобы откат работал чисто.
- ❌ **Запускать autoresearch параллельно `/sprint` на одних и тех же файлах.** Будут драться за код. Один инструмент на одну задачу.

---

## См. также

- Репозиторий autoresearch — [github.com/uditgoenka/autoresearch](https://github.com/uditgoenka/autoresearch) (v2.0.03)
- Оригинал Карпатого — [github.com/karpathy/autoresearch](https://github.com/karpathy/autoresearch)
- [METHODOLOGIES-RU.md](METHODOLOGIES-RU.md) — autoresearch как recommended companion
- [PLAYBOOK-RU.md](PLAYBOOK-RU.md) — сценарий «итерации под мерой»
- [`plugins/forgeplan-brownfield-pack/integration/autoresearch-hooks.md`](../plugins/forgeplan-brownfield-pack/integration/autoresearch-hooks.md) — карта соответствия для 12 скиллов brownfield
