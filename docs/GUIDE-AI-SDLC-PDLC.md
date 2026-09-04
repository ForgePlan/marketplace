# Guide: running development with agents — AI-PDLC and AI-SDLC

The desk book for what we have built: two loops (product and engineering), who plays in them, in
what order, where the gates stand, who verifies whom, how a task finds its methodology, and which
model gets which task.

Everything mechanical here was read off disk on 2026-09-04. Where a stage or role is not built,
this guide says so instead of describing the intention. Where a claim is not measured, it carries
an explicit mark.

**This guide does not replace — it stitches together:**

| Document | What's in it |
|---|---|
| [`GUIDE-PIPELINE.md`](GUIDE-PIPELINE.md) | the canonical pipeline: 11 stages, three gates, three entrypoints |
| [`SMITH.md`](SMITH.md) | the methodology router, 14 rows |
| [`METHODOLOGIES.md`](METHODOLOGIES.md) | the 33 methodology cards |
| [`../plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md`](../plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md) | the agent-profile canon, reviewer disciplines, ground-truth |
| [`FACTORY.md`](FACTORY.md) | why all of this, in one sentence |

---

## 0. One page

**The formula.** We are building a factory that can build, verify itself, and honestly record
where it went wrong.

**Two loops.**

```
AI-PDLC  ──►  what to build    ──►  PRD (active)
                                      │
AI-SDLC  ◄────────────────────────────┘  ──►  code + evidence + activated artifact
```

The seam between them is single and narrow: **PDLC hands over an active PRD, SDLC consumes it**.
The same artifact, not a retelling. It is the only place the two loops touch — which makes it the
only place that needs guarding.

**Three things that keep this construction from being decoration:**

1. **Generator ≠ verifier.** Nobody checks their own work. The verifier does not trust the
   worker's report — it reads frozen external ground truth itself (git, the stored artifact body).
2. **A role's profile is a tool denylist, not a description.** A reviewer physically cannot
   activate what it just reviewed.
3. **A gate that blocks everything gets `--force`d on its first false positive.** So only the
   structural blocks; the debatable is reported.

---

# Part I. The product loop (AI-PDLC)

## 1.1 The decision and what it fixed

The decision is **ADR-023**. The problem was not a lack of discovery techniques: 68 SKILL.md files
from a third-party pm marketplace were already installed, covering OST, interviews, personas,
segmentation, metrics — with **zero forgeplan references across all 68**.

The hole was elsewhere: **discovery output had no landing place in the graph**. The PROBLEM kind
had been used twice ever, both times engineering-internal; four native discovery tools had no
executable caller at all.

So our PDLC is not "add more methodology cards" — it is **a bridge**: making product discovery
land in the same decision graph engineering already lives in.

## 1.2 Entry and the walk

Entry: **`/discover-product`** (plus the `jtbd` and `assumptions` sub-modes).

The walk is a Double Diamond, six steps:

| Step | What happens | What is born |
|---|---|---|
| 0. Orient | `test -d .forgeplan` — hard stop if there is no workspace; detect MCP vs CLI | — |
| 1. Discover (diverge) | "What's the product question? What made you think about it now?" May dispatch `research-analyst` (Profile C, read-only) — but **the skill/orchestrator persists, never the agent** | discovery NOTE with pinned sources |
| 2. Define (converge) | "In one sentence: what's broken, missing, or underserved — and for whom?" | a **PROBLEM** — one per validated problem, BEFORE any PRD |
| 3. C4 gate | `artifact-reviewer` (Profile B) reviews the NOTE + PROBLEM together | EVID with PASS/CONCERNS/BLOCKER |
| 4. Develop (diverge) | "What has to be true? Riskiest first" | **HYPOTHESIS** artifacts, moved through `parked → inferred → strong-inferred → verified \| refuted` |
| 5. Deliver (converge) | The problem statement written as a JTBD job: "When [situation], I want [motivation], so I can [outcome]" | a **PRD** with non-empty Non-Goals |

Then `architect-reviewer` for PRD fitness and `guardian` before activation.

## 1.3 Three honesty rails (they can't be automated, so they are written down)

1. **Do not manufacture a validated problem out of one interview.** The minimum bar for a PROBLEM
   is **≥2 independent sources** (interviews, data signals, support tickets — not two people
   repeating one anecdote). Otherwise the PROBLEM body visibly carries
   `**Status**: assumption, unvalidated`.
2. **An experiment or interview whose result was not recorded did not happen.** Go back and record
   it — don't backfill from memory.
3. **A hypothesis stays at its true state.** Never promote to `verified` to make the walk look
   further along. `hypothesis_status` is a log nobody rewrites.

## 1.4 What is deliberately degraded

`forgeplan_interview_packet_draft` and `_ingest` are **stubs** in the running 0.34.0 core: their
own schema descriptions carry the word STUB and always return `not_implemented`. The skill **must
never call them** (invariant INV-6: a tool called for the counter is worse than a refusal with a
reason).

The reason is **namespace, not capability**: a plugin can carry its own MCP server (fpl-hsmem
does), but it publishes under its own namespace and can never back the `mcp__forgeplan__*` IDs the
core already reserves as stubs. The substitute is the discovery-NOTE path: the same outcome (a
persisted, linked, sourced interview record) minus the structured HYP/UC/INV proposals the packet
pair was specified to derive from the transcript. Tracker: marketplace#265.

