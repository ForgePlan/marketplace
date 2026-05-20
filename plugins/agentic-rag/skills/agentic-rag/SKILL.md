---
name: agentic-rag
description: >
  Agentic RAG methodology for Claude Code skills — how to structure large knowledge bases
  using SKILL.md as a thin router, sections/_index.md as a table of contents, and
  30-50 line content files as the actual knowledge. Use when building a skill with
  >300 lines or >5 distinct topics, or when users ask about SKILL.md structure,
  sections pattern, skill authoring methodology, knowledge base design, or how to
  write a large Claude Code skill.

  Методология agentic RAG для навыков Claude Code — как структурировать большие базы
  знаний, используя SKILL.md как тонкий роутер, sections/_index.md как оглавление и
  файлы по 30-50 строк как реальные знания. Применяй когда навык >300 строк или
  охватывает >5 тем.

triggers:
  - agentic RAG
  - SKILL.md structure
  - sections pattern
  - how to write a skill
  - skill methodology
  - knowledge base design
  - skill authoring
  - навык agentic RAG
  - структура SKILL.md
  - как писать скилл
---

# Agentic RAG — Methodology for Large Claude Code Skills

A meta-skill: how to build skills using the agentic RAG pattern.
Two live examples in this marketplace: `fpf-knowledge` (224 sections) and `ux-laws` (30 sections).

## When to use this skill

| Signal | Action |
|--------|--------|
| Skill body > 300 lines | Switch to agentic RAG |
| Knowledge spans > 5 distinct topics | Switch to agentic RAG |
| Users ask for one of many things at a time | Switch to agentic RAG |
| Skill is < 100 lines, one clear purpose | Keep it flat — do NOT over-engineer |
| Quick reference, cheat-sheet, single concept | Keep it flat |

## How to navigate

### Step 1 — Match your need to a section

| What you need | Go to |
|---|---|
| **Should I use RAG or flat?** — decision tree | [when-to-use](sections/when-to-use/_index.md) |
| **How to structure** SKILL.md + sections/ layout | [structure](sections/structure/_index.md) |
| **How to write description:** and triggers | [description-craft](sections/description-craft/_index.md) |
| **Anti-patterns** + bad vs good examples | [content-quality](sections/content-quality/_index.md) |
| **Copy-paste starter-kit** to fork right now | [templates](sections/templates/_index.md) |
| **Plugin vs standalone** distribution | [distribution](sections/distribution/_index.md) |

### Step 2 — Read _index.md, then the specific file

1. Open the `_index.md` of the target section — it lists files with descriptions.
2. Read only the specific file you need. Do NOT load entire sections at once.
3. Each content file is 30-50 lines — load only what is relevant.

### Step 3 — Apply the pattern

Write small files. Be the example you preach.

## Section INDEX

| # | Section | Files | When to use |
|---|---------|:-----:|-------------|
| 01 | [when-to-use](sections/when-to-use/_index.md) | 2 | Decide flat vs RAG, understand triggers |
| 02 | [structure](sections/structure/_index.md) | 2 | SKILL.md router pattern, _index.md format, file budget |
| 03 | [description-craft](sections/description-craft/_index.md) | 2 | Frontmatter triggers, EN/RU bilingual, model-invocation rules |
| 04 | [content-quality](sections/content-quality/_index.md) | 2 | Anti-patterns (5+) with bad/good examples |
| 05 | [templates](sections/templates/_index.md) | 3+ | Copy-pasteable starter-kit ready to fork |
| 06 | [distribution](sections/distribution/_index.md) | 2 | Plugin (marketplace) vs standalone (npx skills), CI sync |
