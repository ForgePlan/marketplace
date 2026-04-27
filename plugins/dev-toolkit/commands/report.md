---
name: report
description: "Generate a structured report for the recent work — pick template (build/audit/decision/incident/migration), apply forge-report skill conventions, output scannable summary with TL;DR, what's done, not-done, reversibility, drift risks, and next steps."
---

# /report — Structured Summary of Recent Work

You are generating a **structured report** for the user about recent multi-step work in this conversation.

## Step 1 — Load the forge-report skill

Read the skill router: `plugins/dev-toolkit/skills/forge-report/SKILL.md`

If the skill is not found at that path (e.g. user installed dev-toolkit globally), it should be auto-loaded from the installation. Don't fabricate format — always pull from the skill.

## Step 2 — Pick the right template

Scan the conversation for the dominant task type. Use this decision tree:

1. **Created/built something new** (PR, files, feature, plugin) → `build-summary`
2. **Reviewed/audited existing code** (security, architecture, quality) → `audit-summary`
3. **Made a product/architecture decision** (chose between alternatives, recorded ADR) → `decision-summary`
4. **Debugged or fixed an incident** (broken pipeline, prod issue, mysterious bug) → `incident-summary`
5. **Refactored or migrated** (framework upgrade, restructure, schema change) → `migration-summary`

If multiple apply, pick the one whose **next step** is most actionable for the user.

If none apply (just Q&A, explanation, single edit) — say so:
> "Recent work doesn't meet structured-report criteria. Here's a brief summary instead: ..."

## Step 3 — Read the template + required sections

For the chosen template:
- `sections/01-templates/<template>.md` — type-specific structure
- `sections/02-required-sections/` — TL;DR, not-done, reversibility, drift-risks, next-steps (all mandatory)
- `sections/00-anchors/` — status icons, TL;DR rules, confidence labels

## Step 4 — Generate the report

Apply the template **strictly**:

- TL;DR at the very top, 1-3 lines, ≤80 chars per line
- Use single-legend status icons (✅⏳⚠️❌🔵⚪➡️) consistently
- All 5 required sections present (use "—" if literally nothing applies)
- Confidence labels (✅High/🟡Medium/⚠️Assumed) on uncertain claims
- Cycle metadata at bottom (tool calls, files, time)

## Step 5 — Self-check against anti-patterns

Before sending, scan the report against:
- `sections/03-anti-patterns/wall-of-text.md` — break prose into structure
- `sections/03-anti-patterns/over-reporting.md` — if task was tiny, downscale to inline summary
- `sections/03-anti-patterns/duplicate-info.md` — collapse repeated facts

## Step 6 — Output

Send the report. Don't add "Here's your report:" preamble — the structure is self-evident.

## Notes

- This command is **explicit** — user invoked `/report`, so always generate (don't skip even if task was small; user asked).
- For automatic generation (without explicit `/report`), the global CLAUDE.md rule decides — see `~/.claude/CLAUDE.md` "Structured Reports" section.
- If the conversation has no multi-step work to report on, say so honestly — do not fabricate content.
