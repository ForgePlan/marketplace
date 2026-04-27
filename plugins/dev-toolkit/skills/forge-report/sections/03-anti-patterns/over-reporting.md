# Over-reporting — Anti-pattern

Applying full structured-report template to trivial tasks.

## Why it's bad

When **every** response is a structured report, the reports lose signal. A 30-line report for "fixed a typo" trains the user to skip the formal structure.

The whole point of a report template is that it **stands out** when shown.

## Bad

User: "Fix the typo in line 42"
Claude:
```
TL;DR: Typo "teh" → "the" fixed in line 42 of README.md.

═══ ✅ Created ══════════════════════════════════════════════════
  — (no new files)

═══ 🔵 Modified ════════════════════════════════════════════════
  README.md           Line 42                          1 char change

═══ 🔄 Reversibility ═══════════════════════════════════════════
  Reversible: git checkout README.md
  Irreversible: none

═══ ⚠️ Drift risks ════════════════════════════════════════════
  — (isolated typo fix)

═══ ➡️ Next steps ═════════════════════════════════════════════
  1. Review change

💰 Cycle: 2 calls · 1 file · <1 min
```

## Good

User: "Fix the typo in line 42"
Claude: "Fixed `teh` → `the` in README.md:42."

## When to apply structured report

Use the **2-of-4 trigger** from SKILL.md:
- ≥5 tool calls
- ≥3 files modified
- TaskList ≥3 items
- Cross-system effects

If at least 2 hit, use template. Otherwise — prose.

## Edge cases

- **User explicitly invoked `/report`** → use template (they asked).
- **Task started small but grew** → switch to template mid-flight.
- **Series of small tasks** → wrap with one summary at end of session.

## How to recover from over-reporting

If you feel "this report is overkill", trust the feeling. Cut to:
- One TL;DR-style line, OR
- A small block with what changed + verification.
