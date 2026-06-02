---
name: riper
description: RIPER methodology orchestrator — Research → Innovate → Plan → Execute → Review — the FOURTH instance of the AD/AID-PDLC sub-cycle contract (ADR-010 / RFC-018). Drives a bug / scoped change / investigation in an EXISTING active system through five modes, MAIN-SESSION-orchestrated (hook-gate=No → no dispatched master, no hook), with a mandatory independent C4 verifier at every mode gate and — uniquely — a dedicated C4+C6 on the non-freezable Research product (a Research NOTE + an `## Pinned revision` EVID + a Plan-gate pin-freshness re-check): RIPER is the first instance to exercise ADR-010's conditional-freeze path end-to-end. Each phase delegates to existing fpl-skills (/research, /refine or /fpf-decompose, /rfc create, /sprint or /forge-cycle, /audit) with explicit phase tracking. **MCP-first per PRD-022 Tier A** — forgeplan artifact creation uses `mcp__forgeplan__forgeplan_new` + `_link` + `_validate` when MCP is available; CLI fallback (`bash forgeplan ...`) only when MCP server not connected. Triggers (EN/RU) — "riper", "research innovate plan execute review", "/riper", "пройди riper", "RIPER цикл", "production bug", "investigate before fixing".
origin: forgeplan
disable-model-invocation: true
allowed-tools: Read Write Edit Bash(test *) Bash(forgeplan *) Bash(command *) Bash(grep *) Bash(ls *)
---

# riper — RIPER methodology orchestrator

Walks a task through the five RIPER phases — **Research → Innovate → Plan → Execute → Review** — by delegating to the right existing fpl-skill at each phase, with explicit progress tracking. RIPER is not a separate engine; it's a vocabulary overlay on top of skills you already have.

> **`/riper` is the contract-conformant methodology for a bug / scoped change / investigation in an EXISTING active system** (smith Row 4 — "investigate before you touch"). For a clean new feature use `/sparc` (Row 3); for greenfield use `/bmad` (Row 1); for plain forgeplan-vocabulary orchestration with no Research-gate use `/forge-cycle`. The vocabulary-overlay delegation below is how each mode is *executed*; the contract section is what makes this an ADR-010 instance (mandatory per-gate C4 + the non-freezable Research C4+C6) — which `/forge-cycle` does NOT have.

---

## The ADR-010 contract this instantiates (RFC-018)

RIPER is the **fourth instance** of the AD/AID-PDLC sub-cycle contract (ADR-010); peers are `/tdd` (RFC-012), `/bmad` (RFC-013), `/sparc` (RFC-016). The ADR-012 **hook-gate** asks: does this methodology warrant a *fail-closed PreToolUse hook* binding human/out-of-band edits (as TDD's test-immutability and BMAD's no-code-before-plan do)? For RIPER the answer is **hook-gate=No**: there is **no dispatched master agent and no fail-closed hook** — the **MAIN SESSION orchestrates** the walk, dispatching each mode agent + each C4 verifier as a separate isolated context and activating each EVID before the next mode. (A dispatched orchestrator subagent cannot nest-dispatch the mode agents — proven in the SPARC dogfood, EVID-165 — so hook-gate=No instances have no dispatched executor; the main session is it.)

| Contract | RIPER instance |
|---|---|
| **C1 Entry** | A scoped bug / change / investigation against an EXISTING active system (Row 4). Refuse greenfield (→ `/bmad`) and a clean new feature (→ `/sparc`); don't advance a mode whose input isn't ready (Plan requires the Research C6 EVID=SUFFICIENT **and a fresh pin**). |
| **C2 Master** | the MAIN SESSION (hook-gate=No). This skill is the codified walk contract; the main session is the dispatcher. |
| **C3 Mode agents** | Research=`research-analyst` (+`debugger`/`error-detective` for bugs) → Innovate=`research-analyst`+`adr-architect` → Plan=`adr-architect`/`specification` → Execute=`coder` (optionally the TDD sub-cycle) → Review=`evidence-recorder`. |
| **C4 Verifier** | mandatory, independent (different fresh context each — the addition over canonical RIPER, which has none): **Research-gate=`artifact-reviewer`** (the novel one — see below); Plan-gate=`architect-reviewer` (+`system-dev` for large blast-radius); Execute-gate=`tester`+`code-reviewer`. |
| **C5 Enforcement** | hook-gate=No — no hook. Phase-ordering (no `coder` dispatch until the Plan RFC is `active`) + the **Deviate-Return-to-Plan** rule + a read-only Research agent (structural for `research-analyst`; social for the write-capable bug agents — see the enforcement note). |
| **C6 Exit** | each gate emits an EVIDENCE carrying its C4 verdict + identity; the Research gate's EVID carries a `## Pinned revision` section (the C6 record for the non-freezable Research NOTE); the Review EVIDENCE is the terminal exit. The main session activates (sentinel → activate). |

