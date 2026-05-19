---
name: progress-dashboard
description: |
  Methodology: Live state renderer (read-only snapshot, no new event system).
  EN: Renders structured snapshot of running orchestrator state — current sprint, phase, wave, agents in flight (via forgeplan_claims), TaskList progress, forgeplan_health, recent EVID, files modified count, ETA estimate. Read-only: consumes existing data sources (forgeplan MCP claims/health/list, in-session TaskList, .forgeplan/session.yaml if present, git log). Does NOT introduce a new event system. Single snapshot per invocation — user re-invokes for updated view. Use during long /sprint or /autorun runs when you want a "where are we" check without scrolling agent output.
  RU: Рендерит структурированный snapshot состояния запущенного оркестратора — текущий sprint, phase, wave, агенты в полёте (через forgeplan_claims), прогресс TaskList, forgeplan_health, недавние EVID, count файлов в коммитах, оценка ETA. Read-only: использует существующие data sources (forgeplan MCP claims/health/list, in-session TaskList, .forgeplan/session.yaml если есть, git log). НЕ создаёт новую event system. Один snapshot за вызов — пользователь перевызывает для обновления. Use во время долгих /sprint или /autorun когда нужно "где мы" без скролла agent output.
  Triggers: "forge progress", "where are we", "current state", "sprint status", "что происходит", "где мы сейчас", "статус спринта", "/forge-progress"
disable-model-invocation: true
allowed-tools: Read Bash(git log *) Bash(test *) Bash(ls *) Bash(cat *)
---

# progress-dashboard — live orchestrator state snapshot

A read-only renderer. One snapshot per invocation — re-invoke for a fresh view.
Does **not** write files, store state, or introduce any new event system.

## When to use / NOT to use

| Use | Do NOT use |
|---|---|
| `/sprint` or `/autorun` running — want "where are we" | After run completes → `/forge-report` |
| Mid-session pipeline phase check inside `/forge-cycle` | Daily standup → `/briefing` |
| Orchestrator needs a status block for a TeamCreate handoff | Just want artifact list → `forgeplan list` |
| | Real-time streaming → not supported; one-shot only |

---

## Data sources

| Source | What it provides | Priority |
|---|---|---|
| `mcp__forgeplan__forgeplan_claims` | Which artifacts are currently claimed by agents — "agents in flight" | 1 (highest) |
| In-session TaskList | Tasks with status: done / running / pending | 2 |
| `mcp__forgeplan__forgeplan_health` | Total artifacts, active/draft/orphan counts, health verdict | 3 |
| `mcp__forgeplan__forgeplan_list` with `status=draft` | Work in progress artifacts | 4 |
| `.forgeplan/session.yaml` | Sprint name, phase, wave meta (written by `/sprint` and `/autorun`) | 5 |
| `git log --oneline -10` | Recent commits — derive "files modified" count via `--shortstat` | 6 |
| `.forgeplan/state/<id>.yaml` | Per-artifact phase state (read only when session.yaml references an artifact) | 7 |

**MCP-first (per PRD-022):** prefer `mcp__forgeplan__forgeplan_claims/health/list` when MCP available.
CLI fallback: `forgeplan claims` / `forgeplan health` / `forgeplan list status=draft`.
If neither available: omit those sections, emit one-line warning "forgeplan unavailable — skipping artifact state".

---

## Process (6 steps)

### Step 1 — Detect session context

```bash
test -f .forgeplan/session.yaml && cat .forgeplan/session.yaml
```

Extract: `sprint_name`, `phase`, `wave_current`, `wave_total`, `session_id`, `started_at`.
If absent, label context "ad-hoc".

### Step 2 — Collect agents in flight

Call `mcp__forgeplan__forgeplan_claims` (MCP) or `forgeplan claims` (CLI).
Per claim: agent identity, artifact ID, elapsed = now − claim timestamp.
If no claims: render "— none —".

### Step 3 — Read TaskList progress

Scan current in-session TaskList. Count done/running/pending; group by phase label.
If no TaskList in session, omit TASKS section.

### Step 4 — Collect forgeplan health

Call `mcp__forgeplan__forgeplan_health` + `mcp__forgeplan__forgeplan_list(status="draft")`.
Extract: total/active/draft/orphan counts, verdict, top-5 draft artifacts by `updated_at`.

### Step 5 — Read git log

```bash
git log --shortstat -10 | grep -E "files? changed" | awk '{sum+=$1} END {print sum}'
git log --oneline -10 | grep -o "EVID-[0-9]*" | head -1
```

Derive total files modified; surface most recent EVID commit reference.

### Step 6 — Compute ETA and render

Apply ETA heuristic (see below). Emit full dashboard block.

---

## Output format

Emit as a single fenced text block. Use Unicode box-drawing characters for the frame.
All times in local wall-clock or ISO-8601 UTC — whichever is available.

