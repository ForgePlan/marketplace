---
name: tdd
description: |
  Enforced-TDD entry point. Runs the C1-C6 sub-cycle the tdd-orchestrator drives: precondition check
  (PRD + SPEC active with #### Scenarios) → tdd-planner (scenarios → test plan) → coder-tdd (RED:
  plan → failing tests) → tdd-test-validator (C4: certify tests, freeze the SPEC oracle on PASS via a
  normalized full-file hash) → coder (GREEN: code to pass the frozen tests, cannot edit tests) → lint →
  EVIDENCE-out into the forgeplan Audit. Each tier is a separate isolated dispatch (generator≠verifier).
  Test immutability during GREEN is enforced by a fail-closed PreToolUse gate, not by prompt. Use when a
  feature has an active SPEC with #### Scenarios and you want tests-frozen-before-code with structural
  enforcement.

  Triggers: "tdd", "/tdd", "test-driven", "test driven development", "write tests first", "RED GREEN",
  "frozen oracle", "enforced tdd", "tests before code", "напиши тесты сначала", "TDD цикл", "красный зелёный"
---

# /tdd — enforced-TDD sub-cycle entry point

`/tdd` is the entry point the **`tdd-orchestrator`** (the L2 methodology master) uses to run the full
enforced-TDD sub-cycle for a feature that already has an active SPEC. It is the first instance of the
**AD/AID-PDLC sub-cycle contract** (ADR-010): forgeplan is the harness that gates entry and exit; the
TDD plugin supplies the master (C2) + phase agents (C3) + the independent verifier (C4); a fail-closed
PreToolUse hook (C5) keeps the phases honest. Writing the tests **is** the act of design — the SPEC's
frozen `#### Scenario`s are declarative design, the tests are executable design, the code realizes them.

This skill documents the dispatch sequence the orchestrator follows, the phase/state CLI it writes, the
already-built gate it relies on, and the `stack.json` config the gate reads. Per **RFC-012 FR-7** and
**DESIGN D0a / D3**.

> **Scope boundary.** This sub-cycle owns Design→Build (plan → RED → freeze → GREEN → lint). It does
> **not** re-run a QA/probe slab on the code — that is the forgeplan **Audit** stage (its own sub-cycle:
> `code-reviewer` / `guardian` / `security-expert` for the CODE). `/tdd` hands off into Audit at C6.

---

## Hard precondition (C1 entry gate)

The sub-cycle starts **only** when **PRD + SPEC are both `active`** and the SPEC carries at least one
`#### Scenario` block. No SPEC → no oracle → no plan. The orchestrator **refuses to start** without
them — forgeplan holds the reins here.

Check before dispatching anything:

```
forgeplan_get SPEC-NNN        # status must be "active"; body must contain "#### Scenario"
forgeplan_get PRD-NNN         # the parent PRD must be "active"
```

If the SPEC is `draft`, or has no `#### Scenario` blocks, **stop** and route the user to the
Specification phase (`agents-sparc:specification` / `/forge-cycle`) to produce a scenario-bearing SPEC
first. Do not synthesize scenarios on the fly — the SPEC is the frozen oracle, and an oracle invented
mid-flight defeats the entire control.

---

## Dispatch sequence (C2 master coordinates A→B→C→D)

The `tdd-orchestrator` **coordinates, never executes** — it dispatches each tier as a **separate Task
in an isolated context**, enforces a blocking quality-gate between every phase, and writes nothing
itself (its denylist blocks Write/Edit + forgeplan mutations). All four contexts (A/B/C/D) are
**separate dispatches** — this is required, not optional: it is the generator≠verifier discipline
(ADR-009 / ADR-010) applied to tests, not just code.

| Step | Phase | Agent (context) | In → out | Gate to advance |
|------|-------|-----------------|----------|-----------------|
| 0 | — | orchestrator | precondition check (C1) | PRD+SPEC active, SPEC has `#### Scenario` |
| A | `tdd-plan` | `tdd-planner` (ctx A) | frozen scenarios → test **PLAN** (what to assert, edge cases, RED-first) — language-neutral, no code | plan artifact exists |
| B | `tdd-red` | `coder-tdd` (ctx B) | plan + `stack.json` → **failing tests** in the stack's engine | valid RED confirmed (see below) |
| C | `tdd-red` | `tdd-test-validator` (ctx C) | tests → **PASS / CONCERNS / BLOCKER** + EVIDENCE | PASS → **freeze oracle** (D6); FAIL → back to coder-tdd |
| D | `tdd-green` | `coder` (ctx D, reuse `agents-core:coder`) | frozen RED tests + SPEC → **GREEN** (cannot edit tests) | tests pass; lint clean |
| exit | `done` | orchestrator | EVIDENCE-out (carries C4 PASS verdict) → forgeplan **Audit** | per C6 below |

