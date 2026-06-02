---
name: conformance-vectors
description: |
  The OPTIONAL `## Conformance Vectors` enrichment for spec-driven development (ADR-008): a frozen, hash-pinned, language-neutral conformance corpus that is the SOLE behavioral oracle for an implementation, plus a per-language harness and a cross-language equivalence gate. Use when a SPEC targets MORE THAN ONE implementation language (REQUIRED — prose scenarios alone diverge across languages) or for a pure algorithmic core where prose under-specifies. Do NOT use for ordinary single-language features — the SPEC's `#### Scenario` blocks are the oracle there. Proven across 4 languages (TS/Py/Go/Rust) in `reference/semver/` (EVID-119).

  Triggers: "conformance vectors", "conformance corpus", "cross-language equivalence", "multi-language spec", "frozen oracle", "language-neutral corpus", "spec conformance harness", "конформанс-вектора", "кросс-языковая эквивалентность"
origin: forgeplan
---

# conformance-vectors — frozen, language-neutral conformance corpus (SDD optional enrichment)

This skill documents the **`## Conformance Vectors`** convention — the OPTIONAL heavy half of spec-driven development. Per **ADR-008**, the SDD spine is prose `#### Scenario` blocks (see `/spec-author`); Conformance Vectors are an enrichment layered on top **only when justified**.

> **One frozen corpus is the sole oracle.** Each language implementation is tested ONLY against that corpus; a comparator asserts every language agrees on every vector; the corpus is hash-pinned so an implementer can never edit the oracle to make a test pass. This is the "don't grade your own homework" discipline made executable across languages (generator≠verifier, ADR-009).

---

## When to use (ADR-008 invariant)

| Situation | Conformance Vectors? |
|---|---|
| A SPEC targets **>1 implementation language** | **REQUIRED.** Prose scenarios are single-language-safe only — two languages can each pass their own prose-derived tests yet diverge (EVID-120 F2: Python `str.isdigit()` accepts Unicode digits, TS `/^[0-9]+$/` does not). The executable corpus is the only thing that catches this. |
| A **pure algorithmic core** where prose under-specifies (parsers, comparators, encoders, precedence rules) | **MAY** — add vectors when GIVEN/WHEN/THEN cannot pin the edge cases precisely. |
| An ordinary **single-language** feature | **NO.** The SPEC's `#### Scenario` blocks ARE the oracle (the SDD spine). Adding a corpus here is ceremony that violates "process overhead scales with risk." |

If you are unsure, default to **no corpus** (prose scenarios). The corpus is for the genuine multi-implementation / precision-critical case, not for every feature.

---

## The corpus format (`spec/corpus.json`)

The corpus is pure data — language-neutral by construction. Adding a language NEVER touches it (proven: EVID-119 added Go+Rust with the corpus hash unchanged).

```json
{
  "spec": "SPEC-001",
  "function": "semver_compare",
  "signature": "semver_compare(a: string, b: string) -> int  // -1, 0, or 1",
  "semantics": "<the precise behavioral contract in prose — the human-readable oracle>",
  "invariants": [
    {"id": "INV-1", "rule": "identity: compare(x, x) == 0"},
    {"id": "INV-2", "rule": "antisymmetry: compare(a, b) == -compare(b, a)"}
  ],
  "vectors": [
    {"id": "v01", "input": "1.0.0\t1.0.1", "expected": "-1", "note": "patch"},
    {"id": "v02", "input": "1.0.0\t1.0.0", "expected": "0",  "note": "equal"}
  ]
}
```

- **`input`** is the exact payload one probe sends to a language runner on stdin (one line; encode multiple args with `\t`). **`expected`** is the exact stdout the runner must print for that input. The generic harness compares as strings — no per-language type coercion.
- **`invariants`** are properties that must hold beyond the enumerated vectors (identity, antisymmetry, transitivity, …). The generic harness checks vectors + cross-language equivalence; **domain invariants that require derived probes (e.g. O(N³) transitivity) live in a per-corpus adapter** — see `reference/semver/harness/equiv-check.mjs` for the worked semver invariant checks.
- The `reference/semver/` corpus uses an `{a, b, expected:<int>}` shape (a 2-arg specialisation that predates this generic `{input, expected:<string>}` form). Both are valid; new corpora SHOULD use the generic `input`/`expected` string form so the generic harness runs them unmodified.

---

## The dumb-worker protocol

Each language is a **dumb worker**, never a judge:

1. The runner reads probe lines from **stdin** (one `input` per line).
2. It calls the pure implementation and prints **one stdout line per input** (the result, as a string).
3. The **comparator owns everything else** — the corpus, the invariant definitions, and the verdict (exit code). The worker never sees `expected`, never decides pass/fail.

This is the structural reason the oracle cannot be gamed from inside a worker's turn: the worker has no access to the success criterion. Adding a language = writing a ~15-line runner (read stdin → call impl → print) + one entry in `runners.json`. See `reference/semver/cli/run_py.py` for the canonical ~15-line runner.

---

## The three gates

A conformance run is PASS only if all three hold. Each is a hard exit-code gate (no prose, no self-report).

