[English](README.md) | [Русский](README-RU.md)

# FPF Plugin -- Думай, прежде чем строить

**FPF -- усилитель мышления для инженеров.** Он дает вашему AI-ассистенту структурированное рассуждение от первых принципов -- чтобы решения были прослеживаемы, декомпозиции чисты, а ничего не принималось на веру.

## Благодарности

- **Спецификация FPF** -- [Anatoly Levenchuk](https://github.com/ailev) -- [github.com/ailev/FPF](https://github.com/ailev/FPF)
- **Упаковка в скилл** -- [CodeAlive-AI](https://github.com/CodeAlive-AI) -- [fpf-simple-skill](https://github.com/CodeAlive-AI/fpf-simple-skill)
- **Расширенный плагин** -- [ForgePlan](https://github.com/ForgePlan) -- команды, агент, прикладные паттерны, интеграция с forgeplan

## Быстрый старт

```bash
/plugin install fpf@ForgePlan-marketplace   # установка
/fpf                                        # все режимы
/fpf decompose my auth system               # начать рассуждение
```

## Примеры использования

### Декомпозиция системы на ограниченные контексты

```
> /fpf decompose our e-commerce platform

Applying FPF Bounded Contexts (A.1.1)...

| Context | Responsibility | Key Roles | Interfaces |
|---------|---------------|-----------|------------|
| Catalog | Product data, search, categories | Product Manager, Search Engine | -> Cart (product lookup) |
| Cart | Shopping cart, pricing, discounts | Pricing Engine | -> Checkout (cart contents) |
| Checkout | Payment, order creation | Payment Gateway | -> Fulfillment (order) |
| Fulfillment | Shipping, tracking, returns | Warehouse System | -> Catalog (stock updates) |
| Identity | Auth, profiles, permissions | Auth Provider | -> All (user context) |

Category error check (A.7): No role/function confusion detected.
Suggest creating forgeplan artifacts for each context? [y/n]
```

### Оценка альтернатив с доказательным скорингом

```
> /fpf evaluate PostgreSQL vs SQLite for our backend

Applying F-G-R Scoring (C.2) + ADI Reasoning...

ABDUCTION (3 hypotheses):
  H1: PostgreSQL -- handles concurrent writes, scales with team
  H2: SQLite -- simpler ops, faster for single-user, embedded
  H3: Start SQLite, migrate later -- low initial cost

| Option | F(0-3) | G(0-3) | R(0-3) | Score | Evidence |
|--------|--------|--------|--------|-------|----------|
| PostgreSQL | 3 | 2 | 3 | 8/9 | Production-proven, team growing |
| SQLite | 2 | 3 | 2 | 7/9 | Works now, migration risk later |
| Start->Migrate | 1 | 1 | 1 | 3/9 | Unproven migration path |

Recommendation: PostgreSQL. Missing evidence: load test under concurrent writes.
Create ADR? [y/n]
```

### Рассуждение через проверку гипотез

```
> /fpf reason why our API response times degraded

ABDUCTION: 3 hypotheses generated
  H1: N+1 query in new user endpoint (added last sprint)
  H2: Missing index on users.organization_id (growing data)
  H3: External API (Stripe) latency increase

DEDUCTION -> INDUCTION:
  H1: Check git log for recent query changes -> CONFIRMED (commit abc123)
  H2: Check EXPLAIN ANALYZE -> index exists, not this
  H3: Check Stripe status -> no incidents

Conclusion: H1 supported (confidence: HIGH)
Fix: Add eager loading in users.service.ts:45
```

## Чем отличается от fpf-simple

| Возможность | fpf-simple (skill) | fpf (plugin) |
|---------|-------------------|--------------|
| Формат | Отдельный скилл | Полный плагин (skill + commands + agent) |
| Команда `/fpf` | Нет | Универсальный роутер: decompose, evaluate, reason, lookup |
| Специализированные команды | Нет | `/fpf-decompose`, `/fpf-evaluate`, `/fpf-reason` |
| Агент | Нет | `fpf-advisor` -- активируется для архитектурных задач |
| Прикладные паттерны | Нет | 4 пошаговых руководства для реального применения |
| Интеграция с Forgeplan | Нет | Маппинг выходов FPF в артефакты PRD, RFC, ADR |
| Быстрый старт | Нет | Онбординг для новичков в FPF |

## Под капотом

- **224 раздела спецификации FPF**, разобранных из оригинального текста Левенчука
- **4 прикладных паттерна** -- bounded contexts, F-G-R скоринг, ADI-рассуждение, детекция категориальных ошибок
- Спецификация FPF -- **git submodule** из `ailev/FPF`, синхронизируется через `split_spec.py`

## Обновление спецификации FPF

```bash
cd plugins/fpf && ./scripts/update-fpf.sh
```

Подтягивает последнюю спецификацию из upstream, перегенерирует 224 файлов через `split_spec.py`, сохраняет `applied-patterns/` и показывает изменения.

## Лицензия

MIT -- применяется к обертке плагина. Спецификация FPF авторства Anatoly Levenchuk распространяется на собственных условиях.
