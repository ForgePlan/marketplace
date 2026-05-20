# Anti-Pattern: Router Becoming Knowledge

## What it is

SKILL.md starts as a navigation file but gradually accumulates substantive
content — full definitions, lengthy explanations, code examples — until it
is both router and encyclopedia.

## Why it's bad

- SKILL.md loads on _every_ trigger, not just navigation triggers
- 400-line SKILL.md consumes 400 lines of context before Claude reads anything useful
- Router and content have different update frequencies — mixing them creates noise
- Sections become redundant when SKILL.md already answers the question

## How to detect

```
wc -l SKILL.md
```
Over 150 lines is a warning. Over 300 lines means content has leaked into the router.
Grep for paragraph-length text blocks, code fences, or full definitions.

## How to fix

1. Move all non-navigation content out of SKILL.md into section files
2. SKILL.md should contain: frontmatter + one-paragraph overview + INDEX table
3. INDEX table rows: `| topic | link to _index.md |` — nothing more

## See also

- `bad.md` — SKILL.md with 400 lines of embedded knowledge
- `good.md` — same skill as a 30-line pure router
