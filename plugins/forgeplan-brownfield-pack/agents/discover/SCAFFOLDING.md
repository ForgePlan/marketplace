# Sprint H Pre-Work — `discover` agent scaffolding

> **Status**: pre-work doc — captures Sprint H findings from forgeplan v0.31.0 live smoke before full migration in Sprint H proper (gated on forgeplan v0.32.0).
> **Filled**: 2026-05-20 by Task #72 (discover_* live smoke + scaffolding plan)
> **Next step**: when v0.32.0 lands, use this doc to author `discover.md` agent body + migrate standalone `agents/discover/` into this plugin.

---

## What this directory will become

`plugins/forgeplan-brownfield-pack/agents/discover/` will host the canonical brownfield Discover Agent — a **Profile A creator** that wraps the `forgeplan_discover_*` MCP suite to map an existing codebase into forgeplan artifacts (NOTEs / PRDs / RFCs / PROBLEMs / EVIDENCEs).

Files planned (post-v0.32):
- `discover.md` — agent body (Profile A, model=inherit, color=#2563EB)
- `README.md` — pointer + usage examples + frontmatter explanation
- `SCAFFOLDING.md` (this file) — pre-work findings; archived after agent ships

## Source material

| Asset | Location | Status | Notes |
|---|---|---|---|
| Standalone agent body | `forgeplan-marketplace/agents/discover/agent.md` (18 KB) | LEGACY | 4-layer multi-pass model with explicit resume-from-state; Pass 1/2/3 |
| Standalone protocol | `forgeplan-marketplace/agents/discover/protocol.json` (26 KB) | LEGACY | Pre-MCP; defines layers + tier rules + state file shape |
| Standalone README | `forgeplan-marketplace/agents/discover/README.md` (18 KB) | LEGACY | Usage examples, gives the "code first, docs last" methodology |
| 12 brownfield skills | `plugins/forgeplan-brownfield-pack/skills/*` | ACTIVE | Used by agent (canonical-reproducer, causal-linker, hypothesis-triangulator, intent-inferrer, interview-packager, invariant-detector, kg-curator, rag-packager, reproducibility-validator, scenario-writer, ubiquitous-language, use-case-miner) |
| MCP discover tools | `mcp__forgeplan__forgeplan_discover_{start,finding,complete}` | LIVE v0.31.0 | Verified roundtrip GREEN (Sprint H pre-work smoke 2026-05-20) |

---

## MCP API surface (verified v0.31.0)

### `discover_start(project_name) → session`

Returns:
```jsonc
{
  "session_id": "disc-<YYYYMMDD>-<HHMMSS>",
  "current_phase": "detect",
  "project_name": "...",
  "status": "started",
  "protocol": {
    "version": "1.0",
    "phases": [ /* 7 phases */ ],
    "source_tier_rules": { "t1": [...], "t2": [...], "t3": [...] }
  }
}
```

**7 linear phases**:
1. `detect` — manifests, tech stack, entry points → tier 1, NOTE
2. `structure` — module tree up to 3 levels → tier 1, NOTE
3. `code` — entry points, types, public API → tier 1, PRD/RFC per major module
4. `git` — log/shortlog/stat, hot files, refactor patterns → tier 1, PROBLEM
5. `tests` — find tests, estimate coverage → tier 2, EVIDENCE
6. `docs` — README/docs/wiki tagged `source=legacy-doc` → tier 3, NOTE
7. `synthesize` — cross-phase EVIDENCE + PROBLEM, then `discover_complete`

### `discover_finding(session_id, phase, tier, kind, title, body, source_files?) → artifact`

Creates artifact, links to session. Returns:
```jsonc
{
  "artifact_id": "NOTE-011",
  "phase": "detect",
  "tier": 1,
  "status": "active",  // ⚠ See Anomaly #14 below
  "session_id": "...",
  "total_findings": 1
}
```

### `discover_complete(session_id) → summary`

Returns:
```jsonc
{
  "session_id": "...",
  "status": "completed",
  "artifacts_created": ["NOTE-011"],
  "phase_counts": { "detect": 1 },
  "tier_counts": { "1": 1 },
  "total_findings": 1,
  "completed_at": "<ISO 8601>"
}
```

`_next_action` hints `forgeplan_health` to validate.

---

## Anomalies surfaced (Sprint H pre-work live smoke)

### Anomaly #14 — `discover_finding` response `status` field is session status, not artifact status

**Symptom**: response says `"status": "active"`. Operator assumes artifact is active. Subsequent `deprecate` fails: `Invalid transition: draft → deprecated`.

**Root cause**: `status: active` in the response refers to the **session** (session is open and recording). The created artifact is actually `draft`. Verified via `forgeplan_health` after `discover_complete`: smoke artifact appeared in `orphans` list AND `by_status: draft`.

**Workaround**:
1. Treat `discover_finding` return as "draft artifact created, recorded against session".
2. Profile A or orchestrator MUST call `forgeplan_activate(artifact_id, force=true)` after each finding (or after `discover_complete`) for findings to count toward R_eff.
3. Alternative: review draft findings post-session, activate only validated ones (synthesize phase output).

**Impact**: brownfield findings accumulate as drafts unless explicit activate step. Combined with Anomaly #7 (EVIDs stuck in draft), this is the same root cause — Profile A/B agents not auto-activating creations.

**Recommendation**: file upstream IF v0.32.0 doesn't address. Options:
- Rename response field to `session_status` for clarity.
- Auto-activate findings at `discover_complete` time (would be safe — synthesize phase confirms findings).
- Add `auto_activate: true` parameter to `discover_finding`.

**Tracking**: not yet filed (decide post-v0.32). Documented in CLAUDE.md alongside #12/#13/#290/#291.

---

## Standalone → MCP gap analysis

| Standalone feature | MCP support | Notes |
|---|:---:|---|
| 7 phase linear protocol | ✅ via `discover_start` | MCP protocol matches standalone phases (detect/structure/code/git/tests/docs/synthesize) |
| Tier 1/2/3 rules | ✅ via `discover_start` | MCP `source_tier_rules` field |
| Artifact creation per phase | ✅ via `discover_finding` | Replaces standalone's manual `forgeplan_new` chains |
| Session linking (auto) | ✅ via session_id | Standalone tracked via state file |
| Health validation at end | ✅ via `_next_action` hint | Standalone called manually |
| **4-layer multi-pass model** (Pass 1 → 2 → 3) | ❌ MCP is linear | Sprint H scope: wrap MCP with multi-pass orchestrator |
| **Resume-from-state** (`.forgeplan/discovery-state.json`) | ❌ MCP session = single-shot | Sprint H scope: wrapper writes state file alongside session |
| **Deepening passes** (Pass 2 enhances existing artifacts) | ❌ MCP creates only | Sprint H scope: post-session Profile D `artifact-maintainer` dispatch |
| **Cross-cutting layer** (Layer 3) | ❌ no first-class support | Sprint H scope: route to synthesize phase + manual link |
| **Modes** (default/deep/full) | ❌ no MCP parameter | Sprint H scope: wrapper interprets mode → controls pass count |

**Conclusion**: MCP provides the **structured artifact creation surface** that was missing from standalone. The **multi-pass orchestration** stays in the agent body — that's the "3 extensions" likely planned for forgeplan#287.

---

## Sprint H proper — design decisions to make

When v0.32.0 lands, this scaffolding informs the following decisions:

1. **Profile**: A (creator) — agent calls `forgeplan_discover_finding` which mutates artifact graph. Disallow `forgeplan_activate` to keep clean separation (orchestrator activates post-synthesize).
2. **Mode dispatch**: keep standalone's `default | deep | full` → mode determines whether agent stops after Pass 1 (synthesize only) or proceeds to Pass 2 (deepening) + Pass 3 (cross-cutting).
3. **State file location**: keep `.forgeplan/discovery-state.json` (standalone convention) — wraps MCP session_id + records pass progress.
4. **Resume protocol**: agent checks state file at start; if found, calls `discover_start` only if no open session_id matches.
5. **Anomaly #14 handling**: Step N+1 after `_complete` = activate-all-findings via batch `forgeplan_activate` (if `auto_activate` parameter not added upstream).
6. **Integration with 12 existing brownfield skills**: each phase's instructions reference the corresponding skill (e.g. `detect` cites `canonical-reproducer` for tech stack normalisation).
7. **Plugin manifest**: add `"discover"` to `plugins/forgeplan-brownfield-pack/.claude-plugin/plugin.json` → `components.agents`.

---

## Open questions for forgeplan v0.32.0

To verify on v0.32 ship:

- Is Anomaly #14 fixed (response field renamed OR auto-activate)?
- Is there a `discover_resume` MCP tool for multi-session work? (Sprint H deepening passes need this)
- Are the "3 extensions" from forgeplan#287 about: (a) deepening, (b) cross-cutting layer, (c) modes — or something else?
- Does `discover_complete` chain to other phase outputs (e.g. auto-link findings as `informs` to project root)?
- Is there a `discover_session_list` tool to find resumable sessions?

---

## Refs

- forgeplan#287 (OPEN) — Brownfield extraction MCP epic
- forgeplan#290 (OPEN) — release_notes split-repo (Anomaly #12)
- forgeplan#291 (OPEN) — restore-to-draft FSM (Anomaly #13)
- PRD-026 — Forgeplan-aware agent layer (17 canonical agents, CRUD-R-A matrix)
- PRD-037 / EVID-063 — Sprint J+K live MCP tool exercise (precedent for Sprint H methodology)
- SPRINT-A-E-RETROSPECTIVE.md ML-9 — real-world exercise > desk review (this doc validates)
- SPRINT-A-E-RETROSPECTIVE.md ML-10 — verdict taxonomy: discover_* = **DEFERRED → RECOMMENDED-INTEGRATE** post-v0.32 (provisional)
