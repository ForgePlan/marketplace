# Description Field Format

## Structure

The `description:` field answers three questions in order:
1. **What is this?** — one-line identity
2. **When to use it?** — activation condition
3. **What triggers it?** — explicit trigger phrases

```yaml
description: >
  Agentic RAG methodology for Claude Code skills — how to structure large knowledge
  bases using SKILL.md as a thin router and 30-50 line content files.
  Use when building a skill with >300 lines or >5 distinct topics.
  Triggers on: agentic RAG, SKILL.md structure, skill authoring methodology.
```

## Length

- Single-purpose skill: 1-3 sentences
- Multi-purpose skill (like fpf-knowledge): up to 6 sentences
- Do not write a paragraph. The description is a matching signal, not documentation.

## Tone

- Factual, no marketing language
- "Use when X" not "This amazing skill helps you..."
- Include explicit "Triggers on:" list at the end — it reinforces semantic matching

## What to include

- What the skill covers (domain noun)
- When to activate (use-case verb phrase)
- Explicit trigger phrases as a comma-separated "Triggers on:" suffix

## What NOT to include

- Author name (use `author` field in plugin.json)
- Version history ("v1.0.0: added X")
- Internal notes or TODOs
- Markdown formatting (the field is plain text / block scalar)
