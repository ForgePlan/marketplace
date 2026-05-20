# Anti-Pattern: Duplicate Content

## What it is

The same concept is fully explained in two or more files. One section defines
"Hick's Law" in detail; another section re-defines it from scratch.

## Why it's bad

- Double context cost — both files load when either topic triggers
- Divergence risk: files drift out of sync over time, producing contradictions
- Claude picks whichever version appears first, giving non-deterministic answers
- Edits must be applied in two places, creating maintenance debt

## How to detect

```
grep -r "Hick" sections/ | grep -v "_index"
```
If the same term appears with substantive content in 3+ files, you likely have duplication.

## How to fix

1. Pick one file as the **owner** of the definition (the canonical source)
2. Replace all other copies with a one-line cross-reference + local-only content
3. Rule: a file may _reference_ a topic it doesn't own; it may not _define_ it twice

## See also

- `bad.md` — two files that both fully define the same law
- `good.md` — canonical owner file + lightweight cross-reference
