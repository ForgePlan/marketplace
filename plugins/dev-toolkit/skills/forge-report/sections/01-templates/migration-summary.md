# migration-summary — When you refactored or migrated

Use after: framework upgrade, dependency migration, restructure, rename, schema migration, big refactor.

## Skeleton

```markdown
> _<TL;DR — what migrated from/to, files touched, verification status,
> rollback availability. 1-3 italic sentences.>_

## 🔀 Что мигрировали

  Откуда:    <old version / framework / structure>
  Куда:      <new version / framework / structure>
  Причина:   <why now — deprecation, perf, debt>
  Стратегия: <big bang / gradual / dual-write / parallel>

## 📈 Что затронули

  Файлы:    <count + key paths>
  Тесты:    <count> обновлено, <count> новых
  Документация: <updated paths>
  Схема/БД: <changes if any>

## ✅ Как проверили

  Проверка:  <name>
  Результат: <pass/fail + numbers>
  Уверенность: High / Medium
  ───────────────────────────────────────────────────────────────
  Проверка:  All tests pass
  Результат: 98/98 pass
  Уверенность: High
  ───────────────────────────────────────────────────────────────
  Проверка:  Performance vs baseline
  Результат: -8% latency (small sample)
  Уверенность: Medium
  ───────────────────────────────────────────────────────────────
  Проверка:  Backward compat
  Результат: <result>
  Уверенность: <label>

## ⚪ Что не мигрировано — намеренно

  Не мигрировали: <Item>
  Почему:         <skipped this round / planned for later>

## 🔄 Как откатить если что-то пошло не так

  Действие: Полный rollback миграции
  Команда:  git revert <commit-sha>
  Время:    <how long>
  Окно:     До <дата — когда rollback станет небезопасным>
  Риски:    <if any>

## ⚠️ Что может поломаться со временем

  Риск:   Новый код может ввести старые паттерны
  Когда:  Если разработчики не знают про миграцию
  Что:    Recidivism — старые антипаттерны вернутся
  Защита: Lint правило / документация / PR template
  ───────────────────────────────────────────────────────────────
  Риск:   Stale references в docs / комментариях
  Когда:  Со временем
  Что:    Документация введёт в заблуждение
  Защита: Поиск по grep + обновление

## 📊 Как поймём что миграция удалась

  Сигнал 1: <metric / observable>
  Сигнал 2: <metric / observable>

## ➡️ Что делать дальше

  Шаг 1: ТЕБЕ — <verify in prod>
  Шаг 2: МНЕ — <follow-up cleanup>
  Шаг 3: ПОТОМ — <next migration step if multi-phase>

## 💰 Сколько это стоило

  Время:        <hours>
  Файлов:       <count>
  Коммитов:     <count>
  Стоимость:    <surprises / rework if any>
```

## Required minimums

- ✅ Blockquote TL;DR with from/to + verification status
- ✅ Strategy named (big-bang / gradual / dual-write / parallel)
- ✅ Rollback procedure even if "git revert" — never skip
- ✅ Drift risks — migrations leave half-old/half-new state somewhere
- ✅ Adoption signal — how to know it actually worked

## Anti-patterns

- ❌ "Migration complete!" without verification — false confidence
- ❌ No rollback plan — code stuck after first issue
- ❌ No drift risks — migration leaves zombie code paths