1. **Freeze / hash-pin** (`harness/verify-freeze.mjs`) — `sha256(corpus.json)` MUST equal the pin recorded in the SPEC (`## Conformance Vectors` → `corpus_sha256: <hash>`). A mismatch means the oracle drifted → **BLOCKER**. This is the abort-on-oracle-edit guarantee: an implementer who edits the corpus to pass changes its hash and the freeze gate fails.
2. **Conformance** (`harness/conformance-equiv.mjs`) — for every language, `output[i] == vectors[i].expected` for all vectors. A single miss → fail. Plus the per-corpus invariant checks where present.
3. **Cross-language equivalence** (`harness/conformance-equiv.mjs`) — for every vector, ALL languages produce the SAME output. Zero mismatches required. This is the gate prose scenarios cannot give you: it catches two implementations that each pass their own tests but disagree with each other.

Negative control (mandatory before trusting the gate): inject a bug into EACH language in turn (`--break <lang>`, wired to a `*_broken` impl or an env flag) and confirm the comparator goes RED for every one. A gate that never fails is a null gate (the gap-test discipline, PROB-002).

---

## The cross-language equivalence guardian-gate

When a SPEC declares `target_languages: [>1]` (or its `## Conformance Vectors` block lists multiple runners), the gate is **mandatory**, not advisory:

- **guardian** (pre-activation): a multi-language SPEC whose `## Conformance Vectors` corpus is absent, hash-unpinned, or whose harness does not exit 0 → **CONCERNS** (block activation until the corpus passes). Single-language SPECs are exempt (prose scenarios suffice).
- **CI / pre-merge**: `harness/run.sh <corpus-dir>` is the gate — exit 0 = freeze+conformance+equivalence all pass; non-zero = block. Wire it as a CI step for repos that ship multi-language conformance specs.
- **`/methodology-check`**: a SPEC with `target_languages: [>1]` and no `## Conformance Vectors` section scores the S-spec layer PARTIAL with the action item "multi-language target requires a conformance corpus (ADR-008 invariant)."

This is consistent with the repo's structural-vs-semantic doctrine (G6/G7): the harness checks structure (did every language produce the same pinned-corpus output?) — it does NOT judge whether the corpus itself is adequate. Corpus adequacy is a Profile-B / guardian semantic responsibility (R-1 in PRD-072).

---

## How to add a conformance corpus to your SPEC

1. Author the SPEC spine first (`/spec-author`): `## Requirements` + `#### Scenario` + `## Behavioral Contract`.
2. Decide if you need vectors (table above). If single-language → stop; scenarios are your oracle.
3. Write `corpus.json` (format above) — the precise `semantics` prose + the vectors + invariants.
4. Add a `## Conformance Vectors` section to the SPEC body with: `corpus_path:`, `corpus_sha256:` (the freeze pin), `target_languages:`, and a one-line pointer to the harness.
5. For each target language: write the pure impl + a ~15-line runner + a `runners.json` entry. Copy the shape from `reference/semver/`.
6. Run `harness/run.sh <corpus-dir>` → must be PASS (freeze + conformance + equivalence) + negative-control RED for each language.
7. The implementer MUST NOT edit `corpus.json` to make a test pass — a wrong vector is a SPEC supersede, never an inline edit (ADR-008 read-only-oracle invariant).

---

## Reference + harness

- **`reference/semver/`** — the PROVEN 4-language example (TS/Py/Go/Rust, 20 vectors, EVID-119 PASS). Copy its shape. `spec/corpus.json` (the oracle), `impl/{py,ts}/` (+ `_broken` negative controls), `cli/run_{ts,py,go,rs}.*` (the ~15-line runners), `harness/{verify-hash,equiv-check,run-all}` (the semver-specific harness incl. the domain invariant checks INV-1..4).
- **`harness/`** — the GENERIC, reusable harness (corpus-agnostic): `verify-freeze.mjs` (freeze gate, `--pin`), `conformance-equiv.mjs` (conformance + cross-language equivalence over `{input,expected}` vectors + a `runners.json` manifest), `run.sh` (orchestrator), `runners.example.json`, `README.md`. Use these for a NEW corpus without editing the semver reference.

---

## Companion skills & references

- [`/spec-author`](../spec-author/SKILL.md) — authors the SDD spine (Requirements + Scenarios + Behavioral Contract). Conformance Vectors layer on top of a spec authored there.
- **ADR-008** — spec-driven spine; conformance corpus is the OPTIONAL gate (this skill). The multi-language-requires-vectors invariant lives there.
- **PRD-072** — spec-driven pipeline PRD (FR-006 is this enrichment).
- **SPEC-001** — the semver demonstrator whose corpus `reference/semver/` carries.
- **EVID-119** — the 4-language proof (TS/Py/Go/Rust, 20/20, equivalence, per-language negative control).
- **ADR-009** — generator≠verifier (why the oracle is author-frozen + hidden from the worker).

## Anti-patterns

- ❌ **Adding a corpus to a single-language feature.** Prose scenarios are the oracle there (ADR-008). The corpus is for multi-language / precision-critical cores only.
- ❌ **Letting the implementer edit `corpus.json` to make a test pass.** The freeze gate catches the hash change; a wrong vector is a SPEC supersede, not an inline edit.
- ❌ **Trusting a green run without a negative control.** A gate that never fires is a null result — break each language once and confirm RED (PROB-002 gap-test discipline).
- ❌ **Putting domain invariants in the corpus as if they were generic.** Vectors are language-neutral data; derived invariant checks (transitivity, antisymmetry over all operands) live in a per-corpus adapter — see the semver reference.
