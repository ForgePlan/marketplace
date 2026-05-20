# Hindsight Optimization Findings — Sprint R (2026-05-21)

> Deep-research synthesis of Hindsight MCP API + actual usage gaps in ForgePlan marketplace. Action items below; underlying research from `research-analyst` sub-agent dispatch 2026-05-21.

---

## Bank state snapshot (verified 2026-05-21)

| Metric | Value |
|---|---:|
| Bank ID | `forge-marketplace` |
| Memories | 3036 (was 2826 at Sprint N) |
| Documents | 79 (was 75) |
| Links | 109219 (was 105030) |
| Mental models | 10 (unchanged since Sprint Q) |
| Memory types | world=1386, observation=1323, opinion=0 |

Bank healthy. Growth ~7% week-over-week (2826→3036 memories).

---

## 13-tool API surface (verified 2026-05-21)

| Layer | Tool | Purpose |
|---|---|---|
| **Memory** | `memory_recall(query, budget?, types?, max_tokens?)` | Semantic search — raw fragments |
| **Memory** | `memory_reflect(query)` | LLM-synthesized coherent answer |
| **Memory** | `memory_retain(content, context?, tags?)` | Save fact/lesson manually |
| **Memory** | `memory_status` | Bank health stats |
| **Memory** | `memory_get_current_bank` | Confirm active bank |
| **Memory** | `memory_set_mission(mission)` | Set bank persona (one-time) |
| **Models** | `mental_model_list` | List pages (content=null lazy) |
| **Models** | `mental_model_get(id)` | Fetch synthesized content |
| **Models** | `mental_model_create(id, name, source_query)` | Create living page |
| **Models** | `mental_model_update / _delete` | Lifecycle |
| **Docs** | `document_ingest(title, content, tags?)` | Ingest text as document |
| **Docs** | `document_ingest_file(path, tags?)` | Ingest from file path |

---

## Decision tree: when to use what

```
Need to save knowledge?
├── Single fact/lesson (non-obvious) → memory_retain (or let auto-hook handle)
├── Stable finalized artifact (PRD/ADR/RFC after activate) → document_ingest_file
└── Topic synthesized across many memories → mental_model_create (only if recurring 3+ times)

Need to retrieve knowledge?
├── Quick raw lookup ("find memories about X") → memory_recall
├── Coherent summary ("what do we know about X?") → memory_reflect
└── Recurring question with existing page → mental_model_get (free, pre-computed)
```

---

## Gaps identified vs current usage

### Gap 1: `HINDSIGHT_RETAIN_TOOL_CALLS=false` by default

**Impact**: Agent tool calls (the bulk of `/forge-cycle` and `/autorun` workflow execution) are NOT retained. Sprint A-Q has ~40 sub-agent dispatches with rich tool-call content — none in memory.

**Recommendation**: Set `HINDSIGHT_RETAIN_TOOL_CALLS=true` in env config for orchestrator sessions. Profile C subagents (read-only) can keep it false.

**Setup location**: `~/.claude/.env` или per-project `.env` file. Restart Claude Code after.

### Gap 2: `document_ingest_file` not wired into `forgeplan_activate` flow

**Impact**: 70+ activated PRDs in workspace, 79 documents in bank. Ratio suggests **most active PRDs are NOT ingested** as searchable documents. Future subagents can't semantic-search over PRD bodies via Hindsight.

**Recommendation**: Add to `/forge-cycle` Phase 6.5 or `/autorun` after activate: `document_ingest_file(.forgeplan/<kind>/<ID>-*.md, tags=[<kind>, "active"])`.

**Optional**: Run `/fpl-hsmem:bootstrap` once to catch up backlog.

### Gap 3: Bank `memory_set_mission` status unknown

**Impact**: Without explicit bank mission, fact-extraction LLM has no focus — extracts whatever it finds. May dilute signal vs noise in memory growth.

**Recommendation**: Set bank mission via:
```
memory_set_mission(
  "ForgePlan marketplace — focus on plugin architecture decisions, "
  "agent denylist patterns, sprint anomalies, forgeplan artifact "
  "lifecycle lessons, and cross-sprint continuity. Ignore exploratory "
  "tangents and routine tool call confirmations."
)
```

One-time call. Visibility note: there's no `memory_status` field showing current mission — needs `memory_reflect("what is the bank mission?")` to verify.

### Gap 4: `HINDSIGHT_RECALL_TYPES` filter excludes `observation`

**Impact**: Default filter is `["world", "experience"]`. Bank has 1323 observations (43% of total memories) — never surfaced via auto-recall hook.

**Recommendation**: Set `HINDSIGHT_RECALL_TYPES=world,experience,observation` for queries about patterns/conventions.

### Gap 5 (resolved): Mental model content null — **was false alarm**

`mental_model_list` returns `content=null` BY DESIGN (lazy fetch for performance). Actual content via `mental_model_get(id)` is populated correctly. Verified 2026-05-21 on `mm-pipeline-anomalies` and `mm-evid-body-convention` — both return real synthesized content.

**No action**.

---

## Anthropic `memory: project` — DESIGN REJECTED

Sprint Q attempted to add `memory: project` field to 8 forgeplan-aware agents. Two issues:

1. **Sub-agent overreported** — `memory: project` never actually written to any file (Anomaly #21).
2. **Even if applied** — Anthropic docs confirm field **force-enables Read/Write/Edit, overriding `disallowedTools` denylist**. This breaks B2 paradigm for Profile B reviewers AND for Profile A creators (who write via MCP, not source files).

**Decision**: Do NOT use `memory: project` in ANY profile. Hindsight bank covers the use case:
- Cross-session knowledge ↔ `memory_recall` / `memory_reflect`
- Per-agent specialization ↔ subagent body + skills preload (already done Sprint Q)
- Recurring synthesized pages ↔ `mental_model_*`

**Memory architecture (canonical)** — 3 layers, none Anthropic-native:

```
Layer 1 — Hindsight memories (recall/retain)
  3036 facts, auto-hook recall on UserPromptSubmit
  Cross-session, cross-agent, queryable

Layer 2 — Hindsight documents (document_ingest)
  79 stable artifacts ingested
  Should grow to ~70+ as backlog ingested (Gap 2 fix)

Layer 3 — Hindsight mental models (mental_model_*)
  10 living pages, auto-refresh on consolidation
  Free pre-computed answers to recurring questions
```

---

## Action items (priority order)

1. **HIGH** — Update `.env` with `HINDSIGHT_RETAIN_TOOL_CALLS=true` (Gap 1)
2. **HIGH** — Add `document_ingest_file` wire to `/forge-cycle` Phase 6.5 (Gap 2)
3. **MEDIUM** — Call `memory_set_mission` once for `forge-marketplace` bank (Gap 3)
4. **MEDIUM** — Set `HINDSIGHT_RECALL_TYPES=world,experience,observation` env (Gap 4)
5. **LOW** — Bootstrap document ingest for 70+ backlog PRDs (Gap 2 catch-up)

---

## References

- Sprint R Research dispatch 2026-05-21 — research-analyst sub-agent (a943ce779963ec9a9)
- `plugins/fpl-hsmem/USAGE.md` — primary source for recall/reflect/document/mental_model decision rules
- `plugins/fpl-hsmem/CONFIGURATION.md` — env var reference
- `~/.claude/rules/hindsight.md` — global Hindsight discipline rules
- `mm-evid-body-convention`, `mm-pipeline-anomalies` — verified populated via `mental_model_get`
