# Writing Triggers

## The triggers field

`triggers:` is a YAML list of phrases that activate the skill. Use natural language
phrases, not single keywords.

```yaml
triggers:
  - agentic RAG
  - SKILL.md structure
  - how to write a skill
  - knowledge base design
  - навык agentic RAG       # Russian variant
  - структура SKILL.md      # Russian variant
```

## EN/RU bilingual rule

Add Russian variants when target audience includes Russian speakers.
Place EN triggers first, then RU. Both activate the same skill.

`agentic-rag` and `fpf-knowledge` use bilingual triggers.
`ux-laws` is English-only (different target audience).

## Trigger specificity

**Too broad** — fires on unrelated queries:
```yaml
triggers:
  - skill        # matches "do you have skill in Python?"
  - knowledge    # matches almost anything
```

**Too narrow** — never fires:
```yaml
triggers:
  - agentic retrieval augmented generation methodology for SKILL.md
```

**Correct** — specific to intent, broad enough to catch variants:
```yaml
triggers:
  - agentic RAG
  - SKILL.md structure
  - how to write a large Claude Code skill
```

## disable-model-invocation

Add `disable-model-invocation: true` for pure knowledge stores. The agent should
read files and answer without a new model call. Command files should NOT use this.
