# Session Checkpoint Schema — .forgeplan/sessions/<session-id>.yaml

> Authored as part of PRD-031 (Sprint C — /autorun resume protocol). Load-bearing
> reference for /autorun skill resume logic, /forge-progress dashboard, and
> future cross-CLI session compatibility.
>
> **Schema version**: 1 (initial release, Sprint C v1.22.0)

---

## TL;DR

When `/autorun` starts, it writes a session.yaml file to `.forgeplan/sessions/`
to track all phase completions, wave outputs, blocker state, and pending user
inputs. On blocker, the file persists with `status: paused`. On
`/autorun --resume <session-id>`, /autorun re-hydrates from the checkpoint and
continues from the last completed phase + 1.

---

## File Location

`.forgeplan/sessions/<session-id>.yaml` — one file per `/autorun` invocation.

### Session ID Format

`SESS-YYYYMMDD-HHMMSS-<rand4>` — e.g. `SESS-20260519-143052-A7F2`

- `YYYYMMDD` — date in local time when the session started
- `HHMMSS` — time component (24-hour)
- `<rand4>` — 4-character uppercase alphanumeric random suffix (collision guard)

### Why Inside .forgeplan/

The session file lives inside the forgeplan workspace because:

- It references artifact IDs (PRDs, EVIDs, claims) by forgeplan-canonical IDs
- It must be readable by the forgeplan MCP server in the same project
- Co-location with `.forgeplan/evidence/`, `.forgeplan/prds/` etc. simplifies
  workspace health checks and garbage collection via `--cleanup-sessions`
- The forgeplan `.gitignore` can exclude `sessions/` to avoid committing run state

---

## Status State Machine

```
                  /autorun starts
                        |
                        v
                   [ active ]
                   /        \
          blocker hit        all phases done
                 |                  |
                 v                  v
            [ paused ]        [ completed ]
                 |
         /autorun --resume
                 |
                 v
           [ active ]  -----> [ completed ]
                 |
         process crash
         (lock file absent)
                 |
                 v
           [ abandoned ]
```

States:

| State | Meaning | File present? | Resume allowed? |
|---|---|---|---|
| `active` | /autorun is currently executing; owns the file | yes | no — refuse with "session already active" |
| `paused` | /autorun exited on blocker; awaiting resume | yes | yes (if age ≤ 24h, or --force-resume) |
| `completed` | all phases finished normally | yes | no — no remaining work |
| `abandoned` | /autorun process died mid-execution | yes (.yaml.tmp present, no .yaml) | prompt user before recovery |

Transition rules:
- `active` → `paused`: /autorun writes final checkpoint then exits on any blocker
- `active` → `completed`: /autorun writes final checkpoint with `status: completed` then exits
- `paused` → `active`: `/autorun --resume` validates session then updates `status: active` + `last_checkpoint_at`
- `active` (resumed) → `completed`: same as original completion path
- `active` → `abandoned`: process killed mid-write; detected by presence of `.yaml.tmp` without corresponding `.yaml`

---

## Schema (Canonical Fields)

All 12 fields from FR-001. Types use YAML-native types; `null` means explicitly
set to YAML null (not absent).

