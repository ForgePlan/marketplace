# The canonical pipeline

How a task travels from idea to activated artifact: the stages, what runs at each, and where the
gates are.

Written **after** the gate shipped and describing what exists (marketplace#237). Where a stage is
not built, this guide says so instead of describing the intention.

Sources: PRD-024 (requirements), RFC-002 (architecture), ADR-005 (why two orchestrators),
ADR-022 (why "phase" means three different things).

---

## First: three registers are called "phase"

Conflating them left a normative RFC carrying a stage count in its title that its own table
contradicted, unnoticed for months (ADR-022).

| Register | Values | Carrier |
|---|---|---|
| **pipeline stage** | `brief` `shape` `decompose` `design` `estimate` `gate` `build` `audit` `evidence` `activate` `wrap` | `plugins/fpl-skills/templates/project-agent-matrix.yaml` |
| **session phase** | `idle` `routing` `shaping` `coding` `evidence` `pr` | `forgeplan_session` / `forgeplan_guard` |
| **artifact lifecycle marker** | `shape` `validate` `adi` `code` `test` `audit` `evidence` `done` | `.forgeplan/state/<id>.yaml`, via `forgeplan_phase` |

This guide is about the **first** register. Say "stage", not "phase", and reference a stage by name
rather than by position (ADR-022 INV-4, INV-5). The count is derived from the matrix keys; no
document restates it by hand, and `scripts/ci/phase-canon-check.js` fails CI on any that tries.

The lifecycle marker is **advisory** — a resume hint, never a gate condition (INV-2). Gates read
`status`, evidence and R_eff.

---

## The eleven stages

| Stage | What happens | Methodology | Built? |
|---|---|---|---|
| `brief` | a raw idea becomes a structured Brief | — | agent exists (`brief-intake`); no step in `/forge-cycle` |
| `shape` | Brief becomes a PRD | BMAD | ✅ Step 4 |
| `decompose` | PRD breaks into sibling RFCs | FPF | agent exists; no step |
| `design` | RFC — the technical contract | SPARC Architecture | ✅ Steps 4.5–4.6 |
| `estimate` | effort and risk; **records the depth** the gate then applies | — | partially — Step 4.65 calibrates and records depth; effort/risk estimation itself is still `inline` (#233) |
| `gate` | **may this move to build?** | — | ✅ Step 4.7 — `/gate-check` |
| `build` | code | SPARC Refinement / RIPER | ✅ Step 5 |
| `audit` | multi-reviewer pass | FPF / BMAD | ✅ Steps 6.5–6.6 |
| `evidence` | EVID created and linked | — | ✅ Step 7, post-build gate at 7.4 |
| `activate` | final gate, then activation | — | ✅ Steps 7.5–8, `guardian` |
| `wrap` | release notes, session reset | — | **not built** — `inline` in the matrix (#233) |

Two stages have no agent and no step. That is a real gap, tracked, and it is not hidden by this
table.

### Conditional sub-stages

Not canonical stages — they hang off a named stage and fire only on their branch. Mixing them into
one numbered list is what let RFC-002 claim one count while listing another.

| Sub-stage | Hangs off | Fires when |
|---|---|---|
| Epic | `brief` | the work spans more than one PRD |
| Diagnose | `shape` | bug-fix branch |
| Solution portfolio | `decompose` | bug-fix branch |
| SPEC | `design` | there is an API or contract |
| ADR | `design` | there is an architectural decision |
| Post-build gate | `evidence` | Deep or Critical |

---

## The gates

Three things gate, and they answer different questions. Confusing them is how work gets waved
through twice.

| Gate | Question | When | Blocks on |
|---|---|---|---|
| `/gate-check` | may this move to the next stage? | between stages | thresholds in `quality-gates.yaml` |
| `/gate-check --post-build` | does the build match the spec? | inside `evidence`, Deep+ | thresholds + evidence growth |
| `guardian` (agent) | may this be activated? | before activation | the whole evidence chain |

`guardian` is the stricter and the later. A `/gate-check` PASS is not permission to skip it.

### What the gate can decide on

Measured on forgeplan 0.34.0, not assumed:

| Tool | Scope | Machine-readable | Role |
|---|---|---|---|
| `validate` | per-artifact | `--json` | **gating** |
| `score` | per-artifact | `--json`, carries `fgr` inline | **gating** |
| `fgr` | per-artifact | `--json` | **gating** |
| `gaps` | workspace only | no | advisory |
| `blindspots` | workspace only | no | advisory |

`gaps` and `blindspots` take no artifact argument. They answer "what is wrong in this workspace",
not "is this artifact ready" — on the live tree `gaps` reports 64 MUST items graph-wide, and gating
on that would block everything for unrelated reasons. PRD-024 FR-006 names all five together; the
split is reconciled in the FR-006 row rather than applied silently.

### Thresholds

`.forgeplan/quality-gates.yaml`, optional, overriding the shipped template per key. Defaults:

| Depth | pre-build MUST |
|---|---|
| Tactical | `validate` clean |
| Standard | + formality ≥ 0.6 |
| Deep | + ADI evidence (≥3 hypotheses in a linked EVID) |
| Critical | + ADR linked |

**Almost nothing derived from `score` blocks, and that is measured, not timid.** Applied to 14 live
artifacts on 2026-09-03:

- **`r_eff` is a graph minimum, and it moves the wrong way.** PRD-024 fell 1.00 → 0.30 *because it
  was reviewed* — an honest audit landed carrying `weakens`, scored 0.5, and became the minimum.
  Blocking on it means failing an artifact for recording adverse evidence about itself.
- **`granularity` is kind-dependent, not quality-dependent.** ADRs cluster at 0.20–0.40, PRDs and
  EPICs at 0.80–1.00. An ADR is one decision; low granularity is correct for it. One threshold
  across kinds fails every ADR by construction.
- **`formality` is the one score that discriminates without punishing** — range 0.69–0.86 on the
  sample, so a 0.6 floor fails none of them and would fail something genuinely unwritten.

An earlier draft made `r_eff`, `granularity` and `reliability` MUSTs at Deep. On 12 artifacts that
produced a **50% block rate**, including PRD-024 itself, RFC-002 — the source of the INV-1 this gate
enforces — and ADR-022, which the project had just taken through a full cycle to a guardian PASS.
PRD-024 NFR-003 budgets false positives at ≤5%. A gate that blocks half of already-accepted work
is not strict; it is broken, and it gets `--force`d the first time it fires.

**Depth is recorded, not assumed — and not escalated unattended.** `forgeplan get` returns
`standard` for every artifact of every kind (it is `default_depth` reflected back), so `/forge-cycle`
Step 4.65 runs `calibrate` and records a depth. That same measurement showed `calibrate` suggesting
**Deep for 4 of 4** probed artifacts, so the step asks before escalating and `/autorun` keeps the
existing depth — escalating a tier without a human is the autonomy equivalent of `--force`.

These numbers are provisional: PRD-024 R-1 promised a 30-artifact calibration, this is 14. Tracked
in NOTE-013.

`must` blocks; `should` is reported and does not. That split carries the design: a gate where
everything blocks gets bypassed with `--force` on its first false positive, and then it protects
nothing.

### Override

`--force` requires `--reason`, records a NOTE naming **which** checks were bypassed and their
measured values, and returns PASS marked `overridden`. Deliberately not disableable: a gate nobody
can pass in an emergency is a gate that gets deleted in an emergency. Making the escape hatch loud
outlasts sealing it.

---

## Three entrypoints

| Entrypoint | Role |
|---|---|
| `/forge-cycle` | reactive — you invoke it per task; it stops and asks on conflicts |
| `/autorun` | autonomous — briefed up front, then runs for hours, resolving conflicts with FPF. Calls the gate on its own path too, and **never `--force`s**: an override with nobody to read the reason is the gate not having run |
| `forgeplan playbook run` | declarative — YAML workflow for per-domain customisation |

`/autorun` is **not** "`/forge-cycle` non-interactive" — they differ in decision policy, not in
intent (ADR-005). They do **not** yet walk identical stages, and saying so would be an overclaim:

- When `forgeplan-workflow` is installed, `/autorun` delegates to `/forge-cycle` and walks every
  stage it does.
- On its own path it runs `research → sprint → audit → report`. There is no `shape` or `design`
  stage there — but the gate is now called before `sprint` dispatches anything, so the transition
  RFC-002 INV-1 protects is covered on both paths. Stage parity is not.

**Reference playbooks are not built** (PRD-024 FR-012, #237). The third entrypoint works; nothing
ships through it yet, so `/gate-check` is invoked from two of the three entrypoints RFC-002 names,
not three.

---

## Where the pipeline is still open

Stated here so the guide cannot be read as a completion certificate.

| Gap | Tracked |
|---|---|
| `wrap` has no agent and no step; `estimate` has a step (4.65) but no agent and no effort/risk estimation | #233 |
| Reference playbooks and the four wrapper skills | #237 (remainder) |
| `brief` and `decompose` have agents but no `/forge-cycle` step | #233 / #234 |
| `gaps` / `blindspots` cannot be attributed to an artifact *machine-readably* — they do emit per-artifact lines, but with no `--json` that is prose parsing, which is why they advise rather than block | upstream forgeplan |
| Structural body checks RFC-002 specifies but the gate does not do — "PRD has FRs with AC", "PROBLEM has reproduction", "SPEC linked if API" | #237 (remainder) |
| Thresholds are provisional — PRD-024 R-1 promised a 30-artifact calibration; the 2026-09-03 run above is 14, and several inputs move as artifacts are reviewed | NOTE-013, `#237` |

Eight of eleven stages execute today — `estimate` joined them with Step 4.65, which records the
depth the gate then applies. It is the gate's prerequisite, not bookkeeping. The two gates are the ones that were missing and are now
built; the three that remain — `brief`, `decompose`, `wrap` — are convenience and bookkeeping, not
the mechanism.
