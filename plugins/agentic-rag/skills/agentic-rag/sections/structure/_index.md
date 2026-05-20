# structure

How to build the three-layer agentic RAG structure: router (SKILL.md),
table-of-contents (_index.md), and content files.

## Contents

| File | Description | Lines |
|------|-------------|-------|
| [router-pattern.md](router-pattern.md) | SKILL.md as a navigation surface — rules, what to include, what to exclude | 42 |
| [file-budget.md](file-budget.md) | _index.md format, content file size budget, directory naming conventions | 38 |

## Three-layer mental model

```
SKILL.md          ← Layer 1: Router. Navigation only, no knowledge content.
  sections/
    topic/_index.md  ← Layer 2: TOC. Lists files in this section with descriptions.
    topic/file.md    ← Layer 3: Content. 30-50 lines of actual knowledge.
```

The agent reads Layer 1 to decide which section to open.
Then reads Layer 2 to decide which file to load.
Then reads Layer 3 to answer the question.
Total tokens per query: ~100-200 instead of the full corpus.