```yaml
# .forgeplan/sessions/SESS-20260519-143052-A7F2.yaml
schema_version: 1                          # integer — schema major version; used for forward compat
session_id: SESS-20260519-143052-A7F2     # string — stable identifier; matches filename stem
started_at: "2026-05-19T14:30:52+00:00"  # string — ISO 8601 with timezone; set once at session start
last_checkpoint_at: "2026-05-19T14:45:11+00:00"  # string — ISO 8601; updated after each phase
original_task: "implement user activity feed dashboard widget"  # string — raw user prompt, verbatim
current_phase: 4                           # integer — phase /autorun was executing when checkpointed
current_wave: 2                            # integer — wave within current_phase (1-based); null if between phases
status: paused                             # enum — one of: active, paused, completed, abandoned
blocker_state: user_input_timeout          # nullable enum — null unless status=paused; see Blocker States table
completed_phases:                          # array of objects — one entry per finished phase
  - phase: 1
    completed_at: "2026-05-19T14:33:01+00:00"
    summary: "Research complete — 3 scout agents, 12 sources"
  - phase: 2
    completed_at: "2026-05-19T14:37:44+00:00"
    summary: "PRD-032 created (draft), EVID-059 linked, R_eff=0.85"
  - phase: 3
    completed_at: "2026-05-19T14:42:58+00:00"
    summary: "RFC-006 created, ADR-009 approved"
completed_waves:                           # array of objects — wave-level outputs within phases
  - phase: 4
    wave: 1
    completed_at: "2026-05-19T14:44:03+00:00"
    agents_dispatched: [coder, code-reviewer]
    output_summary: "src/dashboard/ActivityFeed.tsx created (+240 lines), lint PASS"
in_flight_subagents: []                    # array of strings — agent identity tags still executing; [] when paused
pending_user_inputs:                       # array of objects — questions awaiting user answers
  - question: "Should the activity feed paginate at 20 or 50 items per page?"
    phase: 4
    wave: 2
    asked_at: "2026-05-19T14:45:09+00:00"
    sentinel: "<<NEED_USER_INPUT>>"
pending_artifacts:                         # array of objects — artifacts started but not committed
  - id: PRD-032
    kind: prd
    status: draft
    started_in_phase: 2
  - id: EVID-060
    kind: evidence
    status: draft
    started_in_phase: 4
last_evid_emitted: EVID-059               # nullable string — ID of most recently completed evidence artifact; null if none
```

### Field Types Reference

| Field | Type | Required | Nullable | Constraints |
|---|---|---|---|---|
| `schema_version` | integer | yes | no | Must be `1` for this schema |
| `session_id` | string | yes | no | Matches `SESS-YYYYMMDD-HHMMSS-<rand4>` format |
| `started_at` | ISO 8601 string | yes | no | Set once; never updated |
| `last_checkpoint_at` | ISO 8601 string | yes | no | Updated after each phase transition |
| `original_task` | string | yes | no | Raw user prompt, max 1000 chars |
| `current_phase` | integer | yes | no | 1–8 for forge-cycle; depends on /autorun skill's phase count |
| `current_wave` | integer or null | yes | yes | null when paused between phases |
| `status` | enum string | yes | no | One of: `active`, `paused`, `completed`, `abandoned` |
| `blocker_state` | enum string or null | yes | yes | null unless `status: paused` |
| `completed_phases` | array of objects | yes | no | Empty array `[]` if no phases done |
| `completed_waves` | array of objects | yes | no | Empty array `[]` if no waves done |
| `in_flight_subagents` | array of strings | yes | no | Always `[]` when `status: paused` |
| `pending_user_inputs` | array of objects | yes | no | Empty array `[]` if no open inputs |
| `pending_artifacts` | array of objects | yes | no | Empty array `[]` if nothing in-flight |
| `last_evid_emitted` | string or null | yes | yes | null if no evidence emitted yet |

---

## Blocker States

When `status: paused`, the `blocker_state` field describes why /autorun stopped.

| Value | Meaning | Resume requires |
|---|---|---|
| `null` | Normal — should not appear in paused sessions | n/a (indicates a bug) |
| `adi_failed` | ADI (Autonomous Decision Intelligence) loop exhausted all hypotheses without resolution | User to provide domain info or manual adjudication |
| `user_input_timeout` | `<<NEED_USER_INPUT>>` sentinel timed out (60s autopilot default) | User to provide answers via `--with-answers` flag |
| `anti_loop_triggered` | A subagent emitted the same sentinel more than once (loop guard) | Manual intervention or accept the sentinel as a known limitation |
| `red_line_blocked` | Safety hook blocked an irreversible action (e.g. prod deploy, destructive git op) | Manual override or redesign the blocked step |
| `phase_failure` | A wave or phase failed validation (lint, typecheck, test) | Manual fix to source or config before resume |
| `manual_pause` | User pressed Ctrl+C or sent SIGTERM during run | Nothing extra — just `--resume`; state was captured before exit |

---

## Atomic Write Contract

Sessions are written using a `.yaml.tmp` + atomic rename pattern to prevent
partial-write corruption. If /autorun crashes mid-write, only the `.yaml.tmp`
is corrupt; the previous `.yaml` remains intact.

### Required Write Pattern

**Bash (shell implementation):**