## 1.5 Live state of the loop

As of 2026-09-04: zero hypotheses in the graph, two PROBLEMs, both engineering-internal. **No
product cycle has run through the new loop yet.** ADR-023 itself sits at R_eff 0.00 — by
construction: its Confirmation fires after the first real cycle, not before.

That is recorded, not hidden: a guide that reads as a completion certificate is the worst kind of
guide.

---

# Part II. The engineering loop (AI-SDLC)

## 2.1 Eleven stages

The carrier of the count is `plugins/fpl-skills/templates/project-agent-matrix.yaml`. No document
restates it by hand; `scripts/ci/phase-canon-check.js` fails CI on any that tries.

| Stage | What happens | Methodology | `/forge-cycle` step |
|---|---|---|---|
| `brief` | a raw idea becomes a structured Brief | — | 2.5 (`brief-intake`, only when the task arrives raw) |
| `shape` | Brief becomes a PRD | BMAD | 4 |
| `decompose` | PRD breaks into sibling RFCs | FPF | 4.4 (`goal-planner` + `forgeplan_decompose`, Deep+) |
| `design` | RFC — the technical contract | SPARC Architecture | 4 + 5; 4.5–4.6 add ADI and red lines |
| `estimate` | effort and risk; **records the depth** the gate then applies | — | 4.65a (depth, always) + 4.65b (`/estimate`, Deep+) |
| `gate` | **may this move to build?** | — | 4.7 (`/gate-check`) |
| `build` | code | SPARC Refinement / RIPER | 5 |
| `audit` | multi-reviewer pass | FPF / BMAD | 6.5 + 6.6 |
| `evidence` | EVID created and linked | — | 7, post-build gate at 7.4 |
| `activate` | final gate, then activation | — | 7.5–8 (`guardian`) |
| `wrap` | reconciliation, then a REFRESH at Deep+ | ADR-020 | 10 (`/wrap`) |

All eleven execute today. `brief` and `decompose` were wired last (2026-09-04): both had an agent
from the start and nothing that invoked it.

**Conditional sub-stages** are not stages — they hang off a named stage and fire only on their
branch: Epic (off `brief`), Diagnose and Solution portfolio (bug-fix branch), SPEC and ADR (off
`design`), the post-build gate (off `evidence`, Deep+), ship (after commit, Standard+).

## 2.2 Three entrypoints — not interchangeable

