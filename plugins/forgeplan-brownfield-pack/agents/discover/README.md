# Discover Agent — Brownfield Codebase Onboarding (forgeplan-brownfield-pack plugin)

> **Status**: shipped post-Sprint V (PRD-048). Migrated from standalone `forgeplan-marketplace/agents/discover/` to canonical plugin location.
> **Predecessor doc**: `SCAFFOLDING.md` in this directory — Sprint H pre-work with live MCP smoke results and gap analysis.

## What this agent does

The Discover Agent maps an existing (brownfield) codebase into a structured forgeplan artifact graph. It runs 7 sequential phases via the `forgeplan_discover_*` MCP suite, following a strict source-tier priority: code and git first, legacy docs last. The result is a set of NOTEs, PRDs, RFCs, PROBLEMs, and EVIDENCEs that reflect the actual state of the codebase — not what its documentation claims.

The standalone predecessor (pre-MCP, `forgeplan-marketplace/agents/discover/`) used manual `forgeplan_new` chains with a local state file for session tracking. This plugin agent replaces that approach with the native `forgeplan_discover_*` surface introduced in forgeplan v0.32.1, which auto-links all findings to a named session and returns a session summary on `discover_complete`. The standalone has been archived to `forgeplan-marketplace/agents/discover/_archive/`. Pass 2 (deepening) and Pass 3 (synthesis) were standalone-specific and depend on multi-session MCP state not yet available in v0.32.1; they are documented as planned for a future sprint.

## How to dispatch

### Via Task tool (Claude Code orchestrator)

```python
Task(
    subagent_type="forgeplan-brownfield-pack:discover",
    description="Brownfield onboarding of <project>",
    prompt="Run discovery in default mode against /path/to/project"
)
```

### Via /forge-cycle or /autorun

When `/forge-cycle` detects brownfield context (no `.forgeplan/` initialized or sparse artifact graph), it dispatches the discover agent automatically. No manual invocation needed for most workflows.

### Direct invocation (single-shot testing)

Dispatch via orchestrator for production use. Direct invocation is appropriate when testing the agent itself or running a one-off discovery in isolation.

## Three modes

| Mode | Project size | Time | What runs |
|------|:------------|:-----|:----------|
| default | <100K LOC | ~15-30 min | Pass 1 (7 phases) via single agent session |
| --deep | 100K-2M LOC | ~1-2 h | Pass 1 + Pass 2 deepening (planned — NOT in v1 plugin) |
| --full | 2M+ LOC | ~2-4 h | Pass 1 + Pass 2 + Pass 3 synthesis (planned — NOT in v1 plugin) |

The v1 plugin agent ships **Pass 1 only**. Pass 2 deepening and Pass 3 cross-cutting synthesis require multi-session MCP state that forgeplan v0.32.1 does not yet support. Mode flags are accepted and logged but `--deep` and `--full` fall back to Pass 1 behavior with a `NEED_USER_INPUT` sentinel warning.

## What it produces (7 phases)

| Phase | Source tier | Artifact kind | Purpose |
|-------|:-----------:|---------------|---------|
| `detect` | T1 | NOTE | Tech stack, manifests, entry points |
| `structure` | T1 | NOTE | Module tree up to 3 levels |
| `code` | T1 | PRD or RFC per major module | Public API, types, dependencies |
| `git` | T1 | PROBLEM | Hot files, refactor pressure, churn |
| `tests` | T2 | EVIDENCE | Test coverage snapshot |
| `docs` | T3 | NOTE (tagged `source=legacy-doc`) | Docs as-found; contradictions flagged |
| `synthesize` | mixed | EVIDENCE + PROBLEM | Cross-phase findings + contradiction report |

**Source tier rule**: if documentation says X but code does Y — code wins. The agent records the contradiction as a PROBLEM artifact in the `docs` or `synthesize` phase.

## 12 brownfield skills it orchestrates

Each phase instruction references the matching extraction skill from `plugins/forgeplan-brownfield-pack/skills/`:

1. **canonical-reproducer** — normalize tech stack identifiers (C10)
2. **causal-linker** — link cause-effect chains between findings (C5)
3. **hypothesis-triangulator** — promote or reject hypotheses from evidence (C6)
4. **intent-inferrer** — extract intent from code shape and structure (C3)
5. **interview-packager** — package open questions for domain owner interviews (C7)
6. **invariant-detector** — find invariants in validation logic and branch guards (C4)
7. **kg-curator** — curate the knowledge graph, deduplicate, retire stale items (C9)
8. **rag-packager** — package artifacts for RAG export (C12)
9. **reproducibility-validator** — verify canonical reproduction matches reality (C11)
10. **scenario-writer** — author Given-When-Then scenarios from use cases (C8)
11. **ubiquitous-language** — extract domain vocabulary from code, comments, DB columns (C1)
12. **use-case-miner** — mine user-facing use cases from code paths (C2)

See `SKILLS-INVENTORY.md` in the plugin root for the full C1-C12 reference.

## MCP tools used

| Tool | When called |
|------|------------|
| `mcp__forgeplan__forgeplan_discover_start` | Session initialization — returns `session_id` + 7-phase protocol |
| `mcp__forgeplan__forgeplan_discover_finding` | Once per artifact created during a phase |
| `mcp__forgeplan__forgeplan_discover_complete` | Session close — returns summary with all `artifact_id` values |
| `mcp__forgeplan__forgeplan_orphans` | Synthesize phase — surface unlinked artifacts |
| `mcp__forgeplan__forgeplan_contradictions` | Synthesize phase — surface logical contradictions across findings |

