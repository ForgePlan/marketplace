# Confidence Levels — Mark facts vs assumptions

**Most bugs from Claude come from confidently stating assumptions.** Confidence labels separate verified facts from inference.

## Three levels — traffic-light icons

| Label | When to use | Example |
|-------|-------------|---------|
| 🟢 **High** | Verified by tool output (Read/Bash/test result) | `🟢 High: PR #24 merged (gh pr view returned state=MERGED)` |
| 🟡 **Medium** | Inferred from context, not directly tested | `🟡 Medium: workflow likely green (last 3 runs were green)` |
| 🔴 **Assumed** | Estimate, opinion, or unverified prediction | `🔴 Assumed: 4-6 hours to build (based on similar past tasks)` |

**Important**: confidence icons (🟢🟡🔴) are a **separate namespace** from status icons (✅📝⏳⚠️❌🔵⚪➡️). Never mix them in the same column or sentence.

## When to label

Apply confidence when:
- Stating **time estimates** ("X hours")
- Making **predictions** ("this will work / fail")
- Reporting **status** of things you didn't directly check
- Claiming **causation** ("X happened because Y")

Don't label when:
- Direct quote from tool output (already verified)
- Self-evident facts ("the file exists")
- Obvious inferences ("PR is green because all 3 checks pass")

## Format inline

```
🟢 High confidence — Workflow green (verified via gh run view 25020766130)
🟡 Medium — Likely takes 2 minutes (not measured, similar to last sync)
🔴 Assumed — Users will adopt by Q3 (no metrics yet)
```

## Format in tables

```
| Item | Status | Confidence |
|------|--------|------------|
| Repo created | ✅ | High |
| CI will work | 🟡 | Medium (untested with secret) |
| Adoption next month | ⚠️ | Assumed |
```

## Why this matters

Without labels, the reader can't tell:
- "It works" = verified or hoped?
- "Takes 5 min" = measured or guessed?
- "Safe to deploy" = tested in staging or based on dry-run?

A 5-line report with confidence labels is more useful than a 50-line report without.

## Anti-pattern

Don't sprinkle "I think" / "probably" / "maybe" everywhere — that's noise. Use the 3-label system instead. 1 explicit label > 5 hedged sentences.