### Per-mode HARD constraints (name them; enforce socially + at the tool layer)

- **Research** — gather information ONLY; **forbidden**: suggestions, plans, code, specs. Output: a Research NOTE (below).
- **Innovate** — explore approaches; ideas ONLY; **forbidden**: binding specs, code.
- **Plan** — produce an exhaustive plan (an RFC); **forbidden**: any code, even examples. The Plan RFC going `active` IS the Plan-approval gate.
- **Execute** — implement EXACTLY the plan; **forbidden**: any deviation. **Deviate-Return-to-Plan:** if Execute hits something unplanned, STOP and return to Plan — do not improvise (caught at the Execute C4 if violated).
- **Review** — validate Execute against Plan; **forbidden**: changes; flag every deviation.

**Enforcement is NOT uniform (be honest about it):** `research-analyst` is Profile C (denies Write/Edit/Bash — read-only Research is *structural* at the tool layer). But the bug-Research agents are NOT: `debugger` is write-capable (`tools:[Read,Write,Edit,Bash,Glob,Grep]`) and `error-detective` has Bash. When a bug-Research dispatch uses them, "Research gathers info only" is **social discipline + Deviate-Return-to-Plan + the Research C4 unbias check** (which flags a NOTE showing premature edits or a leaked solution), NOT tool-layer-structural. State this residual risk; do not over-claim "structural".

### The non-freezable Research C4+C6 (RIPER's contract contribution — the first end-to-end conditional-freeze exercise)

