[English](README.md) | [Русский](README-RU.md)

# Laws of UX — Плагин для Claude Code

Плагин для Claude Code, который проверяет фронтенд-код на соответствие **30 законам UX** с сайта [lawsofux.com](https://lawsofux.com/) Джона Яблонски.

## Что делает

- **`/ux-review`** — Сканирует ваши фронтенд-файлы (HTML/CSS/JS/React/Vue/Svelte) и проверяет их на соответствие 30 законам UX. Сообщает о нарушениях с указанием файл:строка и конкретными предложениями по исправлению.
- **`/ux-law [name]`** — Поиск любого закона UX по названию. Показывает описание, ключевые выводы, влияние на фронтенд-код и чеклист для ревью.
- **UX Reviewer Agent** — Автоматически активируется при работе с фронтенд-задачами, предлагая UX-ориентированные рекомендации.
- **Auto-hints** — Ненавязчивые напоминания о релевантных законах UX при написании/редактировании фронтенд-файлов.

## Установка

```bash
# Из маркетплейса (после публикации)
npx claude-code plugins add laws-of-ux

# Локальная установка
claude plugins add /path/to/laws-of-ux
```

## Охваченные законы (30)

### Эвристики
Aesthetic-Usability Effect, Choice Overload, Fitts's Law, Hick's Law

### Когнитивные
Chunking, Cognitive Bias, Cognitive Load, Flow, Miller's Law, Paradox of Active User, Selective Attention, Serial Position Effect, Von Restorff Effect, Working Memory

### Гештальт
Law of Common Region, Law of Proximity, Law of Prägnanz, Law of Similarity, Law of Uniform Connectedness, Mental Model

### Принципы
Doherty Threshold, Goal-Gradient Effect, Jakob's Law, Occam's Razor, Pareto Principle, Parkinson's Law, Peak-End Rule, Postel's Law, Tesler's Law, Zeigarnik Effect

## Паттерны кода

Плагин включает 9 файлов паттернов кода с конкретными правилами CSS/HTML/JS:

| Файл паттерна | Что проверяет |
|---|---|
| Touch Targets | Минимум 44x44px, отступы, области клика |
| Navigation & Choices | Максимум 7 пунктов навигации, прогрессивное раскрытие |
| Content Grouping | Пропорции близости, визуальные регионы, консистентность |
| Information Density | Группировка форм, маски ввода, колонки таблиц |
| Response Time | Порог 400мс, скелетоны, анимации |
| Visual Hierarchy | Различимость CTA, коэффициенты контраста, типографика |
| User Expectations | Стандартные паттерны, типы ввода, Postel's Law |
| Motivation & Progress | Прогресс-бары, Zeigarnik, Peak-End |
| Simplicity | Occam's Razor, Tesler's Law, умные значения по умолчанию |

## Архитектура

Построен как **agentic RAG** — агент навигирует по иерархии разделов, загружая в контекст только релевантные законы (~300 строк за раз), аналогично [fpf-simple-skill](https://github.com/CodeAlive-AI/fpf-simple-skill).

## Благодарности

- **UX Laws**: [Jon Yablonski](https://jonyablonski.com/) — [lawsofux.com](https://lawsofux.com/)
- **Плагин**: explosovebit

## Лицензия

MIT
