# Section 05 — Session and artifact-phase state machines

**4 tools** + critical disambiguation: **three** different things in this project are called "phase" (ADR-022). Don't confuse them.

| Register | Values | Where it lives |
|---|---|---|
| **Pipeline stage** | `brief` / `shape` / `decompose` / `design` / `estimate` / `gate` / `build` / `audit` / `evidence` / `activate` / `wrap` | `plugins/fpl-skills/templates/project-agent-matrix.yaml` — **no MCP tool reads it** |
| **Methodology session phase** | `idle` / `routing` / `shaping` / `coding` / `evidence` / `pr` | `_session`, `_guard` |
| **Artifact lifecycle marker** | `shape` / `validate` / `adi` / `code` / `test` / `audit` / `evidence` / `done` | `_phase`, `_phase_advance` |

This section used to list two machines. The third — the pipeline stage — went unnoticed for months precisely because it has no tool family: it is a document-and-template construct, so nothing queried it and nothing checked its count against the carrier. That is how RFC-002 came to carry a stage count in its title that its own table contradicted.

The registers overlap lexically in three places — `shape`, `audit` and `evidence` each appear in more than one column — and mean something different in each. Ask which question you are answering:

- **Pipeline stage** — "which step of the canonical pipeline is this task at?" Reference it by name, never by position (ADR-022 INV-5).
- **Session phase** — "what is the team doing right now?"
- **Lifecycle marker** — "how far did this artifact get?" It is **advisory**: a hint for resume, never a gate condition (ADR-022 INV-2). Gates read `status`, evidence and R_eff.

Three of the marker values — `adi`, `test`, `audit` — currently have no code path that emits them. Read them as reserved rather than as positions in a sequence; whether they are removed or wired up is an open question in ADR-022, and the enumeration must not be extended in the meantime (INV-1).

## 05.1 forgeplan_session — current methodology session

Read-only. Returns the current methodology session state.

```python
forgeplan_session()
# → {"phase": "shaping", "active_artifact": "PRD-001", "depth": "standard", "enforcement": "on"}
```

**Use case**: session-start agents ("where are we") and orchestrators routing the next action.

## 05.2 forgeplan_guard — check session phase transition

Pre-check before performing a session-level action. Answers "can I go from current to target?"

```python
forgeplan_guard(target_session_phase="coding")
# → {"allowed": true} or {"allowed": false, "reason": "..."}
```

**Legacy param**: `target_phase=` is accepted as alias for back-compat.

## 05.3 forgeplan_phase — read artifact lifecycle phase

Returns the artifact's current lifecycle phase + transition history.

```python
forgeplan_phase(id="PRD-001")
# → {"current_phase": "validate", "workflow_type": "standard", "history": [...]}
```

**If no state file exists** (pre-PRD-056 artifact or phase tracking disabled): returns `current_phase: "unknown"` — never an error. Advisory layer, never blocks.

## 05.4 forgeplan_phase_advance — set artifact lifecycle phase

Manually advances the lifecycle phase marker. Does NOT validate phase ordering — advisory layer allows out-of-order jumps.

```python
forgeplan_phase_advance(id="PRD-001", to="evidence")
forgeplan_phase_advance(id="PRD-001", to="done", reason="post-audit, all gates green")
```

**Use case**: orchestrators marking phase completions when auto-advance missed a transition. Full enforcement lands in a later PRD under EPIC-005.

## Phase ladder per artifact kind (canonical sequence)

```
shape → validate → adi → code → test → audit → evidence → done
```

Not every artifact passes through all 8. Tactical artifacts collapse `adi` and `code`. PRDs typically end at `evidence` (the implementing RFC takes over for `code`/`test`/`audit`).