| Entrypoint | Role |
|---|---|
| `/forge-cycle` | reactive — you invoke it per task; it stops and asks on conflicts |
| `/autorun` | autonomous — briefed up front, then runs for hours, resolving conflicts with FPF. **Never `--force`s**: an override whose reason nobody will read is the gate not having run |
| `forgeplan playbook run` | declarative — YAML workflow for per-domain customisation. **Works, but nothing ships through it** — reference playbooks are not built (#237) |

`/autorun` is **not** "`/forge-cycle` without questions". They differ in decision policy, not
intent (ADR-005), and **do not walk identical stages**: on its own path `/autorun` runs
`research → sprint → audit → report`, with no `shape` and no `design`. The gate is still called
before `sprint` dispatches anything — so the transition RFC-002 INV-1 protects is covered on both
paths. Stage parity is not.

## 2.3 Depth decides how strict

| Depth | Artifacts | ADI | Gate's mandatory minimum |
|---|---|:---:|---|
| **Tactical** | nothing or a NOTE | — | `validate` clean |
| **Standard** | PRD → RFC | recommended | `validate` clean |
| **Deep** | PRD → SPEC → RFC → ADR | **required** | + ADI evidence (≥3 hypotheses in a linked EVID) |
| **Critical** | Epic → PRD[] → SPEC[] → RFC[] → ADR[] | **required + review** | + a linked active ADR |

**Depth is recorded, not assumed — and never escalated unattended.** `forgeplan get` returns
`standard` for every artifact of every kind (the reflected `default_depth`), so step 4.65 runs
`calibrate` and records the real one. The same measurement showed `calibrate` suggesting Deep for
4 of 4 probed artifacts — so the step **asks** before escalating, and `/autorun` keeps the
existing depth: raising a tier without a human is the autonomy equivalent of `--force`.

---

# Part III. Roles and context separation

## 3.1 Seven profiles

A profile is not a description in a header — it is a **tool denylist**. Below are the canonical
shapes, read off disk.

| Profile | May | May not (denylist) | Who carries it on disk |
|---|---|---|---|
| **A** Creator | create artifacts (`forgeplan_generate` primary, `forgeplan_new` fallback), update, link, validate, **reason** (ADI is Profile A's contract), claim/release, memory_retain | `Write`, `Edit`, `NotebookEdit`, `forgeplan_activate` — **exactly 4 entries** | adr-architect, artifact-author, brief-intake, goal-planner, architecture, specification, tdd-planner |
| **B** Reviewer + EVID author | read code and artifacts, run Bash linters and tests, create an EVIDENCE, update its body, link informs, validate, score, claim **exactly one** artifact | the same 4 + `forgeplan_reason` (ADI belongs to A) + `forgeplan_claims` (no sibling exploration) + `memory_retain` — **exactly 7** | code-reviewer, tester, security-expert, architect-reviewer, artifact-reviewer, system-dev, evidence-recorder |
| **B-gate** | all of the above + renders a binary verdict over the whole evidence chain | the same seven as B (guardian's frontmatter historically lacked the activate denial while its body forbade it three times — brought to canon in v1.21.0; tdd-test-validator is two entries shorter: it does not deny `forgeplan_claims` or `memory_retain` — a known deviation) | guardian, tdd-test-validator |
| **B-orchestrator** | read broad state, dispatch via Task, hold gates | everything above **plus** Bash and all forgeplan mutations — **16 entries** | smith, bmad-orchestrator, sparc-orchestrator, tdd-orchestrator, canvas-coordinator, map-orchestrator |
| **C** Read-only | read, search, synthesize → returns to the orchestrator | **all** mutations — 17 entries | research-analyst |
| **C-coder** | `Write`/`Edit`/`Bash` on source files — **the only one allowed** | all forgeplan mutations | coder, coder-tdd, canvas-coder |
| **D** Maintainer | fix existing artifacts in place | + `forgeplan_new` (creates nothing new) | artifact-maintainer |

**The rule that follows, and that catches people:** Profile B physically cannot activate what it
reviewed. So EVIDs stay in `draft` after the reviewer exits — and that is **not a bug**, it is a
designed consequence of the separation. Resolution is orchestrator-side: the reviewer emits a
`<<NEEDS_ACTIVATION>>` sentinel; the orchestrator activates.

## 3.2 Four enforcement mechanisms — and where each one lies

| Mechanism | Strength | Limitation |
|---|---|---|
| `disallowedTools` denylist | a wall | **Claude Code only.** In a runtime without that key it is nothing, and no error is raised |
| `tools:` allowlist | **constrains harder than a denylist** | but an allowlist with zero forgeplan tools makes the agent unable to record the EVID its routing row demands |
| HARD RULES in the agent body | portable across CLIs | social discipline, not a wall |
| LR-1..LR-8 lint in `validate-all-plugins.sh` | catches canon drift | checks what is specified |

**Hence the invariant:** anything the denylist protects that actually matters **must** also be a
HARD RULE in the body. 42 marketplace agents carry a denylist, and every one denies
`forgeplan_activate`; on Gemini CLI / Codex CLI / Goose that means nothing. The quiet failure is
named explicitly: a Profile B reviewer activating the artifact it just reviewed — generator ≠
verifier collapses and nothing reports it (marketplace#218).

## 3.3 Generator ≠ verifier: the root principle

Provenance chain: **PROB-002** (the incident: a worker self-reported success, downstream trusted
the report, the gap surfaced later) → **RFC-011** (architecture, FR-3) → **ADR-009** (decision).

Four rules:

1. **Verify the side-effect, never the self-report.** For code, ground truth is the git object
   store (`git diff base..head` in a clean shell). For an artifact mutation, it is the stored body
   (`forgeplan_get` — confirm the claimed section is actually there). The worker's transcript
   ("done", "tests passed") is supplementary, not proof.
2. **Empty diff under green tests = BLOCKER.** A green suite with an empty diff is a null result,
   not a pass: a suite stays green when nothing changed. Holds even when scanners are clean.
3. **Hermetic shell and the real repo root for every git probe.** `bash --noprofile --norc`, root
   via `git -C <cwd> rev-parse --show-toplevel`. Never assume `$CLAUDE_PROJECT_DIR` is a git repo
   (here the workspace root is not one; the marketplace repo is a child directory).
4. **The reviewer pastes the proof; the gate re-checks it.** Profile B records the literal probe
   commands and output in a `## Ground-truth verification` section. Guardian blocks any EVID that
   claims a code change with no such section, or with `DELTA=EMPTY`.

### The verdict-floor table (Step 4.5)

Applied **before** findings are categorised:

| State | Verdict floor |
|---|---|
| DELTA=EMPTY + any token | **BLOCKER** — "claim-vs-reality gap" |
| DELTA=PRESENT + derivable token ABSENT | **CONCERNS** — "possible wrong or partial change" |
| DELTA=PRESENT + FOUND, or token not derivable | precondition satisfied, PASS eligible |
| base unresolvable | at most CONCERNS, **never** PASS |

The key ADR-009 detail: **the expected-delta token is authored by the planner**, in the PRD/SPEC
acceptance criteria (the `expected_delta:` field), and injected downstream into both the
implementer's commit template and the gate check. The option "the implementer writes it" was
rejected explicitly as generator==verifier: the implementer writes a trivial regex any change
satisfies. Motivation — ImpossibleBench: frontier models reward-hack visible tests 54–93% of the
time.

### The boundary between the structural gate and semantic review

- "Did SOME claimed delta land, and does it touch the declared token?" → hard automated gate,
  exit 2, harness-enforced.
- "Is it the RIGHT change?" → a Profile B reviewer, **never** a regex over prose.

Hooks stay dumb-but-unbypassable; judgment goes to the independent reviewer.

## 3.4 Context separation — the working rules

- **A fresh isolated context per dispatch.** Generator and verifier alike. This is what makes
  generator ≠ verifier real: the verifier cannot inherit the generator's assumptions.
- **Re-labelling the same context is not verification.** ADR-010 C4 defines "different context"
  narrowly: a separate dispatch with no shared mutable working state with the producer.
- **Gate chains stay serial.** A generator and its verifier are **never** run concurrently;
  ordering is encoded as `blockedBy`, never implied by dispatch order.
- **Worktree isolation works, and it is not coder-only** — standalone subagents, Workflow runs,
  and AgentTeams teammates all receive isolated worktrees (verified with 14 of them in a live
  project). Only the `isolation: worktree` frontmatter *declaration* is coder-specific.
- **But isolation differs by writer kind.** Concurrent **code** writers each get a worktree.
  **Doc** writers run without one, on-branch: a doc writer dispatched into an isolated worktree
  writes off the working branch, and the change silently fails to land where the orchestrator
  expects it. Doc writers stay race-free through strict file ownership: the writer edits, **the
  orchestrator** stages and commits.
- **Strict file ownership.** Parallel fan-out is safe only where the work is file-disjoint. If two
  units would touch one file they are not siblings — sequence them with `blockedBy`.
- **Step 9c: filesystem verification after every claim.** After every C-coder dispatch claiming
  file changes, the orchestrator **must** grep the disk. Sub-agent returns are unreliable in
  **both** directions: one returned "12 files modified, ALL PASSED" when 0 of 8 agents got the
  field; another reported "0 found, no modifications" while it had actually performed the removal.

## 3.5 Claim hygiene

| Profile | May claim? |
|---|---|
| A | yes — the one artifact it creates |
| B reviewer | yes — exactly the one artifact it reviews (`forgeplan_claims` denied) |
| B-orchestrator | **no** — reads broadly, mutates nothing |
| C read-only | **no** — a researcher that thinks it needs a claim is mis-profiled |
| D | yes — the one artifact it fixes |

**HARD RULE 10: release is a `finally` clause, not the happy-path tail.** From the instant an
agent calls `forgeplan_claim` it owes a release on PASS, CONCERNS, BLOCKER, validation failure,
analyser crash, or any post-claim abort. Live incident: three read-only reviewers claimed
RFC-008/009/010, crashed before releasing, left `active_claim_count: 3` and pushed all three into
the serial queue. Two failures stacked: the reviewers **should not have claimed**, and the
orchestrator **did not sweep**. Both halves get fixed.

---

# Part IV. Gates — what can stop whom

## 4.1 Four gate layers

| Layer | Who | Question | Fails on |
|---|---|---|---|
| Between stages | `/gate-check` | may this move to the next stage? | `quality-gates.yaml` thresholds |
| After build | `/gate-check --post-build` | does the build match the spec? | thresholds + evidence growth (Deep+) |
| Before activation | `guardian` (agent) | may this be activated? | the whole evidence chain |
| Repository | 13 CI gates + 5 hooks + branch protection | may this merge? | structure, security, parity |

`guardian` is stricter and later. **A `/gate-check` PASS is not permission to skip it.**

## 4.2 Thresholds: what blocks vs what is reported

```yaml
pre_build.tactical:  must: validate_errors_max: 0
pre_build.standard:  must: validate_errors_max: 0
pre_build.deep:      must: validate_errors_max: 0 + adi_evidence_required
pre_build.critical:  must: + adr_linked_required
```

**Every must is structural. Nothing derived from `score` blocks.** That is measured, not timid.

A `must` is something a reader settles without argument: a MUST section is present or it is not; a
linked EVID carries three hypotheses or it does not; an active ADR informs this artifact or none
does. Each names a thing the author did or did not do, and each has an obvious fix.

The scores were tried as musts and each failed measurement (14–16 live artifacts, 2026-09-03):

- **`r_eff` is a graph minimum that moves the wrong way.** PRD-024 fell 1.00 → 0.30 *because it
  was reviewed*: an honest audit landed carrying `weakens`, scored 0.5, became the minimum.
  Blocking on it fails an artifact for recording adverse evidence about itself.
- **`granularity` tracks artifact kind, not quality.** ADRs cluster at 0.20–0.40, PRDs and EPICs
  at 0.80–1.00. An ADR is one decision; low granularity is correct for it.
- **`formality` looked usable and is not.** A 0.6 floor passes all 16 sampled activated artifacts —
  but the lowest, ADR-006 at 0.38, is a structurally complete seven-section MADR.

An early draft made `r_eff`, `granularity` and `reliability` musts at Deep. On 16 artifacts that
blocked **56%** — including PRD-024 itself, RFC-002 (the source of the invariant this gate
enforces) and ADR-022, which had just been taken through a full cycle to a guardian PASS. The
false-positive budget (PRD-024 NFR-003) is ≤5%. **A gate that blocks half of already-accepted work
is not strict — it is broken, and it gets `--force`d the first time it fires.** The current set
blocks 0% of that sample.

## 4.3 Guardian: how the verdict is derived

The three-row base table, "no exceptions, no judgement-soft":

- any unresolved BLOCKER in any linked EVID, or a project-config signal → **BLOCKER**
- no BLOCKER, but unresolved high-severity CONCERNS, skipped or failed validation, or an
  unsatisfied activation policy → **CONCERNS**
- everything green → **PASS**

On top of it — **22 verdict-modifier rows**. The most load-bearing:

| Row | What it catches | Verdict |
|---|---|---|
| no passing Profile B audit | zero reviewer EVIDs | BLOCKER |
| empty evidence chain | activation without evidence | BLOCKER |
| FPF ADI discipline missing | <3 hypotheses at Standard+ | BLOCKER |
| ground-truth discipline (ML-13) | an EVID claims a code change with no verification section, or DELTA=EMPTY | BLOCKER |
| a linked ADR with a FIRED Revisit Trigger | the decision is overdue | BLOCKER |
| BMAD: zero findings at Standard+ | the reviewer was not adversarial enough | CONCERNS |
| discovery discipline (ADR-023 D4) | a Standard+ PRD with empty Non-Goals or no user job | CONCERNS |
| C4 diagrams for ≥3-module decisions | inter-module flow in prose with no diagram | CONCERNS |
| OpenSpec delta-spec missing on a supersede | the supersede history loses context | CONCERNS |
| NFR / DDD / STRIDE disciplines | modelled on the C4 row | CONCERNS |

Plus two HARD RULES that are not about content: **blast-radius downgrade** and **no rubber-stamp
under time pressure**.

## 4.4 The override

`--force` requires `--reason`, records a NOTE naming **which** checks were bypassed and their
measured values, and returns PASS marked `overridden`. **Deliberately not disableable:** a gate
nobody can pass in an emergency is a gate that gets deleted in an emergency. Making the escape
hatch loud outlasts sealing it.

Since v1.19.0 guardian **reads** the `Gate override:` NOTE — before that, an override was recorded
and read by nobody, which made it nearly free.

## 4.5 The five fail-closed hooks

| Hook | What it does |
|---|---|
| `tdd-gate.sh` | `tdd-plan` denies source AND test writes; `tdd-red` allows tests and denies source without a `STUB:TDD` marker; GREEN **blocks any test edit** and blocks source writes when the live SPEC hash drifts from the frozen one |
| `bmad-gate.sh` | no code before an approved plan |
| `canvas-gate.sh` | no design-system source writes until the tokens RFC is active |
| `safety-hook.sh` | a Bash denylist: force-push, direct push to main/dev, `reset --hard`, `clean -fd`, `rm -rf /`, DROP TABLE |
| `commit-delta-gate.sh` | a commit carrying an `Expected-delta: <regex>` trailer must produce a non-empty staged diff whose added lines match the regex, else exit 2 |

All block via `permissionDecision:deny`; on unparseable input — **exit 2, never "allow"**. The
hook is session-global, so it binds subagents **and human edits made outside the pipeline** — the
ones a dispatch-only orchestrator cannot reach.

## 4.6 Five gaps left open on purpose

| # | Gap | Why not closed |
|---|---|---|
| G5 | no automated check that SPARC phases actually ran | the claims log expires; structural absence ≠ "SPARC wasn't run" |
| G6 | an EVID with body `## Findings\n1. nothing` passes the gate | the spoof signal is identical to the legitimate-short signal |
| G7 | three empty `### Hypothesis` headers pass the count | same |
| G8 | autonomous RIPER skips the human Plan→Execute gate | "was a human present" is semantic; blast radius bounded by the mandatory tester + code-reviewer + guardian chain |
| G9 | a REFRESH rubber-stamp instead of a real reconciliation | the structural half is closed (section presence); telling pasted output from fabricated output is semantic |

**The general rule: don't write parsers when the signal is semantic, not structural.** Trust the
reviewer chain and make their identity visible — the reviewer's name is in the EVID frontmatter,
so a pattern of empty or manufactured findings is visible over time.

---

# Part V. Methodology routing

## 5.1 The router: `smith`, 14 rows

Smith reads state (health + list + blocked + stale + hindsight + git status) and picks **exactly
one** row — **methodology cocktails are forbidden**. If two rows genuinely tie, smith emits
`<<NEED_USER_INPUT>>` with ≥3 hypotheses.

| # | Context | Primary methodology | Entry | Hook gate |
|---|---|---|---|:---:|
| 1 | Fresh project (greenfield) | BMAD + GitHub Spec Kit | `/bmad` | **yes** |
| 2 | Brownfield modernisation | Strangler Fig + DDD + ACL | `discover` | no |
| 3 | New feature in an existing service | SPARC (5 phases) + Hexagonal | `/sparc` | no |
| 4 | Production bug, non-trivial | RIPER-5 + 5 Whys | `/riper` | no |
| 5 | Trivial hotfix | Tactical fast-path | coder → code-reviewer | no |
| 6 | Refactoring | Branch-by-Abstraction + Mikado | — | no |
| 7 | Architecture decision | FPF ADI + ADR/MADR | `/decision` | no |
| 8 | Security audit | OWASP Top 10 2025 + STRIDE | — | no |
| 9 | Performance audit | DORA + SRE error budget | — | no |
| 10 | Product discovery | JTBD + Lean Startup + Double Diamond | `/discover-product` | no |
| 11 | Tech-debt cleanup | A3 (Toyota) + Fishbone | — | no |
| 12 | Live incident | Incident Command System + blameless | `/incident` | no |
| 13 | TDD-first feature (tests frozen before code) | Enforced-TDD | `/tdd` | **yes** |
| 14 | Design system → code | CANVAS | `/canvas` | **yes** |

The 12↔4 boundary is binary and stated in the row itself: **user-visible degradation RIGHT NOW** →
row 12 (`/incident`); a defect with no active degradation → row 4 (`/riper`). On overlap, row 12
wins.

Methodology cards: 33, all inline in `routing-map.md`.

## 5.2 The sub-cycle contract (ADR-010): C1–C6

Five methodologies are built as **sub-cycles** under one contract. This is the answer to "how does
a role know where to stop".

| Element | What it is |
|---|---|
| **C1** Entry | the sub-cycle starts only when its input artifacts are `active`; the master refuses otherwise |
| **C2** Stage master | one orchestrator per methodology with the B-orchestrator denylist: reads, dispatches, holds gates — **never writes the work product, never activates** |
| **C3** Phase agents | N isolated-context agents, each with its own CRUD-R-A profile, chained generator→generator |
| **C4** Independent verifier | a **different** context certifies the product before exit. FAIL → back to the producing phase; PASS → the product is **frozen** |
| **C5** Enforcement | a fail-closed PreToolUse hook. **Degrades to prompt level** on Gemini/Codex/Goose — the instance must declare reduced structural enforcement |
| **C6** Exit | an EVIDENCE that **must** carry the C4 verdict (`PASS`) and the **verifier's identity**. The next stage opens only on PASS from a context distinct from C3 — not on the mere existence of EVIDENCE |

**Conditional freeze:** for phases with no freezable product (research prose, an evolving model)
C4 still certifies and C6 still records, but the freeze does not apply — instead C6 **pins the
reviewed revision**. The two live exercises of that path: the Research NOTE in RIPER and the
Design NOTE in CANVAS.

### The hook-gate test (ADR-012) — why not every methodology gets its own master

> **Does this methodology require a fail-closed PreToolUse hook that binds edits the master's
> dispatch discipline cannot reach?**

- **YES** → a dedicated B-orchestrator + its own hook + state lib + phase agents (level 3).
- **NO** → the "master" is a `/skill` + a routing-map row + the main session orchestrating
  existing agents (level 1/2), with gate discipline carried by the C4 verifiers + `/forge-cycle`
  steps 4.5/6.5 + guardian.

The test was chosen deliberately because it is **checkable on disk** (the hook file either exists
and denies, or it does not) — not semantic like G5/G6/G7.

The master population is capped: 1 general (smith) + at most 2–3 narrow is the documented smell
line. Currently 1 + 5.

---

# Part VI. Model tiers — which task goes to whom

This is the one part of the guide that does not yet exist in any marketplace artifact. Every claim
carries its provenance, because half the value here is seeing where the measurement ends and the
web reading begins.

## 6.1 Two ladders, not one

One nine-rung ladder (A/A+/A++, B/B+/B++, C/C+/C++) suggests itself. But a task and a model are
different things, and numbering them on one scale is tier inflation. So — two different ladders:

| Ladder | What it numbers | Rungs | Status |
|---|---|:---:|---|
| **Task tier** | a property of the **work**: cost of error × reversibility × presence of an external oracle | **9** | a proposal, below |
| **Model tier** | which model serves it | fewer (ours: 6) | lives in a specific machine's configuration, outside this repository |

**The mapping is many-to-one, and that is the whole point:**

> A plus in the **task** tier most often buys **scaffolding**, not a bigger model: a second pass,
> an independent verifier, a gate, a human in the loop.

A weak model on a good specification delivers more than a strong model on "make it nice". Our
decision graph corroborates this indirectly: it holds two and a half times more evidence artifacts
than task statements — the work goes into verification, not generation.

## 6.2 Nine task tiers

A tier is determined by three measurable properties, not "complexity" by eye:

1. **Cost of error** — what breaks and how fast we notice.
2. **Reversibility** — undone by one command, or by rewriting history.
3. **External oracle** — is there a test/gate/measurement, or only judgment.

The first two set the letter; the third sets the pluses.

| Tier | What the task is | The scaffolding the plus buys | Model tier |
|---|---|---|:---:|
| **C** | Mechanics with an oracle: renames, formatting, codemods under tests | — (verification = linter and tests) | C |
| **C+** | Mechanics **without** an oracle: syncing docs, counters, versions | a mandatory second pass to cross-check | C, cross-check — B |
| **C++** | Mass same-shaped edits across many files | one isolated call per file + strict file ownership | C ×N |
| **B** | A clear feature in familiar code, tests exist | the gate closes it | B / B+ |
| **B+** | A feature with a choice between two implementations | an independent reviewer **stronger than the author** | B+ author, A reviewer |
| **B++** | Debugging a live problem, cause unknown | strong for diagnosis, mid for the fix | A diagnosis, B+ fix |
| **A** | Designing a contract, schema, boundaries | the result must pass **someone else's** gate | A |
| **A+** | An architecture decision with alternatives and consequences | a mandatory ADI cycle (≥3 hypotheses) + the gate | A+ |
| **A++** | The irreversible: data migration, public contract, security | generator ≠ verifier, **a human in the loop**, rollback written before starting | A++ |

**The tier test**: *for each tier, name a task that belongs in it and would be wrong one step up
or down. If that sentence is hard to write, the tier is decoration.*

And the corollary: **if two tiers send the same kind of work to models of the same class, they are
one tier with two names.**

## 6.3 The model ladder — rules, not a list

The concrete "which model behind which tier" list is the configuration of a specific machine and
its subscriptions; it **does not live in this repository** (and should not: it changes faster than
any document here, and it exposes someone's stack). What lives here are the rules such a list is
built by:

1. **The agent asks for a tier; the model behind the tier is chosen once.** The agent knows how
   hard its task is; which model serves the tier is a configuration-level decision, not a
   call-level one.
2. **Adjacent top tiers may be one model at two efforts.** A plus is reasoning depth, not another
   vendor. But an effort suffix only works on models that report controllable effort; on a model
   without it, it is **silently dropped** — and a knob that is silently ignored reads as a working
   knob. Verify the model accepts the effort before building a tier on it.
3. **A metered model (pay per token) never becomes a tier's primary while a flat-rate model of the
   same class exists.** Metering spends real money; a plan spends quota.
4. **A metered model is the right LAST link of the chain** (for when the plan hits its quota wall)
   and ships disabled in the configuration. It gets turned on by a decision, not by default.

## 6.4 Models per tier — September 2026

> **Provenance.** The rows below were assembled from open sources in September 2026 and are **not
> measured by us**. This is a shortlist for choosing, not a benchmark result. Before putting any
> row in a config — run it on your own task class and compare the reviewer-finding rate.

### Tier A++ / A+ — the irreversible and architecture

| Type | Model | Notes |
|---|---|---|
| **closed** | **Claude Opus 5** | strongest in head-to-head coding arenas; ~$5/$25 per 1M; Opus 5 Max — 1505 Elo |
| closed (alt.) | GPT-6 Astra / GPT-5.6 Sol | Sol ~$5/$30 per 1M |
| closed (alt.) | Gemini 3.1 Pro | ~$2/$12 up to 200K, then ~$4/$18 — the cheapest frontier at short context |
| **open** | **Kimi K3** | 2.8T params, 1M context, multimodal; weights since 2026-07-27, custom license with large-MaaS conditions |
| **open** | **GLM-5.3** | 2026-08-14; GLM-5.2 led SWE-bench Pro (62.1%) |
| **open** | **DeepSeek V4-Pro** | 80.6% SWE-bench Verified — among the strongest open models on autonomous code |

### Tier A — contracts, schemas, boundaries

| Type | Model | Notes |
|---|---|---|
| **closed** | **Gemini 3.1 Pro** | the best price-to-reasoning at long context |
| **open** | **DeepSeek V4** | MIT license — the legally cleanest |
| **open** | **GLM-5.3** | the same weights one effort class down |
| **open** | **Kimi K2 / K3** | K2 — 80.2% SWE-bench Verified |

### Tier B+ / B — features in familiar code

| Type | Model | Notes |
|---|---|---|
| **closed** | **Gemini 3.8 Flash** | added to FrontierCode in early September 2026 |
| closed (alt.) | GPT-5.6 Luna | ~$0.20/$1.20 per 1M — the cheapest entry into a frontier family |
| **open** | **Qwen3-Coder-Next** | 70.6% SWE-bench Verified with 3B active of 80B — the most practical for local hardware |
| **open** | **GLM-5.3-Flash** | 320B total / 18B active, multimodal |
| **open** | **DeepSeek V4-Flash** | 304B, MIT |
| **open** | **MiniMax-M3** | 977K context, controllable effort `minimal…high` |

### Tier C — mechanics

| Type | Model | Notes |
|---|---|---|
| **closed** | **Claude Haiku 4.5** | ~$1/$5 per 1M |
| closed (alt.) | Gemini 3 Flash ~$0.50/$3 · Gemini 3.1 Flash-Lite ~$0.25/$1.50 · Amazon Nova Micro ~$0.035/$0.14 | the cheapest end |
| **open** | **Qwen3.8-27B** | Apache-2.0, multimodal — the practical local default |
| **open** | **Gemma 4 26B A4B** | a strong default for a laptop / edge |
| **open** | **Mistral Small 4** | 119B total / 6.5B active, 256K context |
| **open** | **Qwen3 14B** | ~10GB VRAM — when one sovereign box matters |

### On the gap

*[from the web, September 2026]* The gap between the best closed frontier models and their top
open-weight competitors stands at **29 Elo**. The practical takeaway: **at tiers C and B open
weights close the task entirely** — there is nothing to pay the frontier for; the gap starts
costing money at A+ and A++, where the error is expensive and the rollback dear.

## 6.5 Routing rules — in short

1. **The task picks the tier, not the agent's mood.** An agent asks for a tier because it knows
   how hard its work is; which model sits behind the tier is a separate decision made once.
2. **The verifier is never weaker than the generator.** A reviewer one tier below the author is a
   rubber stamp, not a review.
3. **A model tier does not rescue a bad specification.** If the task reads "make it nice",
   raising the tier is pointless — go back to `shape`.
4. **Mass work (C++) runs as one isolated call per file**, not one call per batch — otherwise
   file ownership dissolves and context isolation goes with it.
5. **A++ never runs without a human in the loop** — regardless of how good the model is.

## 6.6 What is not measured here (an open question with a trigger)

The "task tier → model tier" mapping is **not verified by experiment**. The right way to verify:
run one class of tasks on two adjacent tiers and compare the **reviewer-finding rate** — if it
does not change, the adjacent tiers collapse into one.

**Revisit Trigger:** after the first cycle where the tier was chosen deliberately — measure, and
either collapse the ladder or confirm the nine rungs with a number.

---

# Part VII. Where this construction lies — the known drift

This part exists so the guide cannot be read as a certificate.

## 7.1 Profile labels not backed by frontmatter

The routing map carries its own honesty device (the dagger footnote): for eight index rows the
profile letter is **advisory**, not denylist-enforced, and most such agents carry a `tools:`
**allowlist, which constrains harder**. What the footnote does **not** cover:

- **The CANVAS agents** are not indexed at all: `canvas-designer` and `canvas-porter-storybook`
  are labelled (A) but deny neither Write/Edit nor activate; `canvas-guardian` and
  `canvas-storybook-validator` are labelled (C) although their denylists are Profile-B-shaped and
  both create EVIDs.
- **`pseudocode` and `refinement`** (SPARC) carry the allowlist `[Read, Write, Edit, Bash, Glob,
  Grep]` with zero forgeplan tools: they allow Write/Edit (Profile A must deny) and cannot author
  an artifact.
- **`ddd-domain-expert`** is labelled (A) with the same allowlist shape — structurally unable to
  produce the bounded-contexts NOTE its section requires.

## 7.2 Two routing rows demand the impossible

| Row | Requirement | Why unsatisfiable |
|---|---|---|
| 8 (security) | an EVID from `injection-analyst` and `pii-detector` | both carry `tools: [Read, Bash, Glob, Grep]` — **zero** forgeplan tools; they cannot create the EVID |
| 9 (performance) | the baseline EVID from `performance-engineer` (the first dispatch, the row's falsifiability anchor) | the same allowlist, the same impossibility |

Removing Write/Edit (marketplace#236) fixed the "a reviewer can edit" half and left the "cannot
record" half.

## 7.3 Section playbooks lag their rows

Several `sections/NN-*.md` files still carry pre-RFC-013/016/018 chains — no orchestrator masters,
no C4 gates, no EVIDENCE-out. A routing-map row and its playbook contradict each other; the row is
the source of truth.

## 7.4 Not built

| What | Tracker |
|---|---|
| reference playbooks (the third entrypoint works; nothing ships through it) | #237 |
| the structural body checks RFC-002 names ("PRD has FRs with AC", "PROBLEM has reproduction", "SPEC linked if API") | #237 |
| thresholds are provisional — a 30-artifact calibration was promised, 16 were measured | NOTE-013 |
| the PDLC interview leg | marketplace#265 (blocked-on-core) |
| `/tech-debt` and DORA | deliberately not built, under parseable triggers |

---

# Part VIII. The cheat sheet

## What to run

```bash
# don't know what to do next
/smith

# know the task, not the methodology
/smith-plan "<task>"

# what to build (product loop)
/discover-product                    # the full Double Diamond walk
/discover-product jtbd PROB-NNN      # just the job statement
/discover-product assumptions PROB-NNN  # just the assumption map

# build (engineering loop)
/forge-cycle "<task>"                # reactive, asks on conflicts
/autorun                             # autonomous, for hours, never --force

# per methodology
/bmad        # greenfield
/sparc       # a feature in an existing service
/tdd         # tests frozen before code
/riper       # a production bug with no active degradation
/incident    # production is down right now
/canvas      # design system → code
/decision    # an architecture decision

# checks
/gate-check <ID>                     # may this move to the next stage
/gate-check <ID> --post-build        # does the build match the spec
/gate-check <ID> --loop incident_close   # close the incident loop
/gate-check <ID> --loop debt_close       # close the debt loop
/methodology-check <ID>              # S10-S13 + C4 layer coverage
/wrap                                # reconcile and close the cycle
```

## The order that does not bend

```
what to build        →  PRD active
   ↓
route (one smith row, no cocktail)
   ↓
depth recorded       →  the gate knows how strict to be
   ↓
ADI ≥3 hypotheses (Deep+)
   ↓
pre-build gate       →  may build
   ↓
build                →  C-coder, the only one allowed to write source
   ↓
audit                →  a DIFFERENT context, ground truth from git, not from the report
   ↓
evidence             →  an EVID carrying the C4 verdict and the verifier's identity
   ↓
guardian             →  a binary verdict over the WHOLE chain
   ↓
activate             →  done by the orchestrator, never the reviewer
   ↓
wrap                 →  drift + stale + link audit, a REFRESH at Deep+
```

## Five questions before any dispatch

1. **Who verifies?** If the answer is "the same agent" — stop.
2. **What will the proof be?** If the answer is "its report" — stop.
3. **Which task tier?** If there is a plus — what scaffolding does it buy?
4. **Do the files overlap with a sibling's?** If yes — they are not siblings, they are
   `blockedBy`.
5. **What do we roll back if it fails?** At A++ the answer is written **before** starting.

---

**Mechanics sources:** read off disk 2026-09-04 — `project-agent-matrix.yaml`,
`AGENT-AUTHORING-GUIDE.md`, `smith/routing-map.md`, `quality-gates.yaml`, `guardian.md`,
`discover-product/SKILL.md`, `gate-check/SKILL.md`, `scripts/ci/*`, the hooks of five plugins.
Artifacts: PRD-024, RFC-002, ADR-005, ADR-009, ADR-010, ADR-012, ADR-013, ADR-020, ADR-022,
ADR-023, ADR-024, PROB-002, RFC-011.

**Model-tier sources:** the ladder rules — from a measured internal configuration (outside this
repository); the model shortlist — open sources, September 2026, not measured here.
