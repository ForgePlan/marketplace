# Section 01 — Lifecycle: CRUD + state transitions

**11 tools** covering artifact create / read / update / delete, plus the lifecycle transitions (draft → active → superseded / deprecated). For ownership rules see SKILL.md Ownership Matrix.

## 01.1 forgeplan_new — create artifact

Generates the next sequential ID for the kind, renders the template, stores in LanceDB, writes markdown projection.

| Field | Value |
|---|---|
| **Owner** | Profile A (creators only; B / C / D have it on `disallowedTools`) |
| **Kinds** | `prd`, `epic`, `spec`, `rfc`, `adr`, `problem`, `solution`, `evidence`, `note`, `refresh` |
| **Auto-link shortcut** | `parent_id=<PRD-NNN>` when `kind=evidence` → creates `informs` link in same call (PRD-074 / issue #295) |

```python
# Standard pattern
forgeplan_new(kind="prd", title="Pipeline e2e verification")
# → {"id": "PRD-NNN", "kind": "prd", "filepath": "...", ...}

# Evidence with auto-link (preferred for EVIDs)
forgeplan_new(kind="evidence", title="ADI cycle on PRD-NNN", parent_id="PRD-NNN")
# Saves the forgeplan_link call afterwards.
```

**Gotcha**: title becomes part of the slug. Pick a title you'd be happy with as a git-trackable filename — once `assigned_number` lands, the slug is final.

## 01.2 forgeplan_get — read artifact

Returns all metadata + body content. Any profile may call this.

```python
forgeplan_get(id="PRD-001")
# → {"id": "PRD-001", "kind": "prd", "title": "...", "body": "...",
#    "status": "draft", "r_eff_score": 0.0, "depth": "standard", ...}
```

**Gotcha**: the `body` field is the full markdown body. For large bodies prefer reading the file projection at the `.forgeplan/<kind>/` path returned by `forgeplan_new` / `_get` to avoid loading the whole body into agent context.

## 01.3 forgeplan_update — update metadata or body

⚠️ **READ [`14.1`](14-mcp-safety-warnings.md) FIRST**. The MCP variant does NOT expand `@/path/file.md` — silent data loss bug, filed as forgeplan#350.

| Field | Value |
|---|---|
| **Owner** | Profile A (own kind), Profile D (cross-kind metadata-only) |
| **Mutable fields** | `body`, `title`, `status` |
| **Safe pattern** | Read file via host, pass content as string (NOT `@/path`) |

```python
# CORRECT
body_text = Read(file_path="/tmp/PRD-001-body.md")
forgeplan_update(id="PRD-001", body=body_text)

# CLI is symmetric and safe — @file IS parsed
# forgeplan update PRD-001 --body @/tmp/PRD-001-body.md   ✓
```

**Status transitions via update**: `forgeplan_update(id, status="active")` does NOT pass the validation gate. Use `forgeplan_activate` for that. The bare status field is for non-lifecycle mutations (e.g., correcting a slipped status).

## 01.4 forgeplan_delete — soft delete

Removes the artifact from LanceDB + moves projection to `.forgeplan/trash/<receipt-id>/`. Reversible for 30 days via `forgeplan_undo_last` or `forgeplan_restore`.

```python
forgeplan_delete(id="NOTE-018")
# → {"receipt_id": "note-NOTE-018-1779869382388-...", "message": "Soft-deleted ..."}
```

**Gotcha**: forgeplan considers delete "terminal lifecycle". For non-terminal cleanup prefer `forgeplan_supersede` (with replacement) or `forgeplan_deprecate` (with reason). The `_next_action` field of `_delete` response will say so.

## 01.5 forgeplan_activate — draft → active

Runs validation (MUST rules); if any MUST fails, activation refuses unless `force=true`.

```python
# Standard
forgeplan_activate(id="PRD-001")
# → {"message": "Activated PRD-001 (draft → active)", ...}

# Force-activate (skip MUST gate — only when explicitly OK with violations)
forgeplan_activate(id="PRD-001", force=true)
```

| Field | Value |
|---|---|
| **Owner** | Orchestrator (not agents). Profile A / B / D have `_activate` on `disallowedTools`. |
| **Gate** | MUST validation rules per artifact kind (see [`03-quality-gates`](03-quality-gates.md) for which rules apply) |

**Why orchestrator-only**: activation is a workflow decision (gate passed + evidence linked + ready to ship). Agents propose, orchestrators decide.

## 01.6 forgeplan_supersede — active → superseded with replacement

Creates `supersedes` link from new artifact to predecessor + marks predecessor superseded.

```python
forgeplan_supersede(id="ADR-005", by="ADR-006")
# → {"superseded_at": "...", "new_id": "ADR-006", ...}
```

**Sprint Z8 OpenSpec discipline (per CLAUDE.md)**: every supersede must produce an explicit delta-spec body (## ADDED / ## MODIFIED / ## REMOVED / ## UNCHANGED) in the replacement artifact. Use the `/supersede` skill, which walks Steps 1-8 and prompts for delta inputs.

**Gotcha**: `forgeplan_supersede` refuses on non-active source (must be `active` or `stale`). FSM rejects backward path.

## 01.7 forgeplan_deprecate — active/stale → deprecated with reason

Marks artifact deprecated. No replacement required (unlike supersede).

```python
forgeplan_deprecate(id="PRD-008", reason="merged into PRD-024 scope")
```

**When to use vs supersede**:

| Situation | Use |
|---|---|
| New artifact replaces old one with named delta | `_supersede` |
| Artifact is no longer relevant, no replacement | `_deprecate` |
| Artifact has wrong content but should stay readable as historical record | `_deprecate` |
| Artifact is genuinely garbage (test artefact, accidental) | `_delete` (soft) |

## 01.8 forgeplan_link — typed relation

Creates `informs` / `based_on` / `supersedes` / `contradicts` / `refines` edge between two artifacts.

```python
forgeplan_link(source="EVID-001", target="PRD-001", relation="informs")
# → {"_next_action": "...", "message": "Linked: EVID-001 --informs--> PRD-001"}
```

| Relation | Semantics | Direction |
|---|---|---|
| `informs` | source provides information about target | source → target |
| `based_on` | source is built on top of target | source → target |
| `supersedes` | source replaces target | source → target |
| `contradicts` | source contradicts target | bidirectional logically; source → target by convention |
| `refines` | source refines / extends target | source → target |

**Issue #286 idempotent upsert**: pass `replace=true` to replace an existing edge with a different relation (otherwise additive adds parallel edge).

**Issue #288 auto-activate**: pass `auto_activate_source_if_complete=true` when linking EVID → PRD if you want the EVID to silently activate when this link completes the evidence pack (only fires if source is draft EVID + body has `verdict` + `congruence_level` + R_eff > 0 post-link).

## 01.9 forgeplan_unlink — remove relation

Mirror of `_link`. Use for fixing mis-typed edges (e.g., `based_on` was the wrong relation; user meant `informs`).

```python
forgeplan_unlink(source="EVID-001", target="PRD-001", relation="based_on")
forgeplan_link(  source="EVID-001", target="PRD-001", relation="informs")
```

Or use the `replace=true` shortcut on `_link` to do both in one call.

## 01.10 forgeplan_restore — recover soft-deleted

Reads `.forgeplan/trash/<receipt-id>/` and restores artifact to its previous status (or override with `target_status`).

```python
forgeplan_restore(id="NOTE-018")                            # restores to prior_status from receipt
forgeplan_restore(id="NOTE-018", target_status="active")    # force a specific status (issue #291)
```

**TTL**: 30 days from the destructive op. Trash files older than that are GC'd.

## 01.11 forgeplan_undo_last — reverse last destructive op

The "undo button". Reads the most recent non-consumed receipt within `within_hours` (default 24) and applies `_restore`.

```python
forgeplan_undo_last(within_hours=24)
# Reverses the most recent delete / supersede / deprecate in the last 24h.
```

**Gotcha**: only the **most recent** receipt. If you deleted 3 artifacts in a row, `_undo_last` reverses the last one only. Call again for the next.

## Cross-references

- `forgeplan_validate` (next section, [`03-quality-gates`](03-quality-gates.md)) — gates `_activate`
- `forgeplan_score` (next section) — computes R_eff that issue #288 auto-activate checks
- `forgeplan_anomalies` ([`04-pipeline-health`](04-pipeline-health.md)) — detects stuck drafts / orphan links from this layer
- `/supersede` skill (in same plugin) — wraps `_supersede` with delta-spec workflow
