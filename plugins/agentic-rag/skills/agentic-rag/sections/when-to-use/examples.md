# Real Examples — Flat vs Agentic RAG

Two live examples in the ForgePlan marketplace show both scales of the pattern.

## Example 1 — fpf-knowledge (224 sections, large-scale RAG)

Path: `plugins/fpf/skills/fpf-knowledge/`

FPF is a full philosophical framework spanning 20+ parts (A–K) with hundreds of
sub-topics. No single query needs all 224 sections. The SKILL.md is a 149-line
router with a table mapping "thinking verb → section number". Each section has
an `_index.md` listing its files. Files are 50-65 lines each.

**Why RAG was correct here**: users ask "how do I decompose X?" — they need
Part A, not Parts D, F, G, H simultaneously. Loading everything wastes context.

## Example 2 — ux-laws (30 laws, medium-scale RAG)

Path: `plugins/laws-of-ux/skills/ux-laws/`

30 UX laws organized into 5 sections (heuristics, cognitive, gestalt, principles,
code-patterns). A frontend reviewer checking navigation choices needs Hick's Law
and Choice Overload — not Zeigarnik Effect or Peak-End Rule.

**Why RAG was correct here**: the skill covers 30 distinct topics. A user asking
about touch targets only needs Fitts's Law (36 lines), not the full 1,200-line corpus.

## Counter-example — a flat skill that should stay flat

A skill explaining "how to write a good git commit message" has one topic,
5-7 rules, and ~80 lines. It should be a single SKILL.md. Splitting it into
sections/ with _index.md adds navigation overhead with zero benefit.

**Rule of thumb**: if your knowledge base is a single narrative, keep it flat.
If it is a library with many independent entries, use RAG.