```bash
SESSION_FILE=".forgeplan/sessions/${SESSION_ID}.yaml"
TMP_FILE="${SESSION_FILE}.tmp"

# Write to .tmp first
cat > "${TMP_FILE}" << YAML
schema_version: 1
session_id: ${SESSION_ID}
status: ${STATUS}
last_checkpoint_at: $(date -u +"%Y-%m-%dT%H:%M:%S+00:00")
# ... all fields ...
YAML

# Atomic rename — this is the commit point
mv "${TMP_FILE}" "${SESSION_FILE}"
```

**Python (MCP tool or /autorun internal implementation):**

```python
import yaml
import os
import tempfile

def write_session_checkpoint(session_dir: str, session_id: str, state: dict) -> None:
    """Write session state atomically via tmp + rename."""
    target = os.path.join(session_dir, f"{session_id}.yaml")
    tmp = target + ".tmp"

    with open(tmp, "w") as f:
        yaml.dump(state, f, default_flow_style=False, allow_unicode=True)

    os.replace(tmp, target)  # atomic on POSIX; os.replace is preferred over os.rename
```

### Recovery on Crash Detection

If a `.yaml.tmp` file is found without a corresponding `.yaml`:

1. Treat as `abandoned` session
2. Try to parse `.yaml.tmp` — if parseable, offer recovery
3. If unparseable, surface to user: "Found corrupt session temp file `<path>` — delete it?"
4. Do NOT auto-recover silently

If `.yaml` exists alongside `.yaml.tmp` (rare race condition on resume):

1. The `.yaml` is the canonical file (it was written before the `.tmp`)
2. Delete the `.tmp` and proceed with `.yaml`

---

## Drift Detection on Resume

When `/autorun --resume <session-id>` is invoked, /autorun MUST verify each
artifact reference in `pending_artifacts[]` and `last_evid_emitted` still
exists and has not been deleted or superseded.

### Validation Pseudocode

```python
def validate_session_on_resume(session: dict, forgeplan_get) -> ResumeResult:
    """
    Check all artifact references in session are still valid.
    Returns ResumeResult(ok=True) or ResumeResult(ok=False, reason=..., artifacts=...)
    """
    drift_warnings = []
    drift_blockers = []

    # Check pending_artifacts
    for artifact in session.get("pending_artifacts", []):
        artifact_id = artifact["id"]
        result = forgeplan_get(id=artifact_id)

        if result is None:
            # Artifact deleted — hard blocker
            drift_blockers.append({
                "id": artifact_id,
                "issue": "deleted",
                "action": "refuse_resume"
            })
        elif result.get("status") in ("superseded", "deprecated"):
            # Artifact lifecycle changed — warn, ask user
            drift_warnings.append({
                "id": artifact_id,
                "issue": f"now {result['status']}",
                "action": "skip_or_confirm"
            })
        # active/draft: OK, no action needed

    # Check last_evid_emitted
    last_evid = session.get("last_evid_emitted")
    if last_evid:
        evid = forgeplan_get(id=last_evid)
        if evid is None:
            drift_warnings.append({
                "id": last_evid,
                "issue": "deleted",
                "action": "warn_only"  # evidence deletion is unusual but not a blocker
            })

    if drift_blockers:
        return ResumeResult(ok=False, blockers=drift_blockers)

    return ResumeResult(ok=True, warnings=drift_warnings)
```

### Drift Outcomes

| Condition | Outcome |
|---|---|
| All artifacts present and `active` or `draft` | Resume continues normally |
| A `pending_artifact` is now `deprecated` | Warn user; default = skip that artifact; `--force-resume` skips without prompt |
| A `pending_artifact` is now `superseded` | Warn user; ask which successor to use or skip |
| A `pending_artifact` was deleted | REFUSE resume; suggest manual recovery or fresh start |
| `last_evid_emitted` was deleted | Warn only (evidence already completed; deletion is unusual but not blocking) |

---

## Staleness Rules

- Session age = `now - last_checkpoint_at` (ISO 8601 subtraction)
- Default cutoff: **24 hours** — paused sessions older refuse resume
- Override: `--force-resume` flag, with explicit warning printed to stdout:

```
WARNING: Session SESS-20260519-143052-A7F2 is 31h old (last checkpoint:
2026-05-19T14:45:11+00:00). Artifact graph may have drifted significantly.
Use --resume without --force-resume for safety. Proceeding anyway...
```

### Cleanup Defaults

