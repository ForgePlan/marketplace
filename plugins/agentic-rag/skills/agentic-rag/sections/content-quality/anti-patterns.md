# Anti-patterns — Quick Reference

5 anti-patterns to avoid when building agentic RAG skills.

For detailed bad/good pair examples with "why" commentary, see
[references/anti-patterns/](references/anti-patterns/).

## AP-1: Wall of text

Single file with 300+ lines. Agent loads all of it even when 10% is relevant.
Fix: split into focused files (30-50 lines each) with a `_index.md` router.

## AP-2: Duplicate content

Same definition appears in two files. Files diverge over time.
Fix: one canonical owner; other files cross-reference with a one-liner.

## AP-3: Unclear section boundaries

Two sections cover overlapping topics — agent cannot route reliably.
Fix: each section gets a one-sentence ownership statement; zero overlap.

## AP-4: Missing _index.md

Section directory has files but no router. Content is unreachable.
Fix: every section directory must have `_index.md` listing all files.

## AP-5: Router becoming knowledge

SKILL.md grows to 400 lines of embedded definitions.
Fix: SKILL.md is navigation only (≤150 lines); knowledge lives in sections/.