> **Note on phase `tdd-red`:** it spans **both** Step B (coder-tdd writes tests) and Step C (tdd-test-validator certifies them). The state does NOT advance to `tdd-green` until the validator PASSes and the oracle is frozen — two agents legitimately share the `tdd-red` phase label; this is not a state duplication.

```
[C1: PRD + SPEC active, SPEC has #### Scenarios]
  ▼ tdd-planner ........ (ctx A) scenarios → test PLAN ("what to assert")
  ▼ coder-tdd .......... (ctx B) plan → failing tests (RED), language-specific
  ▼ tdd-test-validator . (ctx C) tests correct? cover every scenario? valid RED? not vacuous?
  │     FAIL → back to coder-tdd ;  PASS → FREEZE oracle (normalized SPEC hash)
  ▼ coder .............. (ctx D) code to pass FROZEN tests (GREEN); cannot edit tests; lint each change
  ▼ → forgeplan Audit (reviewer/guardian for CODE) → EVIDENCE (carries C4 PASS verdict) → Activate
```

### Step 0 — precondition + initialize state

After the C1 check passes, the orchestrator writes the initial state file (phase `tdd-plan`) via the
phase/state CLI (below), recording `spec_id` and `spec_path`. `spec_hash` stays **empty** — the oracle
is not frozen until the validator certifies the tests at step C.

### Step A — `tdd-planner` (phase `tdd-plan`)

Dispatch `tdd-planner` to turn the SPEC's `#### Scenario`s into a **test plan**: the cases to write,
what each asserts, the edge cases, and the RED-first ordering. Language-neutral — it picks no engine and
writes no code. It writes a **plan artifact** (via forgeplan MCP). On a complex SPEC it may invoke FPF
`fpf-decompose` to split scenarios into bounded test groups (C7, on-demand). During `tdd-plan` the gate
**denies both source and test writes** — only the plan artifact may be produced.

Gate to advance: the plan artifact exists. Orchestrator transitions state → `tdd-red`.

### Step B — `coder-tdd` (phase `tdd-red`)

Dispatch `coder-tdd` to turn the plan into **failing tests** in the stack's engine (read from
`stack.json`). It writes test files; it may write source **only** with a `STUB:TDD` marker (minimal
stubs so the tests can import/compile). It does not deliberate over options — RED authoring is a pinned
behavioral discipline.

**Valid RED** (the advance gate): a test is valid-RED iff it **compiles, executes ≥1 assertion, and
fails on that assertion** — NOT on a compile/import/collection error (NOTE-021 B6; SWE-bench
fail-before/pass-after excludes setup failures). A compile error or zero collected tests is an
**INVALID** red and must NOT unlock GREEN. The orchestrator runs the stack's `test_command` and confirms
assertion-level failure before advancing.

### Step C — `tdd-test-validator` (C4 independent verifier, still phase `tdd-red`)

Dispatch `tdd-test-validator` in a **fresh isolated context** — a different context from the one that
wrote the tests. This is the load-bearing anti-self-grading control: the agent that wrote the tests
(coder-tdd) does not certify them. It checks:

- every `#### Scenario` has ≥1 covering test;
- the RED is valid per the definition above (assertion failure, not collection error);
- tests are not tautological / vacuous;
- assertion strength is adequate;
- no mock gaps that would let a wiring failure pass silently.

It may invoke FPF `fpf-evaluate` (Trust Calculus) on contested completeness (C7). It renders a binary
**PASS / CONCERNS / BLOCKER** and emits EVIDENCE.

- **FAIL (CONCERNS/BLOCKER)** → orchestrator returns to step B (`coder-tdd`) with the findings.
- **PASS** → orchestrator **freezes the oracle**: it stamps the SPEC's **normalized full-file SHA-256**
  into `spec_hash` in the state file, then transitions state → `tdd-green`. From this moment the gate
  blocks any test edit and any SPEC drift during GREEN.

### Step D — `coder` (phase `tdd-green`)

