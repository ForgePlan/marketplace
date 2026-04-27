# Next steps — Required section

Tell the reader: **what should happen next, in what order, by whom**.

## Why this matters

The end of one task is rarely the end of the work. Without explicit "next steps":
- User has to re-derive context to figure out what to do
- Future-you (in next session) doesn't know where to pick up
- Hand-offs break at agent/team boundaries

This section is the **pickup pointer** for resumption.

## Format

```
═══ ➡️ Next steps ══════════════════════════════════════════════
  1. <action>     <who>     <when>
  2. <action>     <who>     <when>
  3. <action>     <who>     <when>
```

## Concrete examples

```
1. Test /report on a real task           you           today
2. Update marketplace README             me            after merge
3. Bump dev-toolkit dependents           none          when other plugins
                                                       reference forge-report
```

## Three types of "next"

| Type | Example | Notes |
|------|---------|-------|
| **Immediate** | "Run smoke test" | Within minutes-hours |
| **Soon** | "Add to CI" | Within days |
| **Conditional** | "When X happens, do Y" | Pickup trigger |

Mix these — but always order by urgency.

## When OK to skip

If task is **fully self-contained and final**:
- Standalone Q&A
- Simple lookup
- Confirmation-only response

Then skip. But check honestly — most tasks have at least "verify it worked".

## Pickup line for future sessions

If this report will outlive the conversation, add at the end:

```
➡️ Future session pickup: open NOTE-003 → see roadmap → pick PRD-014
```

A single line that lets a fresh Claude restart effectively.