Optional (session-dependent):

- `forgeplan_coverage_business` — business coverage gap check in synthesize
- `forgeplan_hypothesis_promote` / `_hypothesis_status` — when hypotheses surface in code phase
- `forgeplan_interview_packet_draft` / `_interview_packet_ingest` — when domain gaps require stakeholder input

## Anomaly #14 handling

`forgeplan_discover_finding` returns `"status": "active"` in its response. This refers to **session** state (the session is open and recording), NOT artifact state. The created artifact is in `status: draft` until explicitly activated.

Consequence: findings accumulate as drafts unless an explicit activate step follows `discover_complete`. The agent handles this by emitting a `<<NEEDS_ACTIVATION: ARTIFACT-ID>>` sentinel for each finding created (Profile A Step 9b pattern). The orchestrator (`/forge-cycle` or `/autorun`) reads these sentinels and batch-activates findings after `discover_complete` returns.

If running the agent outside an orchestrator, call `forgeplan_activate(force=true)` on each `artifact_id` from the `discover_complete` summary before treating findings as part of the active artifact graph.

Upstream reference: filed as [forgeplan#292](https://github.com/ForgePlan/forgeplan/issues/292). Not yet fixed as of v0.32.1.

## State file (resume protocol)

`.forgeplan/discovery-state.json` persists across agent sessions. If present at agent start, the agent resumes from the last incomplete phase rather than starting fresh. The state file is deleted automatically after `discover_complete`.

```json
{
  "discovery_id": "DISC-001",
  "project": "<name>",
  "mode": "default|deep|full",
  "started_at": "<ISO 8601>",
  "session_id": "<from discover_start>",
  "pass_1": {
    "status": "in_progress",
    "phases_done": [],
    "artifacts": []
  }
}
```

**Important**: the `session_id` in this file must match an open session in forgeplan. If the session expired upstream, the agent calls `discover_start` again and writes a new `session_id`. Multi-machine resume is not supported — the state file is local to the machine where discovery began.

## Limitations

- Pass 2 (deepening) and Pass 3 (synthesis) are not in v1 — the agent runs Pass 1 only.
- `--deep` and `--full` mode flags are accepted but fall back to Pass 1 with a sentinel warning.
- Project size estimation is heuristic — verify the LOC estimate before choosing a mode.
- Resume protocol depends on the local `.forgeplan/discovery-state.json`; multi-machine session resume is not supported.
- `forgeplan_discover_finding` draft-vs-active ambiguity (Anomaly #14) requires orchestrator-side activation.

## Migration from standalone

Before Sprint V (PRD-048), the Discover Agent lived at `forgeplan-marketplace/agents/discover/` as a standalone, pre-MCP agent using manual `forgeplan_new` chains and `protocol.json` for phase definitions. As of 2026-05-22, that location has been archived to `forgeplan-marketplace/agents/discover/_archive/` and this plugin agent is the canonical location.

Key differences from the standalone:

| Aspect | Standalone (archived) | Plugin agent (this) |
|--------|----------------------|---------------------|
| Artifact creation | Manual `forgeplan_new` per finding | `forgeplan_discover_finding` — MCP-native, auto-linked |
| Session tracking | Local `state.json` + `protocol.json` | `discover_start` session_id + local state file |
| Phase protocol | `protocol.json` v3.2.0 (26 KB) | `discover_start` returns protocol inline |
| Pass 2 / Pass 3 | Supported (standalone multi-pass model) | NOT in v1 — planned post-v0.32.1 |
| Anomaly #14 | N/A (no session status field) | Requires `NEEDS_ACTIVATION` sentinel handling |

If you have an existing discovery state file from the standalone (`.forgeplan/discovery-state.json` with a non-MCP session ID), the plugin agent will detect the format mismatch and start a fresh discovery via `forgeplan_discover_start`. Delete the old state file to avoid the detection step.

## Prerequisites

- `forgeplan` CLI v0.32.1+ (`forgeplan health` should show a working project)
- Git repository — the agent uses `git log`, `git shortlog`, `git stat` for the `git` phase
- `forgeplan-brownfield-pack` plugin installed (`/plugin install forgeplan-brownfield-pack@ForgePlan-marketplace`)

## References

- **PRD-048** — Sprint V: this migration scope + acceptance criteria
- **EVID-075** — Sprint V closure evidence (verifies migration)
- **SCAFFOLDING.md** (this directory) — Sprint H pre-work: MCP live smoke results, gap analysis, design decisions
- **Standalone README** — `forgeplan-marketplace/agents/discover/README.md` (archived; source material for this doc)
- **AGENT-AUTHORING-GUIDE.md** — `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` — canonical Profile A pattern
- **12 skill folders** — `plugins/forgeplan-brownfield-pack/skills/`
- **forgeplan v0.32.1 release** — 9 brownfield MCP primitives including `discover_*` suite
- **forgeplan#292** — Anomaly #14 upstream issue (discover_finding status field ambiguity)
- **forgeplan#287** — Brownfield extraction MCP epic (Pass 2/3 deepening tracked here)
