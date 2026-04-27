---
name: forge-report
description: "Structured report formats for Claude. Use when finishing a multi-step task (≥5 tool calls, ≥3 files modified, multi-task TaskList, or cross-system effects like git push/PR/deploy). Triggers on: report, summary, summarise, отчёт, итоги, завершение задачи, build complete, audit complete, deployment complete, decision recorded, incident resolved, migration done. Provides 5 templates (build/audit/decision/incident/migration), anchor conventions (status icons, TL;DR, confidence), required sections (not-done, reversibility, drift-risks, next-steps), and anti-patterns. Not for simple Q&A or single-file edits."
license: MIT
---

# forge-report — Structured Report Formats

A library of templates and conventions for producing **clear, scannable, actionable** finishing reports after multi-step tasks. Designed for Claude Code agents.

## When to use this skill

Use when you finish a task that meets **≥2 of 4** criteria:

1. ≥5 tool calls in this turn
2. ≥3 files created or modified
3. TaskList with ≥3 items
4. Cross-system effect (git push, PR, deploy, external API call, secret added)

For smaller tasks → use plain prose. Don't over-report.

## How to use this skill (agentic RAG)

This skill is a **router**. Follow these steps:

### Step 1 — Pick the right template

| Task type | Template | Section file |
|---|---|---|
| Built/created something new | `build-summary` | `01-templates/build-summary.md` |
| Reviewed/audited code | `audit-summary` | `01-templates/audit-summary.md` |
| Made + recorded a product decision | `decision-summary` | `01-templates/decision-summary.md` |
| Debugged / resolved incident | `incident-summary` | `01-templates/incident-summary.md` |
| Refactored / migrated something | `migration-summary` | `01-templates/migration-summary.md` |

Don't see exact match? Pick the closest and adapt.

### Step 2 — Load the anchor conventions

Read these once per session (compact, ~30 lines each):

- `00-anchors/status-icons.md` — single legend for ✅⏳⚠️❌🔵⚪➡️
- `00-anchors/tldr-format.md` — TL;DR rules (1-3 lines, ≤80 chars)
- `00-anchors/confidence-levels.md` — when to mark High/Medium/Assumed

### Step 3 — Include required sections

Every report must include (load from `02-required-sections/`):

| Section | When | Why |
|---|---|---|
| TL;DR | Always, very top | Reader decides if they read further |
| Not done | Always, even if obvious | Confirms boundaries respected |
| Reversibility | When changes touch git/files/external | Trust + safety |
| Drift risks | When artefacts cross-reference each other | Prevents future bit-rot |
| Next steps | Always | Future-self / future-session pickup |

### Step 4 — Avoid anti-patterns

Before sending, scan against `03-anti-patterns/`:

- `wall-of-text.md` — break into bullets/tables
- `over-reporting.md` — small tasks don't need reports
- `duplicate-info.md` — say it once, link the rest

## Quick template skeleton

```
TL;DR: <1-3 lines, ≤80 chars per line>

═══ ✅ <What was done> ═══════════════════════════════════════════
  <items with What/Where/Status>

═══ ⚪ Not done (intentional) ════════════════════════════════════
  <items>

═══ 🔄 Reversibility ════════════════════════════════════════════
  Reversible: <items>
  Irreversible: <items or "none">

═══ ⚠️ Drift risks ═════════════════════════════════════════════
  <items with mitigation>

═══ ➡️ Next steps ══════════════════════════════════════════════
  1. <action>
  2. <action>

💰 Cycle: <tool calls / files / time>
```

## Cross-references

- Inside dev-toolkit: `/audit`, `/sprint`, `/recall` — sister utilities
- Marketplace: `forge-report` is the format that other dev-toolkit commands should output to

## Versioning

This skill is shipped with `dev-toolkit` plugin. Version moves together.
