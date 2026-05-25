# Smith Hand-off Template

> End-of-session summary template. Used when smith hands control back to the user (or to another tool).
> **Hard limit**: ≤200 lines. Keep it scannable — this is the last thing the user reads before closing the session.

---

# Smith Hand-off: <session label or sprint/epic identifier>

| Field | Value |
|---|---|
| Status | Final |
| Date | YYYY-MM-DD |
| Session duration | <e.g., "2h 15m" or "3 sessions over 2 days"> |
| Sprint/Epic | <e.g., "Sprint Z11" or "EPIC-002 Wave 1" or "ad-hoc"> |

## What was decided this session

Bullet list of decisions made — both technical and process. Cite artifact IDs.

- <decision 1 — what + why in one line — link to ADR/PRD if applicable>
- <decision 2 — what + why>
- <decision 3 — what + why>

If no decisions were made, write «no decisions — session was investigation/build only».

## What was built

Bullet list of artifacts and files produced. Use **absolute paths** for files; **artifact IDs** for forgeplan items.

- `/path/to/file1.md` — <one-line purpose>
- `/path/to/file2.json` — <one-line purpose>
- PRD-NNN — <title>
- EVID-NNN — <title>
- ADR-NNN — <title>

If nothing was built, write «no files modified — session produced decisions only» and ensure "What was decided" is non-empty.

## Active dispatches

Agents currently in-flight or recently completed. Table format. Status: `complete` / `in-progress` / `failed` / `pending-review`.

| Agent | Status | Output artifact |
|---|---|---|
| `<plugin>:<agent>` | complete | EVID-NNN |
| `<plugin>:<agent>` | in-progress | (pending) |
| `<plugin>:<agent>` | failed | (none — see Open items) |

If no dispatches happened, write «no dispatches — session was orchestrator-only».

## Open items

Checklist of unfinished work. Each item MUST be actionable by the next session. Vague items («follow up on X») are not acceptable — convert to a concrete next action.

- [ ] <concrete action — e.g., "Activate PRD-NNN after EVID-NNN passes BMAD review">
- [ ] <concrete action — e.g., "Dispatch artifact-reviewer on ADR-NNN for S11 BMAD gate">
- [ ] <concrete action — e.g., "File upstream issue forgeplan#NNN with reproducer attached">
- [ ] <concrete action — e.g., "Add NOTE-013 row for deferred decision X">

If nothing is open, write «no open items — session fully closed». Be honest: most sessions have open items.

## Recommended next step

Single sentence. Concrete next action — a command or dispatch, not a goal.

> **Next, run `/forge-cycle PRD-NNN`** to drive the new PRD through FPF → BMAD → OpenSpec → activation.

OR

> **Next, dispatch `agents-pro:artifact-reviewer`** on ADR-NNN for the S11 BMAD adversarial review EVID.

OR

> **Next, wait for `forgeplan#NNN` upstream triage** — no autonomous action available; user decision needed when issue closes.

## Memory state

What was saved to Hindsight this session (if Hindsight is wired). If Hindsight is not enabled in this project, write «Hindsight not enabled in this project».

- **Auto-retained** (via UserPromptSubmit/Stop/SessionEnd hooks): <one-line summary of the topic the hooks captured>
- **Manually retained** (via `memory_retain`): <bullet list of explicit non-obvious facts saved — typically empty unless an explicit lesson surfaced>
- **Mental models touched**: <e.g., `mm-pipeline-anomalies` updated with Anomaly #N>, or «none»

If nothing notable was saved, write «no manual retains — auto-hooks captured the conversation; nothing met the non-obvious bar».

---

## How to use this template

1. Run `/smith-handoff` at end of session — smith fills this template from session transcript + forgeplan state.
2. Review in chat. Push back if a section misrepresents the session (especially Open items — those become next-session inputs).
3. Save a copy to `.forgeplan/notes/handoff-<date>.md` for traceability.
4. The "Recommended next step" should be the first thing the next session executes — keep it concrete.
5. If Open items list is long (>5), consider creating a follow-up Sprint artifact instead of carrying them in handoff prose.
