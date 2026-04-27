# 02-required-sections — Mandatory blocks for every report

These sections appear in **every** template. Their job is to surface
what's normally invisible: boundaries, risks, future state.

## Files

| File | Section | Why mandatory |
|------|---------|---------------|
| `tldr.md` | TL;DR | Reader scans first 3 lines |
| `not-done.md` | What was NOT done | Confirms boundaries |
| `reversibility.md` | What can be rolled back | Trust + safety |
| `drift-risks.md` | What may decay over time | Future maintenance |
| `next-steps.md` | What user does next | Pickup pointer |

## Why "required" matters

Optional sections get skipped, then forgotten. **Mandatory sections force the author to think about them**, even if the answer is "—" (none).

A 5-line "Not done: nothing intentionally skipped" is more useful than silence — it confirms the author *thought* about boundaries.

## Compactness rule

Required sections should be compact. If a section needs >5 lines, consider splitting into a dedicated section under the type-specific body.
