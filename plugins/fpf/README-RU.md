[English](README.md) | [Русский](README-RU.md)

# FPF Plugin — First Principles Framework для Claude Code

Усилитель мышления для структурированного рассуждения, декомпозиции систем и принятия решений.

## Благодарности

- **Спецификация FPF** — [Anatoly Levenchuk](https://github.com/ailev) — [github.com/ailev/FPF](https://github.com/ailev/FPF)
- **Упаковка в скилл** — [CodeAlive-AI](https://github.com/CodeAlive-AI) ([fpf-simple-skill](https://github.com/CodeAlive-AI/fpf-simple-skill))
- **Расширенный плагин** — [ForgePlan](https://github.com/ForgePlan) — команды, агент, прикладные паттерны, интеграция с forgeplan

## Чем отличается от fpf-simple

| Возможность | fpf-simple (skill) | fpf (plugin) |
|---------|-------------------|--------------|
| Формат | Отдельный скилл | Полный плагин (skill + commands + agent) |
| Команда `/fpf` | Нет | Универсальный роутер: decompose, evaluate, reason, lookup |
| Специализированные команды | Нет | `/fpf-decompose`, `/fpf-evaluate`, `/fpf-reason` |
| Агент | Нет | `fpf-advisor` — активируется для архитектурных/решенческих задач |
| Прикладные паттерны | Нет | Пошаговые руководства для реального применения |
| Интеграция с Forgeplan | Нет | Маппинг выходов FPF в артефакты PRD, RFC, ADR |
| Быстрый старт | Нет | Онбординг для новичков в FPF |
| Спецификация FPF | 224 файла | Те же 224 файла (git submodule из ailev/FPF) |
| Механизм обновления | `split_spec.py` | То же + `update-fpf.sh` с сохранением applied-patterns |

## Установка

```bash
/plugin install fpf@forgeplan-marketplace
```

## Использование

```
/fpf                              # Показать режимы и краткую справку
/fpf decompose my auth system     # Разбить на bounded contexts
/fpf evaluate React vs Vue        # Сравнить с F-G-R скорингом
/fpf reason why API is slow       # Цикл ADI: гипотезы → тест → вывод
/fpf what is bounded context      # Найти концепцию
```

Или просто опишите вашу проблему — агент-советник активируется для архитектурных и решенческих задач.

## Обновление спецификации FPF

Спецификация FPF включена как git submodule из `ailev/FPF`. Для обновления:

```bash
cd plugins/fpf
./scripts/update-fpf.sh
```

Это выполнит:
1. Подтянет последнюю спецификацию FPF из upstream
2. Перегенерирует 224 файла разделов через `split_spec.py`
3. **Сохранит** applied-patterns/ (наши дополнения)
4. Покажет изменения для ревью

## Лицензия

MIT — применяется к обёртке плагина. Спецификация FPF авторства Anatoly Levenchuk распространяется на собственных условиях.