| Condition | Default behavior |
|---|---|
| `status: completed` | Removed immediately on `--cleanup-sessions` (no prompt) |
| `status: paused`, age ≤ 7 days | Listed by `--list-sessions`; NOT removed by `--cleanup-sessions` |
| `status: paused`, age > 7 days | Surfaced for confirmation during `--cleanup-sessions` ("Remove stale paused session? [y/N]") |
| `status: abandoned` (`.yaml.tmp` only) | Listed by `--list-sessions` with `[ABANDONED]` tag; `--cleanup-sessions` removes with confirmation |

---

## Field Reference (Annotated)

### `completed_phases` Object

```yaml
completed_phases:
  - phase: 3                                     # integer — phase number (1-based)
    completed_at: "2026-05-19T14:42:58+00:00"   # ISO 8601 string — phase finish time
    summary: "RFC-006 created, ADR-009 approved" # string — 1-2 sentence human-readable; max 200 chars
```

### `completed_waves` Object

```yaml
completed_waves:
  - phase: 4                                     # integer — phase this wave belongs to
    wave: 1                                      # integer — wave number within phase (1-based)
    completed_at: "2026-05-19T14:44:03+00:00"   # ISO 8601 string — wave finish time
    agents_dispatched:                           # array of strings — agent identity tags
      - coder
      - code-reviewer
    output_summary: "ActivityFeed.tsx (+240 lines), lint PASS"  # string — max 200 chars
```

### `pending_user_inputs` Object

```yaml
pending_user_inputs:
  - question: "Should the activity feed paginate at 20 or 50 items per page?"  # string — full question text
    phase: 4          # integer — phase where the sentinel was triggered
    wave: 2           # integer — wave within that phase
    asked_at: "2026-05-19T14:45:09+00:00"  # ISO 8601 — when the sentinel fired
    sentinel: "<<NEED_USER_INPUT>>"        # string — the sentinel that triggered this (verbatim)
```

When resuming with `--with-answers`, /autorun reads `pending_user_inputs[]`
and injects the provided answers before re-dispatching, in order.

### `pending_artifacts` Object

```yaml
pending_artifacts:
  - id: PRD-032        # string — forgeplan artifact ID
    kind: prd          # string — artifact kind (prd, evidence, rfc, adr, note, spec, etc.)
    status: draft      # string — artifact status at checkpoint time (draft, active, etc.)
    started_in_phase: 2  # integer — phase that created this artifact
```

---

## Size Budget

Per NFR-001: session files MUST stay ≤ 8KB. Rules to stay within budget:

- `original_task`: max 1000 characters (truncate with `...` if needed)
- Phase/wave `summary`: max 200 characters each
- `pending_user_inputs[].question`: max 500 characters each
- Do NOT dump full artifact bodies — only IDs + summaries
- Do NOT dump subagent stdout — only structured outputs

At a typical 6-phase run with 3 waves per phase:

- ~18 `completed_waves` entries × ~150 bytes each = ~2.7KB
- ~6 `completed_phases` entries × ~100 bytes each = ~0.6KB
- Base fields + metadata = ~0.5KB
- Total: well within 8KB ceiling

---

## Cross-CLI Compatibility (Forward-Looking)

The session.yaml format is plain YAML with no Claude Code-specific fields.
In principle, Gemini CLI / Codex CLI / Goose could read and write sessions
when they ship `/autorun` equivalents. The schema is intentionally minimal
and tool-agnostic for this reason.

**Current Sprint C scope**: Claude Code only.

**Multi-CLI session sharing** is deferred to a future PRD. When adopted:
- A `cli_origin` field (e.g. `claude-code`, `gemini-cli`) will be added (additive — minor bump)
- Cross-CLI resume would require artifact-reference validation against the same `.forgeplan/` workspace
- Session file locking strategy TBD (currently assumed single-process)

---

## Examples

### Example 1: Clean Completion (6 Phases, No Blocker)

A successful overnight run — /autorun finished all phases, wrote final
checkpoint, set `status: completed`.

