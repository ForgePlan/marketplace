# agents-tdd

Enforced test-driven development as a first-class methodology: a master orchestrator plus RED/GREEN/verify phase agents, backed by a fail-closed PreToolUse gate that makes "tests are frozen before code, and the implementer cannot edit them" a structural guarantee — not a prompt.

This pack is the **first concrete instance of the AD/AID-PDLC sub-cycle contract** (ADR-010) — the reusable shape every forgeplan methodology (BMAD / SPARC / RIPER / DDD / TDD) follows. The TDD build mandate is RFC-012.

For how the TDD sub-cycle sits inside the full pipeline, see the [Process Reference (EN)](../../docs/process-from-idea-to-delivery-EN.md) / [(RU)](../../docs/process-from-idea-to-delivery-RU.md).

## Installation

```bash
/plugin install agents-tdd@ForgePlan-marketplace
```

## The TDD sub-cycle (contract C1–C6)

```
[C1 entry gate]  PRD + SPEC active, SPEC has #### Scenario blocks
      |
      v  tdd-planner ........ scenarios -> test PLAN (what to assert), language-neutral
      v  coder-tdd .......... plan -> failing tests (RED), in the stack's engine
      v  tdd-test-validator . independent verifier: tests correct? cover every scenario?
      |        FAIL -> back to coder-tdd ;  PASS -> FREEZE the oracle
      v  coder (agents-core) . code to pass the FROZEN tests (GREEN); cannot edit tests
      v  lint each change
[C6 exit]  EVIDENCE-out carries the validator PASS verdict -> forgeplan Audit -> Activate
```

The work product of each phase is produced in a **separate isolated context** (generator ≠ verifier, ADR-009): the agent that writes the tests never certifies them, and the agent that writes the code can never edit the tests.

## Agents (4)

Legend: ⚙ = forgeplan-aware (B2 paradigm — see [AGENT-AUTHORING-GUIDE.md](../fpl-skills/AGENT-AUTHORING-GUIDE.md)).

| Agent | Profile | Description |
|-------|:-------:|-------------|
| `tdd-orchestrator` ⚙ | B-orchestrator | Master — dispatches the four phases via `Task`, enforces a blocking quality-gate between every phase, writes the per-branch state file. Coordinates, never executes. Peer of `smith` / `sparc-orchestrator`. |
| `tdd-planner` ⚙ | A (Creator) | Language-NEUTRAL — reads the frozen `#### Scenario` blocks and produces a test PLAN (cases, what-to-assert, edge cases, RED-first) as a forgeplan artifact. Writes no code, picks no language. |
| `coder-tdd` ⚙ | C-coder (tests) | RED test-writer — turns the plan into failing tests in the stack's engine (read from `stack.json`). Valid RED = compiles AND ≥1 assertion executes AND fails on the assertion (never a compile/collection error). |
| `tdd-test-validator` ⚙ | B-gate | Independent verifier — certifies every scenario is covered, RED is valid, tests are not tautological, assertion strength is adequate, no mock gaps. Binary PASS/CONCERNS/BLOCKER + EVIDENCE. A different context from `coder-tdd`. |

The GREEN phase reuses **`agents-core:coder`** (Profile C-coder) — it is not duplicated here. `agents-core:coder` carries a TDD GREEN-phase discipline section (never edit tests; emit `TEST_BUG:` instead).

## Enforcement (the gate)

`hooks/tdd-gate.sh` is a fail-closed PreToolUse hook (registered in `hooks/hooks.json` for `Write|Edit|MultiEdit|Bash`). It reads the per-branch phase state and enforces:

| Phase | test files | source files |
|-------|-----------|--------------|
| `tdd-plan` | deny | deny |
| `tdd-red` | allow | deny unless content carries a `STUB:TDD` marker |
| `tdd-green` | **deny** (the #1 control — the implementer cannot edit the frozen tests) | allow, **unless** the SPEC's normalized hash drifted from the frozen oracle |

Block mechanism: `permissionDecision: deny` (fires before the permission check — unbypassable). Any unexpected condition (missing `jq`, unparseable stdin, corrupt state, missing hash tool, contradictory state) → `exit 2`, never a silent allow. Bash write-redirects (`echo > test.x`, `sed -i`, `tee`) are caught and classified the same as a direct edit.

The frozen oracle is a **normalized full-file SHA-256 of the SPEC** (not a scenario-level hash — see RFC-012 FR-6 / EVID-130), stamped when the validator PASSes and re-checked on every GREEN write.

## Skill

- **`/tdd`** — the entry point the orchestrator uses to run the C1–C6 flow end to end (precondition check → planner → RED → validate+freeze → GREEN → lint → EVIDENCE-out).

## Configuration

| File | Role |
|------|------|
| `.forgeplan/tdd/stack.json` | Per-project language binding (derived from a stack-ADR): `test_command`, `test_file_glob`, `source_file_glob`, `red_confirm`, `lint_command`. The hook reads this; one `coder-tdd` is parameterized by it rather than N per-language agents. |
| `.forgeplan/tdd/state-<branch>.json` | Per-branch phase state. The orchestrator writes it via the `tdd-lib.sh` CLI; the hook only reads. |

## Usage

```
Task({ subagent_type: "tdd-orchestrator", prompt: "Drive SPEC-NNN through the TDD cycle" })
Task({ subagent_type: "tdd-planner", prompt: "Plan the tests for SPEC-NNN scenarios" })
Task({ subagent_type: "coder-tdd", prompt: "Write the failing tests from the plan" })
Task({ subagent_type: "tdd-test-validator", prompt: "Certify the RED tests before GREEN" })
```

Or route through `smith`: a "TDD-first feature" context (routing-map row) dispatches this sequence.

## Version history

- **v0.1.0** (current) — initial build (RFC-012). Master + 3 phase agents + `/tdd` skill + fail-closed gate + `tdd-lib.sh` + normalized full-file SPEC-hash freeze. First instance of the ADR-010 sub-cycle contract.

For complete change history, see [`forgeplan-marketplace/CLAUDE.md`](../../CLAUDE.md).

## License

MIT
