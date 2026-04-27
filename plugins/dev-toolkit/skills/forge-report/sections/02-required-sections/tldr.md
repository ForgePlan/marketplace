# TL;DR — Required first block (italic blockquote at top)

Full rules in `00-anchors/tldr-format.md`. Quick reference here:

## Format

```markdown
> _<What changed in human language>. <What user needs to do or "no action needed">.
> <One risk or dependency if relevant.>_
```

That's it. Italic prose inside a blockquote, 1-3 sentences.

## Position

Very first block of the report, **before** any heading.

## Length

- Most cases: 1-2 sentences (30-60 words)
- Long incidents (`incident-summary`): up to 4 sentences
- Over 80 words → split or simplify

## Three slots inside

| Slot | Content | Required? |
|------|---------|-----------|
| 1 | What changed | Yes |
| 2 | What user does | Yes (or explicit "no action needed") |
| 3 | Biggest risk / dependency | Optional, omit if none |

## When TL;DR can be skipped

- Pure Q&A response (no actions taken)
- Single-file edit
- Response is already <10 lines

In those cases — write the answer directly.
