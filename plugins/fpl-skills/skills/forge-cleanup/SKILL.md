---
name: forge-cleanup
description: |
  Methodology: 3-tier pipeline self-healing (AUTO / ADI / USER classification per PRD-032 Sprint D; extended with 4 anomaly kinds in Sprint F PRD-034 + 1 anomaly kind in Sprint M PRD-039 = 9 total).
  EN: Explicit draft sweep skill for marketplace workspaces. Scans all draft artifacts via mcp__forgeplan__forgeplan_list, classifies each into 9 outcomes (ready_to_activate / incomplete / stale_unreferenced / ambiguous / orphan_link / mistyped_based_on / expired_evidence / phase_mismatch / link_direction_footgun) mapped to 3 resolution tiers (AUTO = silent activate with batch confirmation, ADI = FPF reasoning loop, USER = per-artifact explicit decision). Executes AUTO tier after user batch-confirm; dispatches ADI sub-agents for ambiguous cases; surfaces USER tier per artifact for explicit decisions. Use at end of /forge-cycle or /autorun runs, or manually when forgeplan_health shows accumulating drafts. Closes Anomaly #7 from Sprint A+B+C log.
  RU: Explicit-скилл для draft sweep маркетплейс воркспейсов. Сканирует все draft артефакты через MCP, классифицирует в 9 исходов (4 оригинальных + 4 Sprint F + 1 Sprint M: orphan_link / mistyped_based_on / expired_evidence / phase_mismatch / link_direction_footgun), мапит на 3 tier resolution (AUTO молча активирует, ADI запускает FPF reasoning loop, USER через AskUserQuestion). Применяет AUTO batch с подтверждением; диспатчит ADI sub-agents для ambiguous; surfaces USER per артефакт.
  Triggers: "forge cleanup", "draft sweep", "clean up drafts", "почисти drafts", "разгрести drafts", "/forge-cleanup"
disable-model-invocation: true
allowed-tools: Read Bash(test *) Bash(ls *) Bash(date *)
---

# forge-cleanup — 3-tier draft sweep with classification

Explicit recovery skill. One invocation = one full sweep of all drafts.
Classifies each into AUTO / ADI / USER / LEAVE, then executes with confirmation.

## When to use / when NOT to use

| Use | Do NOT use |
|---|---|
| End of /forge-cycle or /autorun session | Project just initialised — no drafts yet |
| `forgeplan_health` shows 5+ draft artifacts | Critical work mid-flight (another agent has claims) |
| Orchestrator missed the activate step | Single known artifact — `forgeplan_activate <ID>` directly |
| After dashboard shows stale drafts | Routine check without intent to act |

---

## Tier definitions

| Tier | Detection rule | Action |
|---|---|---|
| **AUTO** | kind=evid AND verdict set AND CL>0 AND links exist AND R_eff>0 | Activate after batch Y/n confirm |
| **ADI** | Partially complete OR ambiguous (some fields set, not all; or non-EVID with unclear state) | Dispatch `agents-pro:research-analyst` FPF loop |
| **USER** | age>7d AND no incoming links AND no outgoing links AND still draft | Emit `<<NEED_USER_INPUT>>` per artifact; never auto-deprecate |
| **LEAVE** | kind=evid but verdict/CL missing; clearly work-in-progress | No action; document in report |

**AUTO example:** `EVID-051 (verdict=Supports, CL=3, R_eff=1.0)` — fully complete, stuck because Profile B cannot self-activate.
**R_eff=0 guard:** if AUTO scoring returns R_eff=0 unexpectedly, demote to USER tier and surface a drift warning.
**Anti-loop guard:** build a `seen` set at sweep start; if the same artifact ID appears twice, skip and warn.

---

## Process (5 steps)

### Step 1 — Collect all drafts

MCP-first: `mcp__forgeplan__forgeplan_list(status="draft")` — returns `id`, `kind`, `title`, `updated_at`, `links[]`.
CLI fallback: `forgeplan list --status draft`.

### Step 2 — Score each artifact

MCP: `mcp__forgeplan__forgeplan_score(id="<ID>")` → extract `r_eff`, `verdict`, `congruence_level`, `age_days`.
CLI fallback: `forgeplan score <ID>`.

### Step 3 — Classify (first match wins)

**Pre-pass: link_direction_footgun detection (PRD-041)**

Before applying classification rules, run the graph-walk helper to surface directional violations:

```bash
# Requires: forgeplan CLI v0.31.0+, jq
# Output: NDJSON — one finding per line, or empty if graph is clean
scripts/detect_link_footguns.sh
```

CLI fallback note: script uses only `forgeplan graph --json` + `forgeplan get <id> --json` — no MCP required.
Any findings are added to the USER tier queue before the main classification sweep.

