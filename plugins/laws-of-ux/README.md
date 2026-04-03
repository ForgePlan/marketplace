# Laws of UX — Claude Code Plugin

A Claude Code plugin that reviews frontend code against **30 Laws of UX** from [lawsofux.com](https://lawsofux.com/) by Jon Yablonski.

## What it does

- **`/ux-review`** — Scans your frontend files (HTML/CSS/JS/React/Vue/Svelte) and checks them against 30 UX laws. Reports violations with file:line references and concrete fix suggestions.
- **`/ux-law [name]`** — Look up any UX law by name. Shows description, key takeaways, frontend code implications, and a code review checklist.
- **UX Reviewer Agent** — Automatically activates when you work on frontend tasks, providing UX-aware suggestions.
- **Auto-hints** — Gentle reminders about relevant UX laws when you write/edit frontend files.

## Install

```bash
# From marketplace (when published)
npx claude-code plugins add laws-of-ux

# Local install
claude plugins add /path/to/laws-of-ux
```

## Laws covered (30)

### Heuristics
Aesthetic-Usability Effect, Choice Overload, Fitts's Law, Hick's Law

### Cognitive
Chunking, Cognitive Bias, Cognitive Load, Flow, Miller's Law, Paradox of Active User, Selective Attention, Serial Position Effect, Von Restorff Effect, Working Memory

### Gestalt
Law of Common Region, Law of Proximity, Law of Prägnanz, Law of Similarity, Law of Uniform Connectedness, Mental Model

### Principles
Doherty Threshold, Goal-Gradient Effect, Jakob's Law, Occam's Razor, Pareto Principle, Parkinson's Law, Peak-End Rule, Postel's Law, Tesler's Law, Zeigarnik Effect

## Code Patterns

The plugin includes 9 code pattern files with concrete CSS/HTML/JS rules:

| Pattern File | What it checks |
|---|---|
| Touch Targets | Min 44x44px, spacing, click areas |
| Navigation & Choices | Max 7 nav items, progressive disclosure |
| Content Grouping | Proximity ratios, visual regions, consistency |
| Information Density | Form chunking, input masks, table columns |
| Response Time | 400ms threshold, skeletons, animations |
| Visual Hierarchy | CTA distinction, contrast ratios, typography |
| User Expectations | Standard patterns, input types, Postel's Law |
| Motivation & Progress | Progress bars, Zeigarnik, Peak-End |
| Simplicity | Occam's Razor, Tesler's Law, smart defaults |

## Architecture

Built as **agentic RAG** — the agent navigates a section hierarchy, loading only relevant laws into context (~300 lines at a time), similar to [fpf-simple-skill](https://github.com/CodeAlive-AI/fpf-simple-skill).

## Credits

- **UX Laws**: [Jon Yablonski](https://jonyablonski.com/) — [lawsofux.com](https://lawsofux.com/)
- **Plugin**: explosovebit

## License

MIT
