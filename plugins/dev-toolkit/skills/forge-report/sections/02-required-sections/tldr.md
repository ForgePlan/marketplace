# TL;DR — Required first block

Full rules in `00-anchors/tldr-format.md`. Quick reference here:

## Format

```
TL;DR: <what changed>. <action OR "no action">. <one risk if applicable>.
```

## Length: 1-3 lines, ≤80 characters per line.

**Exception**: `incident-summary` may use up to 4 lines when symptom + root cause + fix + prevention all need stating.

## Position: very first block, before any heading.

## Three slots

| Slot | Content | Required? |
|------|---------|-----------|
| 1 | What changed | Yes |
| 2 | What user does | Yes (or explicit "no action") |
| 3 | Biggest risk / dependency | Optional, omit if none |

## When TL;DR can be skipped

- Pure Q&A response (no actions taken)
- Single-file edit
- Response is already <10 lines

In those cases — write the answer directly.
