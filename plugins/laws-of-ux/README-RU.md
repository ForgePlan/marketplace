[English](README.md) | [Русский](README-RU.md)

# Laws of UX -- Плагин для Claude Code

Находит UX-нарушения в вашем фронтенд-коде до того, как они дойдут до пользователей. Проверяет HTML/CSS/JS/React/Vue/Svelte на соответствие 30 научно обоснованным законам UX.

## Быстрый старт

```bash
claude plugins add laws-of-ux        # установка из маркетплейса
/ux-review                            # сканировать текущий проект
/ux-law fitts                         # найти любой закон
```

## Примеры использования

### /ux-review -- сканирование проекта

```
> /ux-review

Scanning 12 frontend files...

| # | Law | Severity | File | Issue |
|---|-----|----------|------|-------|
| 1 | Fitts's Law | Critical | Button.tsx:15 | Touch target 24x24px -- minimum 44x44px |
| 2 | Hick's Law | Warning | Nav.tsx:8 | 12 top-level nav items -- recommend <= 7 |
| 3 | Miller's Law | Warning | Form.tsx:22 | 15 form fields visible -- chunk into steps |
| 4 | Doherty Threshold | Suggestion | api.ts:45 | No loading state for fetch -- add skeleton |

4 findings: 1 critical, 2 warnings, 1 suggestion
```

### /ux-law -- поиск закона по названию

```
> /ux-law fitts

## Fitts's Law
The time to acquire a target is a function of the distance to and size of the target.

**Key Takeaways:**
- Touch targets >= 44x44px (WCAG) or 48x48px (Material)
- Gap between targets >= 8px
- Primary actions within thumb reach on mobile

**Code Review Checklist:**
- [ ] All interactive elements >= 44x44px
- [ ] Adjacent buttons have >= 8px gap
- [ ] Mobile CTAs at bottom of screen
```

## Что входит в плагин

| Компонент | Описание |
|-----------|----------|
| `/ux-review` | Сканирует фронтенд-файлы, сообщает о нарушениях с указанием файл:строка и предложениями по исправлению |
| `/ux-law [name]` | Поиск любого закона UX -- описание, выводы, чеклист для кода |
| `ux-reviewer` агент | Активируется при работе с фронтендом, предлагает UX-рекомендации |
| `PostToolUse` хук | Автоматические подсказки о релевантных законах UX при редактировании фронтенд-файлов |
| `ux-laws` навык (БЗ) | 30 законов + 9 файлов паттернов кода, загрузка через agentic RAG |

## 30 законов по категориям

| Категория | Законы |
|-----------|--------|
| Эвристики | Aesthetic-Usability Effect, Choice Overload, Fitts's Law, Hick's Law |
| Когнитивные | Chunking, Cognitive Bias, Cognitive Load, Flow, Miller's Law, Paradox of Active User, Selective Attention, Serial Position Effect, Von Restorff Effect, Working Memory |
| Гештальт | Law of Common Region, Law of Proximity, Law of Pragnanz, Law of Similarity, Law of Uniform Connectedness, Mental Model |
| Принципы | Doherty Threshold, Goal-Gradient Effect, Jakob's Law, Occam's Razor, Pareto Principle, Parkinson's Law, Peak-End Rule, Postel's Law, Tesler's Law, Zeigarnik Effect |

### Паттерны кода (9 файлов)

| Паттерн | Что проверяет |
|---------|---------------|
| Touch Targets | Минимум 44x44px, отступы, области клика |
| Navigation & Choices | Максимум 7 пунктов навигации, прогрессивное раскрытие |
| Content Grouping | Пропорции близости, визуальные регионы, консистентность |
| Information Density | Группировка форм, маски ввода, колонки таблиц |
| Response Time | Порог 400мс, скелетоны, анимации |
| Visual Hierarchy | Различимость CTA, контрастность, типографика |
| User Expectations | Стандартные паттерны, типы ввода, Postel's Law |
| Motivation & Progress | Прогресс-бары, Zeigarnik, Peak-End |
| Simplicity | Occam's Razor, Tesler's Law, умные значения по умолчанию |

## Благодарности

UX Laws -- [Jon Yablonski](https://jonyablonski.com/) -- [lawsofux.com](https://lawsofux.com/)

## Лицензия

MIT
