[English](README.md) | [Русский](README-RU.md)

# Laws of UX -- Claude Code Plugin

Catch UX violations in your frontend code before they reach users. Reviews HTML/CSS/JS/React/Vue/Svelte against 30 research-backed UX laws.

## Quick Start

```bash
claude plugins add laws-of-ux        # install from marketplace
/ux-review                            # scan current project
/ux-law fitts                         # look up any law
```

## Usage Examples

### /ux-review -- scan your project

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

### /ux-law -- look up any law by name

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

## What's Included

| Component | Description |
|-----------|-------------|
| `/ux-review` | Scans frontend files, reports violations with file:line and fix suggestions |
| `/ux-law [name]` | Look up any UX law -- description, takeaways, code checklist |
| `ux-reviewer` agent | Activates during frontend tasks, provides UX-aware suggestions |
| `PostToolUse` hook | Auto-hints relevant UX laws when you write/edit frontend files |
| `ux-laws` skill (KB) | 30 laws + 9 code pattern files, loaded via agentic RAG |

## 30 Laws by Category

| Category | Laws |
|----------|------|
| Heuristics | Aesthetic-Usability Effect, Choice Overload, Fitts's Law, Hick's Law |
| Cognitive | Chunking, Cognitive Bias, Cognitive Load, Flow, Miller's Law, Paradox of Active User, Selective Attention, Serial Position Effect, Von Restorff Effect, Working Memory |
| Gestalt | Law of Common Region, Law of Proximity, Law of Pragnanz, Law of Similarity, Law of Uniform Connectedness, Mental Model |
| Principles | Doherty Threshold, Goal-Gradient Effect, Jakob's Law, Occam's Razor, Pareto Principle, Parkinson's Law, Peak-End Rule, Postel's Law, Tesler's Law, Zeigarnik Effect |

### Code Patterns (9 files)

| Pattern | What it checks |
|---------|---------------|
| Touch Targets | Min 44x44px, spacing, click areas |
| Navigation & Choices | Max 7 nav items, progressive disclosure |
| Content Grouping | Proximity ratios, visual regions, consistency |
| Information Density | Form chunking, input masks, table columns |
| Response Time | 400ms threshold, skeletons, animations |
| Visual Hierarchy | CTA distinction, contrast ratios, typography |
| User Expectations | Standard patterns, input types, Postel's Law |
| Motivation & Progress | Progress bars, Zeigarnik, Peak-End |
| Simplicity | Occam's Razor, Tesler's Law, smart defaults |

## Credits

UX Laws by [Jon Yablonski](https://jonyablonski.com/) -- [lawsofux.com](https://lawsofux.com/)

## License

MIT