Dispatch the reused `agents-core:coder` to write source code that makes the **frozen** tests pass. The
coder **cannot edit test files** — this is enforced two ways: the PreToolUse gate (binding, path+phase
aware) and the coder's GREEN discipline. If a test is genuinely wrong, the coder **STOPS** and emits
`TEST_BUG: {file}:{line} — {description}` — it never silently fixes a frozen test. Lint/format runs
after each change. If the SPEC's live normalized hash drifts from the frozen `spec_hash` mid-GREEN, the
gate BLOCKS (the oracle moved under the implementation) — re-run the validator to re-certify.

Gate to advance: tests pass and lint is clean. Orchestrator transitions state → `done`.

### Step exit — EVIDENCE-out (C6) → forgeplan Audit

The sub-cycle ends by emitting an EVIDENCE artifact whose body **embeds the `tdd-test-validator` (C4)
PASS verdict and its agent identity** — the downstream gate unblocks only on that PASS from context C,
distinct from the test-author context B (ADR-010 C6 invariant: EVIDENCE presence alone is not
sufficient). Activation follows ADR-006: the orchestrator emits the activation sentinel and never calls
`forgeplan_activate` itself. The EVIDENCE then exits into the forgeplan **Audit** stage
(`code-reviewer` / `guardian` for the CODE) → Activate.

---

## Phase model (micro-states inside Build)

State lives per-branch in `.forgeplan/tdd/state-<branch-slug>.json` (resolved via the git repo root;
the branch slug is the branch name with non-alphanumerics → `-`, truncated to 80 chars, plus a 6-char
hash so `foo-bar` and `foo_bar` never collide). The orchestrator **writes** phase transitions via the
small CLI below; the **hook only reads**.

| Phase | who works | test file | source file | transition out (gate) |
|-------|-----------|-----------|-------------|-----------------------|
| `tdd-plan` | tdd-planner | deny | deny | plan artifact exists |
| `tdd-red` | coder-tdd → tdd-test-validator | **allow** | deny unless `STUB:TDD` marker | valid RED confirmed **and** validator PASS |
| `tdd-green` | coder | **deny (#1 control)** | allow (blocked on SPEC-hash drift) | tests pass + lint clean |
| `done` | — (→ forgeplan Audit) | allow | allow | terminal — gate allows all writes |
| (no state file) | — | allow | allow | TDD not active on this branch |

The **#1 control** is blocking the GREEN actor from writing test paths (NOTE-021 B2: literal test-file
editing is the dominant cheat, >79%). `STUB:TDD`-in-RED is #2. Bash write-redirects (`echo > test.py`,
`sed -i`, `tee`) are caught by the same classification path, closing the Edit-gate bypass.

---

## The already-built gate (C5 enforcement)

The PreToolUse gate is **already built** — do not re-implement it:

- **Hook config**: `hooks/hooks.json` → `PreToolUse` matcher `Write|Edit|MultiEdit|Bash` →
  `bash ${CLAUDE_PLUGIN_ROOT}/hooks/tdd-gate.sh` (timeout 10s). Registered when the plugin is enabled.
- **Gate script**: `hooks/tdd-gate.sh` — fires **before** the permission check, so it is unbypassable
  even under `bypassPermissions` (NOTE-021 A1). It is **session-global**, so it binds subagents too —
  one hook enforces all phases.
- **Shared bash lib**: `scripts/tdd-lib.sh` — provides `classify_file`, `canonicalize_path`,
  `_has_write_pattern`, `get_target_file`, `locked_update_state`, `sha256_hash_file`, and
  `normalized_spec_hash`. The phase/state CLI reuses `locked_update_state` + `normalized_spec_hash`.

### Block mechanism (DESIGN D2 — `permissionDecision:deny`, fail-closed)

- **Deny**: `exit 0` + stdout JSON
  `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"<why>"}}`.
- **Allow**: plain `exit 0` (no stdout).
- **Fail-closed (`exit 2`)**: on any *error* condition — `jq` missing, unparseable stdin, unparseable
  state file, missing `stack.json`, no SHA-256 tool when the oracle check is needed, or an unknown
  phase. Unexpected input must never become allow (PAT-001 clause-5). This is error-handling *inside*
  the deny approach, not a second gate.

### What the gate enforces per phase

The gate reads `phase` from the state file, classifies the target file via `stack.json` globs, and
applies the phase rule:

