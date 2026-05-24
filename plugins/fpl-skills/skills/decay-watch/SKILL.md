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

### Step 2b — Scan NOTE-013 deferred items (Sprint Z5 PRD-056)

NOTE-013 «Deferred items tracker» is the central catalog of all deferred / pending work. Each row uses parseable syntax similar to ADR triggers but with `**Kind**:` instead of `**Type**:` (4 kinds: `issue` / `metric` / `date` / `event`).

```python
note_body = forgeplan_get(id="NOTE-013")
```

Parse with regex: `^- \[([ x])\] \*\*Kind\*\*:\s*(issue|metric|date|event)\s*[—\-]\s*(.+)$` (note `Kind` not `Type`; same dash tolerance as ADR triggers).

For each row:
- `[x]` → CLOSED (deferred item resolved, archived)
- `[ ]` AND `kind=date` AND past ISO date → DATE-FIRED
- `[ ]` AND `kind=issue` AND issue URL present → check via `gh issue view <number> --json state`; if state=CLOSED → ISSUE-FIRED
- `[ ]` AND `kind=metric` or `event` → PENDING (cannot auto-verify)

### Step 2c — Run check-issue scripts (Sprint Z5 PRD-056)

For each script in `scripts/check-issue-*.sh`:

```bash
bash scripts/check-issue-NNN-status.sh
```

Parse output `state=OPEN|CLOSED`. If CLOSED — surface alert + point to corresponding `docs/POST-NNN-ACTIONS.md` checklist if present.

### Step 2d — ADR line-count check (Sprint Z5 PRD-056 — closes audit Finding #4)

For each active ADR, check body length vs template threshold:

```python
adr_body = forgeplan_get(id=adr.id).body
line_count = adr_body.count('\n') + 1
# Detect template by header presence:
#   Light ADR — body starts with "# ADR-NNN: <title>" + has "## Revisit Trigger (Evidence Decay)"
#   Full ADR — body has "## Compliance / Revisit Trigger" + "## Decision drivers" + "## Considered options"
if is_light_adr(adr_body) and line_count > 400:
    surface LINE-LIMIT-EXCEEDED — recommend either: (a) split into smaller decisions, or (b) migrate to adr-full template
```

Full ADRs have no hard limit (typical 800-2000 lines) — only warn if exceeds 3000 (likely scope creep).

### Step 3 — Classify each trigger

Three categories:

| Category | Detection | Action |
|---|---|---|
| **Already marked fired** | `[x]` checkbox | Report as FIRED, ADR should be superseded |
| **Date trigger past due** | `[ ]` AND type=date AND parseable date in past | Report as DATE-FIRED, suggest user mark `[x]` |
| **Needs human verification** | `[ ]` AND type=metric/event | Report as PENDING — ask user to check |
| **Pre-Sprint-Z2 format** | No `- [ ]` lines in section | Report as LEGACY-FORMAT — manual review needed |

### Step 4 — Output structured report

When invoked silently (by hook) — output ONLY if there are FIRED / DATE-FIRED / ISSUE-FIRED / LINE-LIMIT-EXCEEDED items across any of the 4 sources:

```
🔔 N item(s) need attention:
  - ADR-XXX trigger fired (date): <one-line>
  - NOTE-013 deferred item closed (issue): forgeplan#NNN
  - check-issue-NNN: state changed OPEN → CLOSED
  - ADR-YYY exceeds 400-line limit (current: NNN)
Run /decay-watch for details.
```

When invoked directly by user — output full multi-source report:

```markdown
## Decay Watch Report

### 1. ADR Revisit Triggers

#### FIRED (immediate action needed)
- **ADR-XXX**: <title>
  - Trigger: <description>
  - Action: supersede with ADR-(XXX+1), OR uncheck with justification

#### PENDING VERIFICATION
- **ADR-YYY**: <title> — needs human check

#### LEGACY FORMAT (pre-Sprint Z2)
- **ADR-ZZZ**: prose-only Compliance section — manual review

### 2. NOTE-013 Deferred items (Sprint Z5)

#### FIRED — deferred item trigger reached
- **DEFER-NNN**: <description from NOTE-013 row>
  - Source: <url or path>
  - Action: open corresponding follow-up plan (e.g., POST-NNN-ACTIONS.md)

#### PENDING — needs human / time / external event
- Count: N (full list available in NOTE-013)

### 3. Upstream issue check-scripts

#### CLOSED upstream — action checklist ready
- **forgeplan#NNN**: closed YYYY-MM-DD — run `docs/POST-NNN-ACTIONS.md`

### 4. ADR line-count violations (Sprint Z5)

- **ADR-XXX (light)**: 432 lines — exceeds 400 limit
  - Recommend: split into 2 light ADRs, OR migrate to adr-full template

### SUMMARY

- Total active ADRs: N (M light / K full)
- ADR triggers: N fired / N pending / N legacy
- NOTE-013 deferred: N total / N fired / N pending
- Upstream issues: N watched / N newly CLOSED
- Line-count violations: N
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

- **decay-reminder.sh hook** (`hooks/scripts/decay-reminder.sh`) — calls this skill silently at SessionStart, alerts on any source type.
- **guardian agent Step 4b** — calls this skill before rendering pre-activation verdict; if any FIRED triggers for ADRs linked to the artifact under review → BLOCKER. Also checks NOTE-013 for related deferred items.
- **NOTE-013** (Sprint Z5 PRD-056) — central deferred catalog; Step 2b reads it.
- **`scripts/check-issue-*.sh`** — Sprint Z2/Z5 per-issue monitor scripts; Step 2c invokes them.
- **`/forge-cycle`** — could optionally call before phase advance (not in Sprint Z2 scope).

## References

- PRD-053 (this Sprint Z2 scope)
- PRD-052 / Sprint Z1 — ADR templates with parseable Revisit Trigger
- guardian agent (`plugins/agents-pro/agents/guardian.md`) Step 4b
- ADR-006 — example with full Compliance section (currently pre-Sprint-Z2 format, will be migrated when revisited)
