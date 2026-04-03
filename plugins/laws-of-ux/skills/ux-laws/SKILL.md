---
name: ux-laws
description: "Laws of UX knowledge base — 30 UX principles for frontend development. Use when reviewing UI code, building components, checking layout decisions, or learning about UX best practices. Triggers on: UX review, usability check, Fitts law, Hick law, Miller law, Jakob law, Gestalt, cognitive load, visual hierarchy, user experience, frontend review, layout review."
---

# Laws of UX — Knowledge Base

A collection of 30 UX laws and psychological principles that designers and developers should consider when building user interfaces. Based on https://lawsofux.com/ by Jon Yablonski.

## How to use

This skill functions as **agentic RAG** — the agent navigates the sections hierarchy, loading only the laws relevant to the current task.

### Step 1 — Identify the UX concern

| What you need to check | Start here |
|---|---|
| **Too many options** in UI (dropdowns, menus, nav) | [Heuristics](sections/01-heuristics/_index.md) → Hick's Law, Choice Overload |
| **Touch targets too small** or poorly spaced | [Heuristics](sections/01-heuristics/_index.md) → Fitts's Law |
| **Response time / loading** issues | [Principles](sections/04-principles/_index.md) → Doherty Threshold |
| **Too much info on screen** at once | [Cognitive](sections/02-cognitive/_index.md) → Miller's Law, Cognitive Load, Chunking |
| **Grouping / layout / spacing** problems | [Gestalt](sections/03-gestalt/_index.md) → Proximity, Similarity, Common Region, Uniform Connectedness, Prägnanz |
| **Users confused** by unfamiliar patterns | [Principles](sections/04-principles/_index.md) → Jakob's Law; [Gestalt](sections/03-gestalt/_index.md) → Mental Model |
| **Visual hierarchy** / what stands out | [Cognitive](sections/02-cognitive/_index.md) → Von Restorff Effect, Serial Position Effect, Selective Attention |
| **Forms too long** or complex | [Principles](sections/04-principles/_index.md) → Tesler's Law, Parkinson's Law |
| **User motivation / progress** | [Principles](sections/04-principles/_index.md) → Goal-Gradient Effect, Zeigarnik Effect, Peak-End Rule |
| **Input handling** / error tolerance | [Principles](sections/04-principles/_index.md) → Postel's Law |
| **Simplicity vs. complexity** trade-off | [Principles](sections/04-principles/_index.md) → Occam's Razor, Tesler's Law, Pareto Principle |
| **Onboarding / first-time users** | [Cognitive](sections/02-cognitive/_index.md) → Paradox of Active User, Working Memory |
| **Overall UX review** | Read [Code Patterns](sections/05-code-patterns/_index.md) for all code-level checks |

### Step 2 — Read the _index.md, then the specific law

1. Open the `_index.md` of the target section — it lists all laws with one-line summaries.
2. Read only the specific law file you need.
3. For code review, always also check `sections/05-code-patterns/` for actionable rules.

### Step 3 — Apply to code

When reviewing frontend code:
1. Identify which UX laws are relevant to the component/page
2. Check the code patterns section for specific violations
3. Provide actionable recommendations with code examples

## Section INDEX

| # | Section | Laws | When to use |
|---|---------|:----:|-------------|
| 01 | [Heuristics](sections/01-heuristics/_index.md) | 4 | Decision time, target acquisition, response time, user perception |
| 02 | [Cognitive](sections/02-cognitive/_index.md) | 10 | Memory limits, attention, learning, cognitive biases |
| 03 | [Gestalt](sections/03-gestalt/_index.md) | 6 | Visual grouping, layout, element relationships |
| 04 | [Principles](sections/04-principles/_index.md) | 10 | Design trade-offs, simplicity, user motivation, input handling |
| 05 | [Code Patterns](sections/05-code-patterns/_index.md) | — | Concrete code-level checks mapped to UX laws |

## Quick Reference — All 30 Laws

| Law | Category | One-liner |
|-----|----------|-----------|
| Aesthetic-Usability Effect | Heuristic | Beautiful design is perceived as more usable |
| Choice Overload | Heuristic | Too many options overwhelm users |
| Fitts's Law | Heuristic | Larger, closer targets are faster to acquire |
| Hick's Law | Heuristic | More choices = longer decision time |
| Chunking | Cognitive | Group info into meaningful chunks |
| Cognitive Bias | Cognitive | Systematic thinking errors affect decisions |
| Cognitive Load | Cognitive | Minimize mental effort to use interface |
| Miller's Law | Cognitive | Working memory holds 7±2 items |
| Paradox of Active User | Cognitive | Users skip manuals, learn by doing |
| Selective Attention | Cognitive | Users filter out irrelevant info |
| Serial Position Effect | Cognitive | First and last items remembered best |
| Von Restorff Effect | Cognitive | Distinctive items stand out in memory |
| Working Memory | Cognitive | Limited capacity for active info |
| Flow | Cognitive | Optimal state of focused engagement |
| Law of Common Region | Gestalt | Shared boundaries group elements |
| Law of Proximity | Gestalt | Near elements are perceived as grouped |
| Law of Prägnanz | Gestalt | We simplify complex shapes mentally |
| Law of Similarity | Gestalt | Similar elements are seen as related |
| Law of Uniform Connectedness | Gestalt | Connected elements are perceived as related |
| Mental Model | Gestalt | Users have prebuilt expectations |
| Doherty Threshold | Principle | System response < 400ms keeps flow |
| Goal-Gradient Effect | Principle | Motivation increases near the goal |
| Jakob's Law | Principle | Users expect your site to work like others |
| Occam's Razor | Principle | Simplest solution is usually best |
| Pareto Principle | Principle | 80% of effects from 20% of causes |
| Parkinson's Law | Principle | Tasks expand to fill available time |
| Peak-End Rule | Principle | Experiences judged by peak + end moments |
| Postel's Law | Principle | Accept varied input, send strict output |
| Tesler's Law | Principle | Complexity can be moved but not removed |
| Zeigarnik Effect | Principle | Incomplete tasks are remembered better |