**Original 4 outcomes (Sprint D):**

1. kind=evid AND verdict set AND CL>0 AND links exist AND r_eff>0 → `ready_to_activate` (AUTO)
2. kind=evid AND (verdict missing OR CL=0 OR no links) → `incomplete` (LEAVE)
3. age_days>7 AND no incoming links AND no outgoing links → `stale_unreferenced` (USER)
4. partial completion, unclear state → `ambiguous` (ADI)
5. anything else work-in-progress → `incomplete` (LEAVE)

**Extended 4 anomaly kinds (Sprint F PRD-034):**

| Outcome | Detection rule | Tier | Action |
|---|---|---|---|
| `orphan_link` | artifact has `links[].target` pointing to nonexistent artifact ID (`forgeplan_get` returns 404) | USER | Emit `<<NEED_USER_INPUT>>` — propose manual review (deleted? renamed? typo?) |
| `mistyped_based_on` | EVID linked to PRD via `based_on` relation (should be `informs`) — cascades CL penalty in R_eff scoring | USER (until forgeplan#286 ships unlink primitive — then ADI) | Until unlink available: add parallel `informs` link + note cascade is stuck — surface to user |
| `expired_evidence` | EVID with `valid_until` in past, still linked active to parent | USER | Emit `<<NEED_USER_INPUT>>` — propose: refresh evidence (re-test/re-audit) OR waive with note |
| `phase_mismatch` | artifact has status=active AND phase=shape/validate (early-cycle phase) AND r_eff>0 | AUTO | Advance phase via `mcp__forgeplan__forgeplan_phase_advance` |
| `link_direction_footgun` | `supersedes` link where source is older than target (newer artifact is target instead of source) OR `informs` link from PRD/RFC to EVID (should be EVID→PRD; new artifacts inform old, not vice versa) | USER | Emit `<<NEED_USER_INPUT>>` — propose: unlink + relink in correct direction (use CLI `forgeplan unlink` v0.31+ then `forgeplan_link`) |

## New anomaly kinds (Sprint F PRD-034 extension)

Four anomaly kinds from the `mm-pipeline-anomalies` catalog added to the classification sweep.

1. **orphan_link** — Usually means an artifact was deleted or superseded after another had already linked to it. Surfaced to user because the semantic intent is ambiguous: should the dead link be removed? Should the target be recreated? Should the source artifact be deprecated? Auto-resolution is unsafe — requires human judgement.

2. **mistyped_based_on** — Session-wide footgun observed in Sprint A+B+C+D era (PRD-021/022 stuck R_eff=0 due to CL cascade from wrong relation type). Upstream `forgeplan#286` will add a `forgeplan_unlink` primitive to fix properly. Until that ships, `/forge-cleanup` surfaces the artifact to the user with a concrete workaround: add a parallel `informs` link so R_eff recovers, and note the `based_on` link is stuck and pending cleanup once the primitive lands.

3. **expired_evidence** — Supports forgeplan's evidence decay model (B.3.4). An EVID with a `valid_until` date in the past silently degrades R_eff of the parent artifact without any visible signal. Without active surface, pipelines accumulate invisible technical debt in confidence scoring. User must choose: re-test/re-audit to produce fresh evidence, or explicitly waive with a documented justification.

4. **phase_mismatch** — Common after sprint closure when `forgeplan_phase_advance` is omitted. An artifact can have `status=active` (correct) but `phase=shape` or `validate` (stale early-cycle value). AUTO tier is safe here because phase advancement is append-only in the audit log — it is reversible in principle and carries no semantic loss. Multi-signal gate (status=active AND early phase AND R_eff>0) prevents false positives on genuinely incomplete artifacts.

5. **link_direction_footgun** (Sprint M PRD-039 — Anomalies #15/#16) — `forgeplan_link` accepts source→target for any direction; backward links create semantically wrong relations silently. Two detection patterns:
   - **supersedes inversion**: source.created_at < target.created_at AND relation=supersedes (newer should supersede older; source is older means it's the loser, not the winner)
   - **informs inversion**: source.kind in {prd, rfc} AND target.kind=evidence AND relation=informs (evidence gives info to PRD/RFC, not other way around)
   USER tier because auto-detection has edge cases (informs PRD→PRD for refines-style relationships is legitimate). Surfaces with explicit unlink+relink CLI commands ready to paste. Workaround for v0.31.0: `forgeplan unlink <src> <dst> --relation <rel>` works in CLI. Once forgeplan v0.32.0 lands `forgeplan_unlink` MCP, this anomaly kind upgrades to ADI tier.

---

### Step 4 — Display summary and prompt

Render output block (see Output format). Prompt: `Apply AUTO-RESOLVE batch now? [Y/n]`
- Y: execute Step 5 AUTO actions, then prompt USER tier per artifact.
- n: display summary only; no mutations.

### Step 5 — Execute resolutions

**AUTO:** `mcp__forgeplan__forgeplan_activate(id="<ID>")` — CLI fallback: `forgeplan activate <ID>`.

**ADI:** dispatch sub-agent:
```
Task({ subagent_type: "agents-pro:research-analyst",
       prompt: "Classify artifact <ID> <title>. FPF ADI: 3 hypotheses → deduction → induction.
                Return one of: keep-active / deprecate / needs-work / escalate-user.
                Use forgeplan_get(<ID>) + forgeplan_score(<ID>)." })
```

**USER:** emit `<<NEED_USER_INPUT: <ID> — <title> — Proposed: deprecate (age=<N>d, no referrers). Confirm? [Y/n]>>`
Or AskUserQuestion when invoked interactively.

**LEAVE:** no action; list in final report.

---

## Output format

```
═══════════════════════════════════════════════════════════
 FORGE CLEANUP — draft sweep  •  <timestamp>
═══════════════════════════════════════════════════════════

 AUTO-RESOLVE (<N>) — will activate without prompting
   ✓ EVID-051  (verdict=Supports, CL=3, R_eff=1.0)
   ✓ EVID-052  (verdict=Supports, CL=3, R_eff=1.0)

 ADI DISPATCH (<N>) — sub-agent reasoning needed
   ? PRD-022  (active but old, weakest_link cascade — investigate)

 USER DECISION (<N>) — confirm each
   ? PRD-013  (skill expansion roadmap, 42d old, no referrer — deprecate?)
   ? NOTE-002  (Node.js 20 deadline, 22d old — keep active?)

 LEAVE AS-IS (<N>) — incomplete or work-in-progress
   - EVID-049  (no verdict yet)

 Total: <X> drafts scanned • <A> auto • <D> adi • <U> user • <L> leave
═══════════════════════════════════════════════════════════
Apply AUTO-RESOLVE batch now? [Y/n]
```

After execution, append:

```
 RESULT
   Activated: <N>  (<IDs>)       ADI resolved: <N>
   Deprecations confirmed: <N>   Left untouched: <N>
   Errors: <N>  (<IDs + messages if any>)
 NEXT: run /forge-progress to verify dashboard
═══════════════════════════════════════════════════════════
```

---

## Anti-patterns

| Anti-pattern | Rule |
|---|---|
| Auto-deprecate stale drafts | USER tier only — never deprecate without explicit per-artifact confirmation |
| Activate EVID with R_eff=0 | Drift signal — demote to USER tier, surface warning, investigate first |
| Infinite loop on same artifact | Anti-loop guard: seen-set at sweep start; skip any ID encountered twice |
| Sweep non-draft artifacts | Scan drafts only — active/superseded/deprecated are out of scope |
| Skip batch confirmation | Always show summary and `[Y/n]` prompt before executing AUTO tier |

---

## Related skills

- [`progress-dashboard`](../progress-dashboard/SKILL.md) — read state before; re-invoke after to verify
- [`agent-advisor`](../agent-advisor/SKILL.md) — advises ADI dispatch agent when ambiguous
- [`forge-report`](../forge-report/SKILL.md) — post-mortem after completed cleanup run
- [`autorun`](../autorun/SKILL.md) / [`sprint`](../sprint/SKILL.md) — invoke forge-cleanup at session/sprint wrap

---

## Forgeplan MCP integration (MCP-first per PRD-022)

**Tool selection:** prefer MCP tools; fall back to CLI when MCP unavailable.

| MCP tool | Usage | CLI fallback |
|---|---|---|
| `mcp__forgeplan__forgeplan_list` | Collect draft artifacts | `forgeplan list --status draft` |
| `mcp__forgeplan__forgeplan_score` | R_eff + verdict + CL | `forgeplan score <id>` |
| `mcp__forgeplan__forgeplan_get` | Full body for ADI context | `forgeplan get <id>` |
| `mcp__forgeplan__forgeplan_activate` | Execute AUTO resolutions | `forgeplan activate <id>` |
| `mcp__forgeplan__forgeplan_deprecate` | Confirmed USER deprecations | `forgeplan deprecate <id> --reason ...` |
| `mcp__forgeplan__forgeplan_phase_advance` | Advance phase for `phase_mismatch` AUTO resolution | `forgeplan phase-advance <id>` |

This skill never calls: `forgeplan_new`, `forgeplan_update`, `forgeplan_link`, `forgeplan_claim`, `forgeplan_release`.
Any call to those is a bug — raise to orchestrator.

References: PRD-032 FR-004, FR-005 (Sprint D — Pipeline self-healing framework).
