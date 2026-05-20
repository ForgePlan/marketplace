# Anti-Pattern: Missing _index.md

## What it is

A section directory contains content files but has no `_index.md` router.
Claude navigates the skill by following pointers — without `_index.md`,
those files are invisible to the agent.

## Why it's bad

- Content is unreachable: Claude only reads what the navigation chain points to
- Files silently accumulate on disk but are never retrieved
- No way to know what content exists without reading every file manually
- SKILL.md cannot link to a section that lacks its router

## How to detect

```
find sections/ -type d | while read d; do
  [ ! -f "$d/_index.md" ] && echo "MISSING: $d/_index.md"
done
```

## How to fix

1. Create `_index.md` in every section directory
2. List each file with: filename, one-line description, approximate line count
3. Add the section to SKILL.md's INDEX table with a link to its `_index.md`

## See also

- `bad.md` — section directory with files but no index (and what Claude sees)
- `good.md` — same directory with a proper `_index.md` in place