- `tdd-plan` → deny source **and** test writes.
- `tdd-red` → allow test writes; deny source writes **unless** the write content contains `STUB:TDD`.
- `tdd-green` → **deny test writes** (#1 control); allow source writes; **but** if the SPEC's live
  normalized hash ≠ the frozen `spec_hash` in state → **BLOCK** (oracle drift, FR-6).
- `done` or no state file → allow all writes (TDD complete / not active on this branch).

`disallowedTools` on the agents is the **coarse, secondary** layer (tool-name-scoped, our B2 paradigm);
the hook is the **path + phase-aware backstop** and the **sole structural control** on test-path writes
(Claude Code `disallowedTools` cannot express path-scoped denial). Defense in depth — neither alone is
sufficient.

---

## Phase/state CLI (orchestrator writes, hook reads)

The orchestrator drives state transitions with a small CLI built on the lib primitives. There is **no
native state machine** (NOTE-021 A3) — the plugin persists its own state, found via the git repo root.
The CLI never blocks; it only records the phase the orchestrator has decided to enter. The hook is the
**only** reader of this state and the only enforcer.

State file shape (`.forgeplan/tdd/state-<branch-slug>.json`):

```json
{ "phase": "tdd-plan | tdd-red | tdd-green | done",
  "spec_id": "SPEC-NNN",
  "spec_path": "<path to the SPEC artifact body>",
  "spec_hash": "<normalized full-file SHA-256 — empty until validator PASS, then stamped>",
  "plan_artifact": "<path>",
  "started_at": "<ISO>",
  "phase_entered_at": "<ISO>" }
```

Conceptual operations (each an atomic `locked_update_state` write under a mkdir-lock):

| Operation | When | Effect |
|-----------|------|--------|
| init | step 0, after C1 passes | create state with `phase=tdd-plan`, `spec_id`, `spec_path`; `spec_hash` empty |
| advance → `tdd-red` | plan artifact exists | set `phase=tdd-red`, `plan_artifact`, `phase_entered_at` |
| **freeze** → `tdd-green` | validator PASS (C4) | stamp `spec_hash = normalized_spec_hash(spec)`; set `phase=tdd-green` |
| advance → `done` | tests pass + lint clean | set `phase=done` (terminal; gate allows all writes) |

Freezing uses `normalized_spec_hash` (CRLF→LF, per-line trailing-whitespace stripped, trailing blank
lines dropped — **safe normalization only**, no semantic reordering). The hook recomputes the same
normalized hash on every GREEN write and compares against the stamped `spec_hash`; a mismatch is a
BLOCKER.

---

## `stack.json` — language binding (DESIGN D5)

The gate cannot call MCP, so it reads the test/source globs from a fast client-side cache:
`.forgeplan/tdd/stack.json`. This is a **derived projection**, never hand-authored as source.

- **Source of truth** = a **stack-ADR** (`kind=adr`, e.g. "Stack: Python / pytest") — durable, in the
  artifact graph, set once per project. This matches the harness model (decisions live in the graph) and
  C1 entry-by-state (the master reads the stack from the artifact).
- **Derived cache** = `.forgeplan/tdd/stack.json`, generated by the orchestrator/setup **from** the
  stack-ADR so the hook reads it without MCP (A2/A5).

The gate reads these flat fields from `stack.json`:

```json
{ "language":        "python",
  "test_command":    "pytest -q",
  "test_file_glob":  "tests/*.py|*_test.py|test_*.py",
  "source_file_glob": "src/*.py",
  "red_confirm":     "FAILED",
  "lint_command":    "ruff check ." }
```

Globs are pipe-delimited; a pattern containing `/` matches the full relative path, otherwise the
basename. `test_file_glob` and `source_file_glob` drive `classify_file`; `red_confirm` is the
assertion-failure marker the orchestrator uses to distinguish a valid RED from a collection error;
`test_command` / `lint_command` are what the orchestrator runs at the RED and GREEN gates.

- **Name discipline**: it is `stack.json` — NOT `workflow-config` (collides with the native CC
  `.claude/workflows/` feature, NOTE-021 A6) and NOT a bare `config.json` (too generic). It binds the
  **stack**.
- **Not the language matrix.** The per-language reference data (`helpers/pbt-*.md`) for `coder-tdd` on
  *how* to write tests in each engine is a **separate** thing from `stack.json`, which says *what command
  runs them*. "How to write" vs "what to run" — do not conflate.

---

## HARD RULES

1. **Never start without C1.** PRD + SPEC must be `active` and the SPEC must contain `#### Scenario`
   blocks. No SPEC → no oracle → refuse and route to Specification.
2. **Four separate contexts, always.** `tdd-planner` (A) / `coder-tdd` (B) / `tdd-test-validator` (C) /
   `coder` (D) are distinct Task dispatches in isolated contexts. The verifier (C) must never share a
   context with the test author (B) — that would be self-grading and defeats the control.
3. **Freeze only at validator PASS.** `spec_hash` stays empty until `tdd-test-validator` returns PASS.
   Freezing earlier (e.g. right after RED) freezes uncertified tests.
4. **The orchestrator writes state; the hook reads it.** Never let a phase agent write the state file or
   weaken the gate. The orchestrator coordinates and never writes the work product itself.
5. **GREEN never edits tests.** If a frozen test is wrong, the coder STOPS and emits
   `TEST_BUG: {file}:{line} — {desc}`. Silently editing a frozen test is the exact failure this
   sub-cycle exists to block; the gate denies it regardless.
6. **EVIDENCE-out carries the C4 verdict.** The C6 EVIDENCE must embed the `tdd-test-validator` PASS
   verdict + identity. Do not unblock the next stage on EVIDENCE existence alone (ADR-010 C6).
7. **Never activate from here.** Activation is the orchestrator-via-sentinel → runtime-gate pattern
   (ADR-006); `/tdd` emits the sentinel and hands off into the forgeplan Audit stage.

---

## Output (orchestrator handoff)

When the sub-cycle completes, return a short structured handoff:

```
TDD sub-cycle complete for SPEC-NNN (branch <slug>)
  plan:      <plan_artifact>
  RED:       <N> tests, valid-RED confirmed (assertion failure, not collection error)
  validator: PASS — EVID-NNN (covers all <M> scenarios; identity claude-code/<ver>/tdd-test-validator-task-<id>)
  freeze:    spec_hash <first12>… stamped at validator PASS
  GREEN:     <K> source files; tests pass; lint clean; TEST_BUG count = 0
  EVIDENCE:  EVID-NNN (carries C4 PASS verdict) → forgeplan Audit
  next:      Audit stage (code-reviewer / guardian for the CODE) → activate via sentinel (ADR-006)
```

If the cycle stops early (C1 fail, validator BLOCKER, oracle drift, or a `TEST_BUG` that needs human
adjudication of the SPEC), report the phase it stopped in and the exact blocker.

---

## Common failures (and how to avoid them)

| Failure | Avoidance |
|---------|-----------|
| Starting with a `draft` SPEC or no `#### Scenario`s | HARD RULE 1 — refuse; route to Specification first |
| Validator runs in the same context as `coder-tdd` | HARD RULE 2 — fresh isolated Task dispatch for C; generator≠verifier |
| Freezing the oracle right after RED | HARD RULE 3 — freeze only at validator PASS; uncertified tests are not an oracle |
| GREEN actor "fixes" a wrong test | HARD RULE 5 — STOP + `TEST_BUG:`; the gate denies the write anyway |
| Treating a compile/collection error as a valid RED | Valid RED = assertion failure with ≥1 assertion executed (NOTE-021 B6) |
| Editing the SPEC mid-GREEN | Gate BLOCKS on hash drift (FR-6); re-run the validator to re-certify |
| Hand-authoring `stack.json` | It is a derived cache from the stack-ADR; regenerate, don't edit by hand |
| Unblocking Audit on EVIDENCE existence alone | HARD RULE 6 — the EVIDENCE must embed the C4 PASS verdict + identity |
| Re-running a QA slab on the code inside `/tdd` | Out of scope — that is the forgeplan Audit stage's sub-cycle |

---

## Related

- **RFC-012** (FR-1..FR-7) — the enforced-TDD pipeline this skill drives.
- **ADR-010** — the AD/AID-PDLC sub-cycle contract (C1-C7) TDD instantiates.
- **DESIGN.md** D0a (the flow) / D2 (gate mechanism) / D3 (phase model) / D5 (stack.json) / D7
  (tdd-test-validator) / D8 (state file) / D9 (tool posture).
- **ADR-009 / RFC-011 / PROB-002** — generator≠verifier + ground-truth verification foundation.
- **ADR-006** — activation sentinel → orchestrator-activates → runtime-gate pattern (C6 inherits it).
- Built assets in this plugin: `hooks/tdd-gate.sh`, `hooks/hooks.json`, `scripts/tdd-lib.sh`; agents
  `tdd-orchestrator` / `tdd-planner` / `coder-tdd` / `tdd-test-validator` (+ reuse `agents-core:coder`
  for GREEN).