```
═══════════════════════════════════════════════════════════════════
 FORGE PROGRESS  ·  <session_id or "ad-hoc">  ·  <timestamp>
═══════════════════════════════════════════════════════════════════

 SPRINT     <sprint_name>          (omit if no session.yaml)
 PHASE      <phase_name> (<X of N>)
 WAVE       <wave_current> of <wave_total>    (omit if no wave info)

 AGENTS IN FLIGHT (<count>)
   ▶ <pack>:<agent>    claim=<ARTIFACT-ID>  elapsed=<Xm Ys>
   ▶ <pack>:<agent>    claim=<ARTIFACT-ID>  elapsed=<Xs>
   — none —            (if no active claims)

 TASKS (<completed>/<total>)
   ✅ <Task group label>
   ✅ <Task group label>
   ▶  <Task group label>  (<done>/<subtotal> done)
   ⏳ <Task group label>

 FORGEPLAN HEALTH
   Total: <N> artifacts  •  <A> active  •  <D> draft  •  <O> orphans
   Verdict: <healthy | warnings | critical>
   In progress: <ARTIFACT-ID> — <title>, <ARTIFACT-ID> — <title>  (max 5)

 FILES MODIFIED (last 10 commits)
   <N> files

 RECENT EVID
   <EVID-NNN> — <title>  (most recent, from git log or forgeplan_list)
   — none yet —          (if no EVID commits found)

 ETA: ~<X> min remaining  (<basis>)
      (rough estimate — varies with agent dispatch parallelism)
═══════════════════════════════════════════════════════════════════
```

**Omission rules** — omit a section entirely (including its header) when:
- SPRINT/PHASE/WAVE: no `session.yaml` found
- AGENTS IN FLIGHT: MCP and CLI both unavailable (note this in a one-line warning above the block)
- TASKS: no TaskList in current session
- FILES MODIFIED / RECENT EVID: `git` not available in context
- ETA: insufficient signal (see ETA heuristic)

---

## ETA heuristic

Compute only when there is sufficient signal. Always add the caveat line.

| Context | Signal available | Calculation |
|---|---|---|
| Multi-wave sprint | `wave_current`, `wave_total`, `started_at` per wave | avg time per completed wave × remaining waves |
| forge-cycle pipeline | TaskList with timestamps | avg time per completed task × pending task count |
| autorun with phase count | Phase X of N, phase start time | elapsed / completed phases × remaining phases |
| No signal | none of the above | Omit ETA section entirely |

**Rules:**
- Round to nearest minute. Never show sub-minute precision ("~3 min", not "2m 47s").
- If remaining ≤ 1 min, show "< 1 min remaining".
- If calculation yields > 120 min, show "> 2 hr remaining" (don't false-precision large estimates).
- Always append: `(rough estimate — varies with agent dispatch parallelism)`
- Never show a negative ETA — if elapsed > estimate, show "overrun — no ETA" instead.

---

## Anti-patterns

| Anti-pattern | Rule |
|---|---|
| Daemonize / polling | One-shot only. No loops, no `watch`. Re-invoke for fresh snapshot. |
| Over-promise ETA | Omit when signal is weak. Always include caveat when shown. |
| New event system | Read existing state only. Never write to `.forgeplan/` or emit hooks. |
| Write files | Zero mutations. RENDERER only. Reaching for Write/Edit = out of scope. |
| Scope creep metrics | Git file count: OK. Full test runs, dep scans, external APIs: not OK. |

---

## Related skills

| Skill | When to use instead |
|---|---|
| [`forge-report`](../forge-report/SKILL.md) | Post-mortem after run completes — structured cards, not live state |
| [`briefing`](../briefing/SKILL.md) | Daily standup summary — yesterday/today/blockers format |
| [`sprint`](../sprint/SKILL.md) | To *execute* a sprint (wave-based, multi-agent) |
| [`autorun`](../autorun/SKILL.md) | Autonomous multi-phase orchestration |
| [`audit`](../audit/SKILL.md) | Deep audit of artifacts/code — not a status check |

---

## Forgeplan MCP integration (MCP-first per PRD-022)

This skill is **read-only** across all forgeplan tools it touches:

| MCP tool | Usage | Fallback |
|---|---|---|
| `mcp__forgeplan__forgeplan_claims` | Active agent claims — agents in flight | `bash forgeplan claims` |
| `mcp__forgeplan__forgeplan_health` | Artifact health verdict + counts | `bash forgeplan health` |
| `mcp__forgeplan__forgeplan_list` | Draft/in-progress artifacts (max 5) | `bash forgeplan list status=draft` |

This skill never calls: `forgeplan_new`, `forgeplan_update`, `forgeplan_link`,
`forgeplan_activate`, `forgeplan_claim`, `forgeplan_release`. If you see a call to
any write tool, that is a bug — raise it to the orchestrator.
