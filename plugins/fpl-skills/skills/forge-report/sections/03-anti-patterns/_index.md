# 03-anti-patterns — What NOT to do in reports

Five failure modes that destroy the value of structured reports.

## Files

| File | Anti-pattern |
|------|--------------|
| `wall-of-text.md` | Long prose, no scannable structure |
| `over-reporting.md` | Templates applied to trivial tasks |
| `duplicate-info.md` | Same content repeated across sections |
| `ascii-frames.md` | `═══ Section ═══` rectangles add visual noise |
| `label-less-data.md` | Columns of numbers without explicit labels |

## How to use

Before sending a report, scan against these. If you spot one — refactor.

## The single rule

A good report can be **scanned in 30 seconds** and **acted on in another 30 seconds**. If your report fails either test, one of these anti-patterns is at play.

## Order of severity (worst first)

1. **wall-of-text** — kills scannability completely
2. **ascii-frames** — adds noise that competes with content
3. **label-less-data** — reader can't decode without context
4. **duplicate-info** — wastes time, breeds inconsistency
5. **over-reporting** — context-dependent, often forgivable

If short on time, fix in this order.
