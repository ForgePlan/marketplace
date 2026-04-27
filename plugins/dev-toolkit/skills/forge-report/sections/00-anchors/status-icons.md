# Status Icons — Single Legend

**Use these icons consistently across all reports. Don't invent new ones.**

| Icon | Meaning | Example |
|------|---------|---------|
| ✅ | Done — verified successful | `✅ PR #24 merged, CI green` |
| 📝 | Modified — files edited (vs created) | `📝 README.md (line 42, 1 char)` |
| ⏳ | Pending — in progress or queued | `⏳ Deploy starting, ETA 5m` |
| ⚠️ | Risk / warning — works but watch out | `⚠️ Rate limit at 80% capacity` |
| ❌ | Failed — explicit failure to record | `❌ Migration rollback required` |
| 🔵 | Info — context, no action needed | `🔵 Total tokens used: 6078` |
| ⚪ | Not done — intentional, not forgotten | `⚪ Skipped UI tests (no display in CI)` |
| ➡️ | Next step — action user should take | `➡️ Run gh secret set TOKEN ...` |

## Confidence labels (separate system)

Confidence uses a **distinct traffic-light set** to avoid colliding with status icons:

| Icon | Meaning | Example |
|------|---------|---------|
| 🟢 | High — directly verified | `🟢 PR merged (gh pr view confirmed)` |
| 🟡 | Medium — inferred, not tested | `🟡 Likely takes 2 min (similar to last sync)` |
| 🔴 | Assumed — estimate or prediction | `🔴 4-6 hours to build (gut estimate)` |

See `confidence-levels.md` for when to use each.

## Rules

1. **One icon per row** — don't combine like `✅⚠️`.
2. **Icon goes first** — `✅ Item` not `Item ✅`.
3. **Don't redecorate** — no 🎉🚀🔥 unless there's a real reason.
4. **No icon = neutral statement** — that's also fine.

## Anti-patterns

- ❌ Using `✅` for "I tried" — only for verified.
- ❌ Using `⚠️` for everything mildly uncertain — reserve for real risk.
- ❌ Mixing emojis for the same concept (`✓` vs `✅`).

## Why these 8 status + 3 confidence

Status icons cover state:
- Result: ✅ ❌
- Change: 📝
- In motion: ⏳
- Caution: ⚠️
- Context: 🔵
- Boundaries: ⚪
- Action: ➡️

Confidence icons (🟢🟡🔴) live in a parallel "traffic-light" namespace — never mix them with status icons in the same column.

Adding more icons makes the legend forgettable. If you feel the urge to invent one — try harder with the existing 11.

## Section-header convention

Some templates use icons as section markers, e.g. `═══ ✅ Created ═════`. In that context the icon **groups** items by category (here: completed items), it does NOT mean "this heading is verified". Treat the icon as a label, not a status.
