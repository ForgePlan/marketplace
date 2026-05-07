[English](UPSTREAM-METHODOLOGIES.md) | [Русский](UPSTREAM-METHODOLOGIES-RU.md)

# Upstream-методологии — источники которые мы интегрируем

Указатели на upstream-проекты чьи методологии используют forgeplan и маркетплейс. Пригодится когда хочется почитать **оригинальную спецификацию** того что у нас уже работает, или когда нужно сослаться на источник в аудите.

> **Дополняет** [METHODOLOGIES-RU.md](METHODOLOGIES-RU.md). Тот документ объясняет *что встроено в нашу экосистему и как этим пользоваться*. Этот — **библиография**: откуда методология пришла, что мы взяли как есть, что адаптировали.

---

## Quint-code

**Источник**: внутренняя референсная база ForgePlan — см. `sources/Quint-code/` в [репозитории forgeplan](https://github.com/ForgePlan/forgeplan).

**Что forgeplan берёт**:
- Архитектура движка решений (lifecycle артефактов, валидация, скоринг)
- **DDR** (Detailed Decision Record) — расширенный шаблон ADR: постановка → решение → обоснование → последствия, плюс инварианты, план отката, срок действия
- **Verification Gate** — пятиточечная проверка перед закрытием решения (дедуктивные следствия / контраргумент / самоочевидность / хвостовые сбои / слабейшее звено)
- Флаг **Stepping Stone** в SolutionPortfolio

**Что уникально у forgeplan**: интеграция с R_eff + Evidence Decay + семантическим поиском на LanceDB.

**Когда читать**: когда пишешь высокоставочный ADR и нужен полный шаблон DDR; когда проектируешь свой workflow трекинга решений.

---

## BMAD-METHOD

**Источник**: см. `sources/BMAD-METHOD/` в репозитории forgeplan. Изначально внешний проект описывающий рекурсивную декомпозицию задач по слоям бизнес / поддержка / архитектура / дизайн.

**Что forgeplan берёт**:
- 13-шаговая валидация PRD-workflow (используется `forgeplan validate`)
- Состязательное ревью: **ревьюер ОБЯЗАН найти хотя бы одну проблему; ноль найденного — значит ревью было недостаточно тщательным**
- Quick Flow vs Full Path — правила валидации зависят от глубины задачи
- Специализация ревьюеров — разные роли под каждый вид артефакта

**Что уникально у forgeplan**: связано с графом артефактов + R_eff. Валидация BMAD работает как контроль качества перед активацией.

**Когда читать**: когда создаёшь новый вид артефакта и нужен контракт валидации; когда проектируешь своё правило validate.

---

## OpenSpec

**Источник**: см. `sources/OpenSpec/` (изначально TypeScript-проект для конвейеров артефактов).

**Что forgeplan берёт**:
- **Граф артефактов** — направленный ациклический граф (Proposal → Specs → Design → Tasks); каждый артефакт знает родителей и детей
- **Delta-спеки** — описывают ТОЛЬКО изменения (ADDED/MODIFIED/REMOVED) вместо полного переписывания при каждой итерации; рассчитаны на brownfield где полная спецификация избыточна
- Свои схемы для каждого вида артефакта
- Lifecycle-команды (`supersede`, `deprecate`) работают на графе

**Что уникально у forgeplan**: совмещение с R_eff и LanceDB-семантическим поиском по всему графу.

**Когда читать**: когда работаешь с delta-спеками (brownfield) или проектируешь новый вид артефакта чья схема отличается от существующих.

---

## FPF — First Principles Framework

**Источник**: [github.com/ailev/FPF](https://github.com/ailev/FPF) Анатолий Левенчук. 224 раздела спецификации: декомпозиция, оценка, рассуждение.

**Что forgeplan берёт**:
- **F-G-R Trust Calculus** — три оси оценки качества знания (Formality / Granularity / Reliability)
- **Цикл ADI** — Abduction → Deduction → Induction. Используется `forgeplan reason` для порождения гипотез (для глубины Deep+ обязателен перед активацией)
- **Pareto Front** и **Stepping Stone** в SolutionPortfolio
- **CL** (Congruence Level) — 4 уровня насколько evidence переносится между контекстами (CL3 — тот же контекст → CL0 — противоположный); поправки применяются к R_eff

**Что отдельно** (в нашем маркетплейсе): [плагин `fpf`](../plugins/fpf/) даёт интерактивные `/fpf-decompose`, `/fpf-evaluate`, `/fpf-reason`, `/fpf-lookup` — независимо от жизненного цикла.

**Когда читать**: когда новенький во фреймворке и хочется оригинальную спеку; когда делаешь структурную декомпозицию где термины методологии важны (ограниченные контексты, F-G-R, ADI).

---

## Autoresearch Карпатого

**Источник**: [github.com/karpathy/autoresearch](https://github.com/karpathy/autoresearch) — оригинальная концепция Андрея Карпатого.

**Что мы используем**:
- Паттерн целенаправленного цикла: Modify → Verify → Keep/Discard → Repeat
- Механическая метрика как сигнал цикла (нет метрики → нет цикла)
- Эффект сложного процента через ограничение + автоматизация

**Реализация**: НЕ напрямую в нашем маркетплейсе. Реализация — [`uditgoenka/autoresearch`](https://github.com/uditgoenka/autoresearch), плагин-скилл для Claude Code (и OpenCode/Codex) в отдельном маркетплейсе. Интеграция документирована в [AUTORESEARCH-INTEGRATION-RU.md](AUTORESEARCH-INTEGRATION-RU.md).

**Когда читать**: когда хочется понять дисциплину цикла до установки реализации; когда проектируешь свою verify-команду.

---

## git-adr

**Источник**: [git-adr](https://github.com/manuel-uberti/git-adr) — Rust CLI для управления ADR.

**Что forgeplan берёт**:
- Архитектура Rust CLI как референс для CLI `forgeplan`
- Markdown-как-источник-истины (не БД)
- История git как история ADR (каждый ADR — git-отслеживаемый файл)

**Что уникально у forgeplan**: модель расширена с only-ADR на полный граф артефактов (PRD/RFC/ADR/Spec/Evidence/Note и т.п.) с семантическим поиском и R_eff.

**Когда читать**: когда нужен минимальный референс ADR-only инструмента; когда сравниваешь дизайн-решения forgeplan CLI.

---

## ccpm — Claude Code Project Management

**Источник**: см. `sources/ccpm/` в репозитории forgeplan. Изначально markdown-методология управления проектами под Claude Code.

**Что forgeplan берёт**:
- Паттерны организации долгоиграющей работы в Claude Code
- CLAUDE.md как память проекта
- Конвенции организации скиллов

**Что уникально у forgeplan**: расширено до полного жизненного цикла (CLAUDE.md становится одним из многих входов; скиллы делегируют в CLI forgeplan для lifecycle артефактов).

**Когда читать**: когда пишешь best-practices для CLAUDE.md или проектируешь новый skill-плагин.

---

## adr-tools

**Источник**: [npryce/adr-tools](https://github.com/npryce/adr-tools) — Bash CLI, оригинальный ADR-инструмент от Ната Прайса.

**Что forgeplan берёт**:
- Конвенция именования файлов ADR (`NNN-kebab-title.md`)
- Шаблон ADR (Status / Context / Decision / Consequences)
- Сама концепция ADR

**Что уникально у forgeplan**: Rust + LanceDB вместо Bash + filesystem; lifecycle-состояния шире чем Status (`draft → active → superseded/deprecated/stale`); типизированные связи.

**Когда читать**: когда нужен канонический референс ADR-концепции; когда проектируешь fallback-workflow на Bash.

---

## Как forgeplan их собирает

```
Формула forgeplan (из VISION.md):

  Quint-code  (движок решений + DDR + Verification Gate)
+ BMAD        (PRD-workflow + состязательное ревью)
+ OpenSpec    (граф артефактов + delta-спеки)
+ FPF         (F-G-R + ADI + CL + Pareto Front + Stepping Stone)
+ git-adr     (Rust CLI + markdown-источник)
+ adr-tools   (ADR-концепция + именование)
+ ccpm        (паттерны Claude Code)
+ LanceDB     (векторный поиск)
+ Tauri       (десктоп — в планах)
```

Forgeplan не переписывает ни одну из них — он соединяет лучшие идеи в единый CLI + граф артефактов + систему скоринга.

---

## Рекомендуемый порядок чтения

Если хочется глубоко понять основу:

1. **adr-tools** — самое простое: только ADR, только markdown. 30 минут.
2. **git-adr** — та же идея на Rust. 30 минут.
3. **BMAD** — добавляет валидацию workflow поверх артефактов. 2 часа.
4. **OpenSpec** — граф артефактов + delta-спеки. 2 часа.
5. **FPF** — фреймворк рассуждений лежащий в основе. 4-6 часов (224 раздела).
6. **Quint-code** — движок решений собирающий всё вместе. 2 часа.
7. **Autoresearch Карпатого** — дисциплина цикла поверх. 1 час.

Если нужен только синтез того что forgeplan берёт (без чтения upstream): см. [METHODOLOGIES-RU.md](METHODOLOGIES-RU.md).

---

## См. также

- [METHODOLOGIES-RU.md](METHODOLOGIES-RU.md) — что встроено в forgeplan и что внешнее (синтез)
- [AI-SDLC-MAPPING-RU.md](AI-SDLC-MAPPING-RU.md) — соответствие фаз для AI-SDLC терминологии
- [AUTORESEARCH-INTEGRATION-RU.md](AUTORESEARCH-INTEGRATION-RU.md) — сочетание Karpathy-style циклов с forgeplan
- Репозиторий ForgePlan: [`docs/methodology/GLOSSARY.ru.md`](https://github.com/ForgePlan/forgeplan/blob/dev/docs/methodology/GLOSSARY.ru.md) — полный словарь
- Репозиторий ForgePlan: `VISION.md` — формула выше с обоснованием
