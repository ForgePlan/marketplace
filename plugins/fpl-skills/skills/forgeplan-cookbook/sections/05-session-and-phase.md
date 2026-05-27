# Section 05 — Session and artifact-phase state machines

**4 tools** + critical disambiguation: forgeplan has **two** distinct state machines (PROB-065). Don't confuse them.

| Machine | States | Tool family |
|---|---|---|
| **Methodology session phase** | `idle` / `routing` / `shaping` / `coding` / `evidence` / `pr` | `_session`, `_guard` |
| **Artifact lifecycle phase** | `shape` / `validate` / `adi` / `code` / `test` / `audit` / `evidence` / `done` | `_phase`, `_phase_advance` |

Both machines contain an `evidence` state lexically, but they're separate concepts. `_session` answers "what is the team doing right now"; `_phase` answers "what is artifact X's progress".

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

**Legacy param**: `target_phase=` is accepted as alias for back-compat (PROB-065).

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
