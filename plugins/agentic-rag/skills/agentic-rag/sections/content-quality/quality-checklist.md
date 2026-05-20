# Pre-publish Quality Checklist

## Structure checks

- SKILL.md is ≤ 150 lines — navigation only, no knowledge content
- Every section directory has an `_index.md`
- Every file listed in `_index.md` actually exists on disk
- Every path in the SKILL.md INDEX table resolves to a real `_index.md`
- No broken links (file names match exactly, case-sensitive)

## File size checks

- No content file exceeds 70 lines
- No `_index.md` exceeds 40 lines
- Total plugin LOC is within budget (target: 500-700 lines for MVP)

## Content checks

- Each content file covers exactly one topic (describable in one sentence)
- No topic appears in full in more than one file (links OK, duplication not)
- At least one concrete example per concept — not just definitions
- Section boundaries do not overlap

## Frontmatter checks

- SKILL.md has `name:` and `description:` fields
- `description:` includes "Use when" and "Triggers on:"
- `triggers:` list has ≥ 5 phrases covering the main activation vocabulary
- Language variants included for multilingual target audiences

## Cross-reference checks

- At least one reference to a real living example in the marketplace
- References point to real paths that exist on disk — not aspirational paths
