# content-quality

Anti-patterns to avoid when building agentic RAG skills, with concrete bad/good examples.
These are lessons learned from building fpf-knowledge (224 sections) and ux-laws (30 laws).

## Contents

| File | Description | Lines |
|------|-------------|-------|
| [anti-patterns.md](anti-patterns.md) | 5 concrete anti-patterns with bad vs good code examples | 50 |
| [quality-checklist.md](quality-checklist.md) | Pre-publish checklist for RAG skills | 36 |

## The core quality principle

Each file should do exactly one thing. A reader (human or agent) should be able to
describe the file's purpose in one sentence. If you need "and" — split the file.

A section should have a single coherent theme. If a section's _index.md lists files
that cover unrelated topics, the section boundaries are wrong.