```yaml
schema_version: 1
session_id: SESS-20260519-010000-B3C1
started_at: "2026-05-19T01:00:00+00:00"
last_checkpoint_at: "2026-05-19T02:14:33+00:00"
original_task: "implement GitHub Projects sync command for forgeplan CLI"
current_phase: 6
current_wave: null
status: completed
blocker_state: null
completed_phases:
  - phase: 1
    completed_at: "2026-05-19T01:08:12+00:00"
    summary: "Research complete — 5 scout agents, forgeplan#287 context captured"
  - phase: 2
    completed_at: "2026-05-19T01:19:44+00:00"
    summary: "PRD-033 created (active), R_eff=1.0 grade A, EVID-061 informs"
  - phase: 3
    completed_at: "2026-05-19T01:31:05+00:00"
    summary: "RFC-007 created and activated, ADR-010 not needed"
  - phase: 4
    completed_at: "2026-05-19T01:55:22+00:00"
    summary: "src/gh-project-sync.ts created (+312 lines), lint PASS, tsc PASS"
  - phase: 5
    completed_at: "2026-05-19T02:07:18+00:00"
    summary: "EVID-062 created — audit PASS (code-reviewer, security-expert)"
  - phase: 6
    completed_at: "2026-05-19T02:14:33+00:00"
    summary: "PR #88 opened, CI green, merged to main"
completed_waves:
  - phase: 4
    wave: 1
    completed_at: "2026-05-19T01:40:11+00:00"
    agents_dispatched: [coder]
    output_summary: "gh-project-sync.ts scaffold created (+120 lines)"
  - phase: 4
    wave: 2
    completed_at: "2026-05-19T01:55:22+00:00"
    agents_dispatched: [coder, code-reviewer]
    output_summary: "Full implementation (+312 lines), review PASS"
  - phase: 5
    wave: 1
    completed_at: "2026-05-19T02:07:18+00:00"
    agents_dispatched: [security-expert, tester]
    output_summary: "Security PASS (no injection paths), tests 14/14 green"
in_flight_subagents: []
pending_user_inputs: []
pending_artifacts: []
last_evid_emitted: EVID-062
```

---

### Example 2: Paused on NEED_USER_INPUT Timeout (Mid-Wave)

/autorun ran to Phase 4, Wave 2. A subagent emitted `<<NEED_USER_INPUT>>`,
autopilot waited 60 seconds, received no answer, and exited cleanly.

```yaml
schema_version: 1
session_id: SESS-20260519-143052-A7F2
started_at: "2026-05-19T14:30:52+00:00"
last_checkpoint_at: "2026-05-19T14:45:11+00:00"
original_task: "implement user activity feed dashboard widget"
current_phase: 4
current_wave: 2
status: paused
blocker_state: user_input_timeout
completed_phases:
  - phase: 1
    completed_at: "2026-05-19T14:33:01+00:00"
    summary: "Research complete — 3 scout agents, 12 sources reviewed"
  - phase: 2
    completed_at: "2026-05-19T14:37:44+00:00"
    summary: "PRD-032 created (draft), EVID-059 linked, R_eff=0.85"
  - phase: 3
    completed_at: "2026-05-19T14:42:58+00:00"
    summary: "RFC-006 created, ADR-009 approved"
completed_waves:
  - phase: 4
    wave: 1
    completed_at: "2026-05-19T14:44:03+00:00"
    agents_dispatched: [coder, code-reviewer]
    output_summary: "src/dashboard/ActivityFeed.tsx created (+240 lines), lint PASS"
in_flight_subagents: []
pending_user_inputs:
  - question: "Should the activity feed paginate at 20 or 50 items per page?"
    phase: 4
    wave: 2
    asked_at: "2026-05-19T14:45:09+00:00"
    sentinel: "<<NEED_USER_INPUT>>"
pending_artifacts:
  - id: PRD-032
    kind: prd
    status: draft
    started_in_phase: 2
  - id: EVID-060
    kind: evidence
    status: draft
    started_in_phase: 4
last_evid_emitted: EVID-059
```

Resume hint surfaced to user:
```
Session paused: SESS-20260519-143052-A7F2
  Last checkpoint: Phase 3 complete (2026-05-19T14:45:11+00:00)
  Blocker: user_input_timeout — answer required before Phase 4 Wave 2 can continue
  Question: "Should the activity feed paginate at 20 or 50 items per page?"

  To resume:
    /autorun --resume SESS-20260519-143052-A7F2 --with-answers "20 items per page"
```

---

### Example 3: Post-Resume with Answer Applied

Same session as Example 2, after `/autorun --resume SESS-20260519-143052-A7F2
--with-answers "20 items per page"` ran to completion.

