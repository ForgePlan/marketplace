---
name: forge-cleanup
description: |
  Methodology: 3-tier pipeline self-healing (AUTO / ADI / USER classification per PRD-032 Sprint D).
  EN: Explicit draft sweep skill for marketplace workspaces. Scans all draft artifacts via mcp__forgeplan__forgeplan_list, classifies each into 4 outcomes (ready_to_activate / incomplete / stale_unreferenced / ambiguous) mapped to 3 resolution tiers (AUTO = silent activate with batch confirmation, ADI = FPF reasoning loop, USER = per-artifact explicit decision). Executes AUTO tier after user batch-confirm; dispatches ADI sub-agents for ambiguous cases; surfaces USER tier per artifact for explicit decisions. Use at end of /forge-cycle or /autorun runs, or manually when forgeplan_health shows accumulating drafts. Closes Anomaly #7 from Sprint A+B+C log.
  RU: Explicit-скилл для draft sweep маркетплейс воркспейсов. Сканирует все draft артефакты через MCP, классифицирует в 4 исхода (ready_to_activate / incomplete / stale_unreferenced / ambiguous), мапит на 3 tier resolution (AUTO молча активирует, ADI запускает FPF reasoning loop, USER через AskUserQuestion). Применяет AUTO batch с подтверждением; диспатчит ADI sub-agents для ambiguous; surfaces USER per артефакт.
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

1. kind=evid AND verdict set AND CL>0 AND links exist AND r_eff>0 → `ready_to_activate` (AUTO)
2. kind=evid AND (verdict missing OR CL=0 OR no links) → `incomplete` (LEAVE)
3. age_days>7 AND no incoming links AND no outgoing links → `stale_unreferenced` (USER)
4. partial completion, unclear state → `ambiguous` (ADI)
5. anything else work-in-progress → `incomplete` (LEAVE)

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

This skill never calls: `forgeplan_new`, `forgeplan_update`, `forgeplan_link`, `forgeplan_claim`, `forgeplan_release`.
Any call to those is a bug — raise to orchestrator.

References: PRD-032 FR-004, FR-005 (Sprint D — Pipeline self-healing framework).
