# Anti-Pattern: Unclear Section Boundaries

## What it is

Two or more sections cover overlapping topics. Both claim ownership of the
same concept, causing the routing layer to give conflicting signals.

## Why it's bad

- Claude cannot reliably route between overlapping sections
- Users get different answers depending on which trigger phrase they use
- Adding content to either section risks doubling into the other's territory
- Future contributors cannot tell which section owns a new topic

## How to detect

Read each section's `_index.md` first sentence. If two sections could
plausibly describe the same user question, their boundaries are unclear.

```
# symptom: both sections list "triggers and frontmatter" as their topic
section-a/_index.md: "triggers and descriptions"
section-b/_index.md: "frontmatter, triggers, and activation rules"
```

## How to fix

1. Write a one-sentence ownership statement for each section
2. Test: does every topic belong unambiguously to exactly one section?
3. If two sections share a topic, merge them or rename to eliminate overlap

## See also

- `bad.md` — two sections with overlapping trigger/frontmatter responsibilities
- `good.md` — same content redistributed into non-overlapping sections