```yaml
schema_version: 1
session_id: SESS-20260519-143052-A7F2
started_at: "2026-05-19T14:30:52+00:00"
last_checkpoint_at: "2026-05-19T15:02:47+00:00"
original_task: "implement user activity feed dashboard widget"
current_phase: 6
current_wave: null
status: completed
blocker_state: null
completed_phases:
  - phase: 1
    completed_at: "2026-05-19T14:33:01+00:00"
    summary: "Research complete — 3 scout agents, 12 sources reviewed"
  - phase: 2
    completed_at: "2026-05-19T14:37:44+00:00"
    summary: "PRD-032 created (draft), EVID-059 linked, R_eff=0.85"
  - phase: 3
    completed_at: "2026-05-19T14:42:58+00:00"
    summary: "RFC-006 created, ADR-009 approved"
  - phase: 4
    completed_at: "2026-05-19T14:52:19+00:00"
    summary: "ActivityFeed.tsx finalized with 20-item pagination (+340 lines total)"
  - phase: 5
    completed_at: "2026-05-19T14:58:33+00:00"
    summary: "EVID-060 created — audit PASS, security-expert no findings"
  - phase: 6
    completed_at: "2026-05-19T15:02:47+00:00"
    summary: "PR #89 opened, CI green, merged to main"
completed_waves:
  - phase: 4
    wave: 1
    completed_at: "2026-05-19T14:44:03+00:00"
    agents_dispatched: [coder, code-reviewer]
    output_summary: "ActivityFeed.tsx scaffold (+240 lines), lint PASS"
  - phase: 4
    wave: 2
    completed_at: "2026-05-19T14:52:19+00:00"
    agents_dispatched: [coder]
    output_summary: "Pagination (20 items) implemented, answer injected from --with-answers"
  - phase: 5
    wave: 1
    completed_at: "2026-05-19T14:58:33+00:00"
    agents_dispatched: [security-expert, code-reviewer]
    output_summary: "PASS — no injection risks, pagination logic correct"
in_flight_subagents: []
pending_user_inputs: []
pending_artifacts: []
last_evid_emitted: EVID-060
```

Key differences from Example 2:
- `status: completed` (was `paused`)
- `blocker_state: null` (was `user_input_timeout`)
- `pending_user_inputs: []` (question answered and cleared)
- `pending_artifacts: []` (both PRD-032 and EVID-060 now committed)
- Phases 4, 5, 6 now present in `completed_phases`
- `last_checkpoint_at` updated to resume-completion time

---

## Versioning

Schema version `1` is the initial release for Sprint C v1.22.0.

The `schema_version` field is the forward-compatibility gate:

| Change type | Version bump | Old /autorun behavior |
|---|---|---|
| Additive fields (new optional key) | minor (1 → 1.1) | Old /autorun reads file; ignores unknown keys |
| Renamed field or changed semantics | major (1 → 2) | Old /autorun refuses resume; surfaces clear error: "Session uses schema_version: 2; this /autorun supports 1. Upgrade /autorun to resume." |
| Removed required field | major (1 → 2) | Same as above |

### Version Check on Resume

```python
SUPPORTED_SCHEMA_VERSIONS = {1}

def check_schema_version(session: dict) -> None:
    v = session.get("schema_version")
    if v not in SUPPORTED_SCHEMA_VERSIONS:
        raise ResumeError(
            f"Session uses schema_version: {v}. "
            f"This /autorun supports: {sorted(SUPPORTED_SCHEMA_VERSIONS)}. "
            "Upgrade the /autorun skill or use --fresh-start."
        )
```

---

## References

| Artifact | Role |
|---|---|
| PRD-031 (Sprint C) | Parent — this schema's specification (FR-001 defines all 12 fields) |
| /autorun skill body | Primary consumer — writes and reads session.yaml on every invocation |
| /forge-progress skill (Sprint B Wave 3) | Read-only consumer — parses `status`, `completed_phases`, `last_checkpoint_at` for dashboard rendering |
| PRD-030 EVID-057 (Sprint B closure) | Context — "Only Gap C (autorun resume) remains for Sprint C"; motivated this schema |
| PRD-029 (Sprint A UX-layer) | Context — defines `<<NEED_USER_INPUT>>` sentinel that triggers `user_input_timeout` blocker state |

---

**Russian version**: `docs/SESSION-CHECKPOINT-SCHEMA-RU.md` (to be authored separately per docs convention)