Research produces a **standalone NON-FREEZABLE product** — a Research NOTE (`kind="note"`, title `Research: <task>`: problem restated; files read + rationale; observations; open questions; explicit "no solution proposed"). **Who records it (EVID-172 F2):** `research-analyst` is Profile C (denies `forgeplan_new`) — it investigates read-only and *returns the synthesis*; the **orchestrator (or a Profile A agent) records** that synthesis as the NOTE via `forgeplan_new`. The NOTE is never absorbed by any later artifact (unlike SPARC's Pseudocode, which the RFC absorbed → SPARC could co-locate its C4+C6). So Research gets a **dedicated standalone gate**:

1. **C4** — `artifact-reviewer` (a different context from the `research-analyst` producer) reviews the NOTE → verdict **SUFFICIENT / INSUFFICIENT / BIASED** on four checks: (a) **coverage** — right files/modules read vs the problem; (b) **unbiasedness** — no leaked solution, no premature source edits during Research; (c) **sufficiency** — can a reader generate ≥3 independent hypotheses (FPF ADI floor)?; (d) **no missing context** — names known-relevant unread areas.
2. **C6** — the C4 EVIDENCE body carries a **`## Pinned revision`** section: the exact NOTE id + a **body-content hash** (the basis is defined in step 3) + the verdict. *This EVID, not a frozen artifact, is what "pins the reviewed revision"* (ADR-010's conditional-freeze wording — no freeze step for a non-freezable product).
3. **Plan-gate PIN-FRESHNESS re-check (MUST):** before dispatching Plan, the main session (or `/methodology-check`) **re-reads the Research NOTE, recomputes its body-content hash, and compares it to the hash in the C6 `## Pinned revision`. On mismatch the pin is STALE → Plan is REFUSED until a fresh C4+C6 cycle re-pins the current NOTE.** This is a read-time comparison, not a hook (hook-gate=No-compatible), and closes the TOCTOU between pin-time and Plan-gate-time. **Hash basis (MUST — EVID-172 F1):** hash the NOTE's **body content — the sections from the first `##` onward — explicitly EXCLUDING forgeplan's mutable frontmatter/metadata (status / R_eff / `updated_at` / links).** Do NOT hash the rendered projection file: forgeplan regenerates it (its sha256 flips) on UNRELATED graph events — e.g. activating an informing EVID re-scores the NOTE and rewrites its metadata — so a whole-file pin gives **false-stale** and spuriously refuses Plan on every downstream activation/link/score. Worked recipe (the demonstrated-stable basis in EVID-172): `awk '/^## /{p=1} p' Research-NOTE.md | shasum -a 256`.
4. **Re-research invalidates the pin:** amending the NOTE (re-entry from Review) requires a NEW C4+C6 before Plan may proceed.

### Execute → TDD delegation (optional)

When the change is test-critical, Execute may delegate to the **TDD sub-cycle** (`/tdd`, RFC-012) so the failing tests are independently frozen before GREEN — fail-closed test-immutability without RIPER owning a hook (the contract composes: instance #4 nests instance #1 at Execute).

### hook-gate=No boundary — autonomous RIPER is an ACCEPT-BY-DESIGN gap, NOT an enforced invariant

hook-gate=No is load-bearing on a **human at the Plan→Execute gate**. `/autorun` runs without approval checkpoints (its `human_required` does not list Plan→Execute), so a Row-4 bug driven autonomously would skip that gate. RIPER does **not** close this with a per-RIPER hook (canonical RIPER has none); instead it is a **named accept-by-design social-discipline gap** (the G5/G6/G7 family — see marketplace CLAUDE.md «Social-discipline boundaries»; the skip signal is semantic, not structurally parseable, and the Execute C4 chain still catches a bad fix at Audit). The stronger mitigation — an `/autorun`-side refuse/escalate guard for RIPER Row-4 — is a tracked follow-up (NOTE-013 DEFER-016), NOT a RIPER hook. **Do not run RIPER fully autonomously expecting the hook-gate=No guarantee to hold; the human Plan-approval gate is the guarantee.**

---

## Phase mapping

| RIPER phase | Delegates to | Output |
|---|---|---|
| **R**esearch | [`/research <topic>`](../research/SKILL.md) | `research/reports/<topic>/REPORT.md` |
| **I**nnovate | [`/refine <plan>`](../refine/SKILL.md) OR [`/fpf-decompose`](../../../fpf/skills/fpf-knowledge/SKILL.md) OR [`/ddd-decompose`](../ddd-decompose/SKILL.md) (DDD-flavoured) | Draft PRD/RFC/ADR + decomposition map |
| **P**lan | [`/rfc create`](../rfc/SKILL.md) | RFC formalising the chosen approach |
| **E**xecute | [`/sprint`](../sprint/SKILL.md) OR [`/forge-cycle`](../../../forgeplan-workflow/) | Code + tests + Evidence |
| **R**eview | [`/audit`](../audit/SKILL.md) | Multi-expert findings, decision to ship or revise |

The skill **does not reimplement** any phase. It picks the right downstream skill, runs it, captures the artifact, and moves to the next phase.

---

## When to use

- Your team uses RIPER terminology and you want one orchestrator command that maps to it.
- You want explicit phase tracking visible during the run (a kind of progress bar across the cycle).
- User explicitly invokes `/riper` or asks "do this with RIPER", "пройди RIPER".

## When NOT to use

- The task is NOT a bug/investigation needing Research-before-touch — a clean new feature is `/sparc` (Row 3), greenfield is `/bmad` (Row 1), and plain forgeplan-vocabulary orchestration with no Research-gate is `/forge-cycle`. (`/riper` adds the mandatory per-gate C4 + the non-freezable Research C4+C6 that those do not have — use it when that investigation discipline is the point, not just for the vocabulary.)
- The task is single-phase (just code review, just research) — call that skill directly.
- The task is fully open-ended exploration — use `/research` standalone.

---

## Process

### 1. Orient

```bash
pwd
test -d .forgeplan && echo "forgeplan workspace" || echo "no forgeplan"
command -v forgeplan
ls ~/.claude/plugins/cache/marketplaces/ForgePlan-marketplace/plugins 2>/dev/null | grep -E 'forgeplan-workflow|fpf|fpl-skills'
```

If `forgeplan-workflow` is installed → Execute phase will use `/forge-cycle` (artifact-aware). Otherwise → `/sprint` standalone.

### 2. Plan + ask once

Show the user the planned phase chain before starting:

```
RIPER cycle plan for "<task>":

  R — Research      → /research "<topic>"
  I — Innovate      → /refine + /fpf-decompose
  P — Plan          → /rfc create
  E — Execute       → /forge-cycle (forgeplan-workflow detected)
                      OR /sprint (standalone)
  R — Review        → /audit (4 reviewers)

Estimated time: 30-90 min depending on task scope.
Stops on red lines (push to main, secrets, deploys).

Proceed? [y/n/skip-research/skip-innovate]
```

Allow user to skip phases they've already done. Common: skip Research if context is in chat already, skip Plan if RFC already exists.

### 3. Execute phase by phase

For each phase:

- **Announce**: `▶ Phase 1: Research — invoking /research <topic>`
- **Run** the delegated skill
- **Capture** the artifact path or forgeplan ID produced
- **Confirm** to user (1 line) before moving on: `✓ Research complete → research/reports/auth/REPORT.md. Continue to Innovate? [y/n]`

If user says no — stop, capture progress so far, exit cleanly. The skill is **resumable** — re-running picks up where it left off.

### 4. Track and report

Maintain a phase tracker in chat:

```
[██████████░░░░░░░░░░░░░░] 2/5 phases complete

  ✓ Research      research/reports/auth/REPORT.md
  ✓ Innovate      PRD-NNN, ADR-MMM
  ▶ Plan          (in progress: drafting RFC)
  ⏳ Execute       pending
  ⏳ Review        pending
```

### 5. Final report

After all 5 phases:

```
RIPER cycle complete for "<task>".

  R   Research    → research/reports/auth/REPORT.md
  I   Innovate    → PRD-042, ADR-019 (auth strategy decision)
  P   Plan        → RFC-031 (magic-link implementation)
  E   Execute     → 18 files changed, 47 tests added, all passing
  R   Review      → 9 findings: 2 HIGH (resolved), 5 MED, 2 LOW

Forgeplan artifacts created/updated:
  PRD-042 → active (R_eff = 0.85)
  ADR-019 → active
  RFC-031 → active
  EVID-027 → linked

Next: gh pr create (you do this; the skill stops here for safety).
```

---

## Forgeplan integration (MCP-first per PRD-022)

Each phase produces forgeplan artifacts. Detect MCP availability first (`mcp__forgeplan__forgeplan_new` in tool list). Prefer MCP; CLI fallback when MCP server not connected.

### Per-phase artifact creation

| Phase | MCP path (preferred) | CLI fallback |
|---|---|---|
| Research | `mcp__forgeplan__forgeplan_new(kind="note", title="research outcome")` then `forgeplan_link` to future PRD | `forgeplan new note "research outcome"` |
| Innovate | `mcp__forgeplan__forgeplan_new(kind="prd", title="<task>")` + `forgeplan_new(kind="adr", title="<key decision>")` (or `forgeplan_generate` for LLM-fill from report) | `forgeplan new prd "<task>"` + `forgeplan new adr "..."` |
| Plan | `mcp__forgeplan__forgeplan_new(kind="rfc", title="<approach>")` + `forgeplan_link(source=RFC, target=PRD, relation="based_on")` | `forgeplan new rfc "<approach>"` + `forgeplan link RFC PRD --relation based_on` |
| Execute | `mcp__forgeplan__forgeplan_new(kind="evidence", title="<task>: tests pass, smoke OK")` + `forgeplan_link` to PRD | `forgeplan new evidence "..."` |
| Review | `mcp__forgeplan__forgeplan_new(kind="evidence", title="<task>: audit findings — N HIGH resolved")` | `forgeplan new evidence "..."` |

### After all phases

**MCP path**:
```
mcp__forgeplan__forgeplan_link(source="RFC-NNN", target="PRD-MMM", relation="based_on")
mcp__forgeplan__forgeplan_link(source="EVID-XXX", target="PRD-MMM", relation="informs")
mcp__forgeplan__forgeplan_score(id="PRD-MMM")
# Activation requires Profile A or B agent (orchestrator) — not invoked from this skill directly
```

**CLI fallback**:
```bash
forgeplan link RFC-NNN PRD-MMM --relation based_on
forgeplan link EVID-XXX PRD-MMM --relation informs
forgeplan score PRD-MMM
forgeplan activate PRD-MMM   # if R_eff > 0
```

### Relationship to `/forge-cycle`

`/forge-cycle` (in [`forgeplan-workflow`](../../../forgeplan-workflow/README.md)) orchestrates the generic forgeplan lifecycle (Route → Shape → Build → Evidence → Activate). For ordinary work the artifact graphs overlap. But since RFC-018, `/riper` is **NOT merely a vocabulary relabel of `/forge-cycle`** — the contract-conformant path adds two things `/forge-cycle` lacks: a **mandatory independent C4 verifier at every mode gate** (generator≠verifier) and the **dedicated non-freezable Research C4+C6 + Plan-gate pin-freshness re-check**. Pick `/riper` for a bug/investigation where Research-before-touch discipline is the point; pick `/forge-cycle` for plain orchestration where it is not.

---

## Decision: `/riper` vs `/forge-cycle` vs `/autorun`

| Command | Phase names | When to pick |
|---|---|---|
| `/riper` | Research → Innovate → Plan → Execute → Review | A bug/scoped-change/investigation in an active system (Row 4) where investigate-before-touch matters — adds mandatory per-gate C4 + the non-freezable Research C4+C6 (ADR-010 instance #4) |
| `/forge-cycle` | Route → Shape → Build → Evidence → Activate | Default generic orchestration; forgeplan's native vocabulary; no Research-gate |
| `/autorun` | Same as `/forge-cycle` (delegates to it) | Unattended overnight runs (no checkpoints) — **do NOT run RIPER work autonomously: hook-gate=No depends on the human Plan→Execute gate (DEFER-016)** |

`/forge-cycle` and `/autorun` share an engine; `/riper` is the contract instance with the extra C4 gates + the conditional-freeze Research gate. Difference is **methodology discipline + interactivity**, not just vocabulary.

---

## Anti-patterns

- ❌ **Reimplementing phase logic in this skill.** Always delegate. If `/research` doesn't do what you need — fix `/research`, don't reimplement it inside `/riper`.
- ❌ **Running both `/riper` and `/forge-cycle` on the same task.** They produce overlapping artifacts. Pick one.
- ❌ **Skipping Review at the end.** RIPER's loop closure is the Review phase. Without it, the loop is incomplete and the methodology contract isn't honoured.
- ❌ **Using RIPER vocabulary in commit messages or PRD bodies.** The artifacts go into forgeplan which uses native vocabulary. Translate at the artifact boundary.
- ❌ **Skipping the mandatory C4 at any mode gate, or treating the Research NOTE as optional.** Since RFC-018 the per-gate independent C4 and the non-freezable Research C4+C6 (+ Plan-gate pin-freshness re-check) ARE the contract — dropping them makes the run a plain `/forge-cycle`, not a RIPER instance. (This is the one capability difference from `/forge-cycle`; everything else is shared engine.)
- ❌ **Running RIPER fully autonomously (e.g. via `/autorun`) and assuming hook-gate=No holds.** It depends on a human at the Plan→Execute gate; autonomous use is a named accept-by-design gap (DEFER-016/017), not an enforced invariant.

---

## Companion skills

- [`/forge-cycle`](../../../forgeplan-workflow/) — equivalent orchestrator with forgeplan's native phase names
- [`/autorun`](../autorun/SKILL.md) — unattended overnight variant
- [`/do`](../do/SKILL.md) — interactive variant of `/autorun`
- [`/research`](../research/SKILL.md), [`/refine`](../refine/SKILL.md), [`/rfc`](../rfc/SKILL.md), [`/sprint`](../sprint/SKILL.md), [`/audit`](../audit/SKILL.md) — phase-level skills called by `/riper`

For methodological context: see [`docs/METHODOLOGIES.md`](../../../../docs/METHODOLOGIES.md) — RIPER vs forgeplan's lifecycle.
