---
name: fp-cookbook
description: >
  Practical cookbook of forgeplan CLI recipes — 25+ task-oriented how-to guides answering
  "how do I do X?" for forgeplan CLI users and Claude as an assistant. Use when you need
  a concrete command sequence, a worked example, or a Common errors table for: PRD creation,
  Evidence authoring, workflow cycles, plugin versioning, AI-agent dispatch, troubleshooting
  anomalies, or CLI/MCP quick reference.

  Практическая поваренная книга рецептов forgeplan CLI — 25+ пошаговых рецептов для
  пользователей forgeplan. Применяй когда нужна конкретная команда, рабочий пример
  или таблица ошибок для PRD, Evidence, рабочего цикла, плагинов или агентов.

triggers:
  - how do I create a PRD
  - how to activate evidence
  - forgeplan recipe
  - forgeplan how to
  - forgeplan CLI example
  - forgeplan getting started
  - R_eff low
  - evidence body convention
  - link direction
  - version bump plugin
  - agent dispatch pattern
  - forgeplan anomaly
  - cli cheatsheet
  - mcp quick reference
  - как создать PRD
  - forgeplan рецепт
  - как начать работу с forgeplan
  - polyglot monorepo
  - rust go typescript python
  - worktree cold start
  - language_stack
  - affected_files frontmatter
---

# fp-cookbook — Practical Forgeplan Recipes

25+ task-oriented recipes. Each recipe: **Цель → Команда → Пример → Common errors → Refs**.
Complements `forgeplan-methodology` (what-is). This skill answers **how to**.

## When to use this skill

| Signal | Action |
|--------|--------|
| Need a concrete command sequence | Use this cookbook |
| Need a worked example with real output | Use this cookbook |
| Want Common errors / fix table | Use this cookbook |
| Need to understand *what* PRD/ADR/Evidence *is* | Use `forgeplan-methodology` instead |
| Diagnosing a specific anomaly by number | Use `troubleshooting` section |

## When NOT to use

- Deep FPF reasoning → use `fpf-knowledge`
- Forgeplan *concepts* (what is R_eff, what is congruence_level) → use `forgeplan-methodology`
- Agentic RAG skill authoring → use `agentic-rag`

## How to navigate

1. Match your need to a section below.
2. Open the section `_index.md` — it lists all recipe files with descriptions.
3. Read only the one recipe you need (~40-80 lines).
4. Apply the command sequence.

## Section INDEX

| # | Section | Files | When to use |
|---|---------|:-----:|-------------|
| 01 | [getting-started](sections/getting-started/_index.md) | 3 | Install CLI, init workspace, first PRD end-to-end |
| 02 | [recipes-prd](sections/recipes-prd/_index.md) | 4 | Create / validate / activate PRDs; FR vs Goals; link rules |
| 03 | [recipes-evidence](sections/recipes-evidence/_index.md) | 3 | Evidence body pattern; informs vs based_on; R_eff ≥ 0.9 |
| 04 | [recipes-workflow](sections/recipes-workflow/_index.md) | 8 | Full SDLC cycle; wave dispatch; dogfood activate discipline |
| 05 | [recipes-multiplugin](sections/recipes-multiplugin/_index.md) | 3 | Version-bump policy; catalog discipline; cross-plugin supersedes |
| 06 | [recipes-ai-pair](sections/recipes-ai-pair/_index.md) | 3 | Profile A/B/C/D selection; task dispatch; sentinel conventions |
| 07 | [troubleshooting](sections/troubleshooting/_index.md) | 5 | Sprint A-O anomalies: cascade, EVID draft, FSM, footguns |
| 08 | [cli-cheatsheet](sections/cli-cheatsheet/_index.md) | 2 | One-page CLI + MCP quick reference |
| 09 | [polyglot](sections/polyglot/_index.md) | 5 | Rust+Go+TypeScript+Python monorepos: CLAUDE.md cascade, AC gates, worktree cold start, dispatch bucketing, tester scoping |

## Real artifact cross-references (FR-005)

Recipes reference: PRD-026, PRD-038, PRD-039, PRD-040, PRD-041,
EVID-064, EVID-068, ADR-005, mm-evid-body-convention, mm-pipeline-anomalies.
