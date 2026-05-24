---
name: decay-watch
description: |
  Scan all active ADR artifacts for fired Revisit Triggers (Evidence Decay). Reports which triggers fired, which need human verification, which are stale because the ADR uses pre-Sprint-Z2 prose format. Use periodically (weekly + at session start) — keeps decisions from quietly going stale.

  Triggers: "decay watch", "/decay-watch", "проверь триггеры пересмотра", "stale ADR", "revisit trigger check", "evidence decay scan"
---

# /decay-watch — Revisit Trigger scanner

You scan all active ADR artifacts in the project's forgeplan workspace, parse their `Revisit Trigger` / `Compliance` sections, and report which triggers have fired.

## When to invoke

- **SessionStart** — `decay-reminder.sh` hook calls this automatically (silent if nothing fired).
- **Weekly** — user-initiated review.
- **Before merging a PR that touches an active ADR** — manual safety check.
- **Before activating a new ADR that supersedes an old one** — confirm the supersede is actually triggered.

## Procedure

### Step 1 — Enumerate active ADRs

```python
adrs = forgeplan_list(kind="adr", status="active")
```

For each ADR, fetch the full body:

```python
adr_body = forgeplan_get(id=adr.id)
```

### Step 2 — Parse Revisit Trigger / Compliance section

Look for parseable trigger syntax (Sprint Z2 format):

```
## Revisit Trigger (Evidence Decay) — MUST
- [ ] **Type**: date — <description>
- [x] **Type**: metric — <description>
- [ ] **Type**: event — <description>
```

OR

```
## Compliance / Revisit Trigger — MUST
- [x] **Type**: date — 2026-04-01
- [ ] **Type**: event — upstream #325 closes
```

Each line matches regex: `^- \[([ x])\] \*\*Type\*\*:\s*(date|metric|event)\s*[—\-]\s*(.+)$` (tolerates both em-dash `—` and en-dash `-` — editors with smart-typography off may normalise; the hook and guardian use the same character class).

### Step 3 — Classify each trigger

Three categories:

| Category | Detection | Action |
|---|---|---|
| **Already marked fired** | `[x]` checkbox | Report as FIRED, ADR should be superseded |
| **Date trigger past due** | `[ ]` AND type=date AND parseable date in past | Report as DATE-FIRED, suggest user mark `[x]` |
| **Needs human verification** | `[ ]` AND type=metric/event | Report as PENDING — ask user to check |
| **Pre-Sprint-Z2 format** | No `- [ ]` lines in section | Report as LEGACY-FORMAT — manual review needed |

### Step 4 — Output structured report

When invoked silently (by hook) — output ONLY if there are FIRED or DATE-FIRED items:

```
🔔 N ADR(s) with fired Revisit Triggers:
  - ADR-XXX: <one-line trigger description>
  - ADR-YYY: <one-line trigger description>
Run /decay-watch for details.
```

When invoked directly by user — output full report:

```markdown
## Decay Watch Report

### FIRED (immediate action needed)

- **ADR-XXX**: <title>
  - Trigger: <description>
  - Action: supersede with ADR-(XXX+1), OR uncheck with justification

### PENDING VERIFICATION

- **ADR-YYY**: <title>
  - Trigger (metric): <description>
  - Question for user: has this metric been crossed?

### LEGACY FORMAT (pre-Sprint Z2)

- **ADR-ZZZ**: <title>
  - Body uses prose Compliance section (pre-Z2 PRD-053 format)
  - Recommend manual review

### SUMMARY

- Total active ADRs: N
- Fired: N
- Pending verification: N
- Legacy format: N
```

## Hard rules

1. **Never auto-supersede an ADR.** Decay watch detects; orchestrator / user decides. Auto-action on Evidence Decay risks losing context.
2. **Never modify an ADR body.** Read-only skill.
3. **Date triggers MUST be parseable** — ISO 8601 (`2027-01-01`) or relative (`+6 months from creation`). Free-form text dates are reported as PENDING VERIFICATION.
4. **Silent mode is mandatory for hook use.** SessionStart hook must NOT spam every session if nothing fired. Only output when there's actually something to surface.

## What this skill does NOT do

- Does NOT supersede ADRs automatically (manual decision).
- Does NOT modify ADR bodies (no `[x]` marking on behalf of user).
- Does NOT enforce blocker behaviour — that's guardian agent Step 4b.
- Does NOT verify metrics (would need to know prod metrics, out of scope).

## Integration points

- **decay-reminder.sh hook** (`hooks/decay-reminder.sh`) — calls this skill silently at SessionStart.
- **guardian agent Step 4b** — calls this skill before rendering pre-activation verdict; if any FIRED triggers for ADRs linked to the artifact under review → BLOCKER.
- **`/forge-cycle`** — could optionally call before phase advance (not in Sprint Z2 scope).

## References

- PRD-053 (this Sprint Z2 scope)
- PRD-052 / Sprint Z1 — ADR templates with parseable Revisit Trigger
- guardian agent (`plugins/agents-pro/agents/guardian.md`) Step 4b
- ADR-006 — example with full Compliance section (currently pre-Sprint-Z2 format, will be migrated when revisited)
