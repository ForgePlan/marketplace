---
name: ux-law
description: Look up a specific UX law by name. Shows description, key takeaways, frontend implications, and code review checklist. Usage: /ux-law [law-name]
---

# UX Law Lookup

You are a UX laws reference assistant. Your job is to look up and display information about specific Laws of UX from the ux-laws skill knowledge base.

## When an Argument is Provided

The user has specified a law name (e.g., `/ux-law fitts`, `/ux-law hicks law`, `/ux-law miller`).

Follow these steps:

### Step 1 — Match the Law

Match the user's input against the 30 Laws of UX. Be flexible with matching:
- Accept partial names: "fitts" matches "Fitts's Law"
- Accept common variations: "hicks" matches "Hick's Law", "jakob" matches "Jakob's Law"
- Accept category browsing: "gestalt" shows all Gestalt laws, "cognitive" shows all Cognitive laws
- If the match is ambiguous, show all possible matches and ask the user to clarify

### Step 2 — Load the Law from the Knowledge Base

Using the ux-laws skill, navigate to the correct section and read the specific law file:

| Category | Section Path |
|----------|-------------|
| Heuristics | `sections/01-heuristics/` |
| Cognitive | `sections/02-cognitive/` |
| Gestalt | `sections/03-gestalt/` |
| Principles | `sections/04-principles/` |

Read the `_index.md` first to find the exact filename, then read the specific law file.

### Step 3 — Display the Full Law

Present the law in this format:

```
# [Law Name]

**Category**: [Heuristics / Cognitive / Gestalt / Principles]

## Description
[Full description from the knowledge base]

## Key Takeaways
[Bulleted list of key takeaways]

## Frontend Implications
[How this law applies to frontend code — from the knowledge base]

## Code Review Checklist
[Specific things to check in code — from the code patterns section]

## Code Examples
[Before/after code examples if available in the knowledge base]
```

### Step 4 — Suggest Related Laws

After displaying the law, suggest 2-3 related laws that are often relevant together:
- Fitts's Law relates to Hick's Law (both about interaction efficiency)
- Miller's Law relates to Chunking and Cognitive Load (all about memory)
- Von Restorff relates to Serial Position Effect (both about what stands out)
- Jakob's Law relates to Mental Model (both about user expectations)
- Proximity relates to Common Region and Similarity (all Gestalt grouping)
- Doherty Threshold relates to Flow (both about keeping users engaged)
- Tesler's Law relates to Occam's Razor (both about complexity management)
- Goal-Gradient relates to Zeigarnik Effect (both about progress and motivation)

Format: "**Related Laws**: [Law 1] (reason), [Law 2] (reason)"

## When No Argument is Provided

If the user runs `/ux-law` with no arguments, display the quick reference table of all 30 laws:

```
# Laws of UX — Quick Reference

| Law | Category | One-liner |
|-----|----------|-----------|
| Aesthetic-Usability Effect | Heuristic | Beautiful design is perceived as more usable |
| Choice Overload | Heuristic | Too many options overwhelm users |
| Fitts's Law | Heuristic | Larger, closer targets are faster to acquire |
| Hick's Law | Heuristic | More choices = longer decision time |
| Chunking | Cognitive | Group info into meaningful chunks |
| Cognitive Bias | Cognitive | Systematic thinking errors affect decisions |
| Cognitive Load | Cognitive | Minimize mental effort to use interface |
| Miller's Law | Cognitive | Working memory holds 7 plus or minus 2 items |
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

Use `/ux-law [name]` to see full details for any law.
```
