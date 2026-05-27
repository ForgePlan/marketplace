# Section 02 — Discovery and search

**5 tools** for finding artifacts. All read-only — any profile may call.

## 02.1 forgeplan_list — filter by kind / status

```python
forgeplan_list(kind="prd", status="draft")     # all draft PRDs
forgeplan_list(status="active")                 # all active artifacts of any kind
forgeplan_list()                                # entire workspace
```

| CLI | MCP |
|---|---|
| `forgeplan list --type prd --status draft` | `forgeplan_list(kind="prd", status="draft")` |

**Gotcha**: CLI flag is `--type` (NOT `--kind`); MCP param is `kind`. See [`14`](14-mcp-safety-warnings.md) for the asymmetry rationale.

## 02.2 forgeplan_search — BM25 keyword + optional semantic + graph expansion

The everyday "where is the artifact about X" tool. Smart mode (default) blends BM25 keyword + 1-hop graph expansion.

```python
forgeplan_search(query="authentication", limit=10)
forgeplan_search(query="auth", kind="adr", with_evidence=true)   # only ADRs with EVID linked
forgeplan_search(query="JWT", mode="semantic")                    # vector similarity (needs BGE-M3)
forgeplan_search(query="X", no_evidence=true)                    # find unbacked decisions
```

**Modes**: `keyword` / `semantic` / `smart` (default = keyword + semantic + graph).

**Filters**: `kind` / `status` / `depth` / `since` (date) / `with_evidence` / `no_evidence` / `no_expand`.

## 02.3 forgeplan_graph — mermaid dependency graph

Generates a mermaid diagram of all linked artifacts. Useful for human inspection + for agents needing "what depends on this".

```python
forgeplan_graph()                            # full graph (all relations)
forgeplan_graph(brownfield_only=true)        # only UC/GLOS/INV/SCEN/HYP/DM edges (issue #287 Phase F)
```

**Output**: mermaid markdown. Render in Markdown viewer or paste into mermaid.live for visual.

## 02.4 forgeplan_order — topological order

Returns artifacts in dependency order + a `ready` / `blocked` classification + cycle detection.

```python
forgeplan_order()
# → {"order": ["NOTE-001", "PRD-001", "RFC-001", ...],
#    "ready": [...], "blocked": [...], "cycles": []}
```

**Use case**: orchestrator scheduling. "What can I work on right now without unmet dependencies?"

**Gotcha**: only structural relations (`based_on`, `refines`, `supersedes`, `contradicts`) — `informs` does NOT block.

## 02.5 forgeplan_journal — chronological decision timeline

ADR / Note / Problem / Solution timeline (decision-kinds only) with R_eff scores + evidence status.

```python
forgeplan_journal()
forgeplan_journal(kind="adr")                   # only ADRs
forgeplan_journal(risk=true)                     # only at-risk decisions (R_eff < threshold)
```

**Use case**: "what decisions did we make in the last sprint" or "which ADRs lack evidence".
