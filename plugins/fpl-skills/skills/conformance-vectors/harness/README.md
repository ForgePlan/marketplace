# Generic conformance harness (corpus-agnostic)

Reusable harness for the `## Conformance Vectors` convention — see `../SKILL.md` for when to use it (ADR-008: multi-language targets / pure algorithmic cores only; NOT every feature). For the proven, worked example see `../reference/semver/` (TS/Py/Go/Rust, EVID-119).

This harness is **corpus-agnostic**: it drives ANY frozen corpus + per-language runners. It enforces the three universal gates — **freeze**, **conformance**, **cross-language equivalence** — and a mandatory **negative control**. Domain-specific invariants that need derived probes (e.g. semver transitivity over all operands) are NOT generic; encode those in a per-corpus adapter like `../reference/semver/harness/equiv-check.mjs`.

## Layout your corpus directory like this

```
<corpus-dir>/
├── spec/
│   ├── corpus.json        # the frozen oracle: { spec, function, signature, semantics, invariants[], vectors:[{id,input,expected}] }
│   └── corpus.sha256       # OPTIONAL freeze pin (the sha256 of corpus.json); run.sh verifies against it
├── runners.json            # copy runners.example.json and edit — one entry per language
├── impl/<lang>/...         # the pure implementation(s) (+ a deliberately-broken twin for the negative control)
└── cli/run_<lang>.*        # ~15-line runner: read `input` lines from stdin -> print one result line each
```

## Vector format

Each vector is `{ "id": "...", "input": "<stdin payload, one line>", "expected": "<exact stdout>", "note": "..." }`. Encode multiple arguments inside `input` (e.g. TSV `"a\tb"`) and parse them in the runner. The harness compares `expected` to stdout as **strings** — no per-language coercion.

## Runner contract (the dumb-worker protocol)

A runner MUST:
1. Read probe lines from **stdin** (one `input` per line).
2. Print **one stdout line per input** — the result, as a string.
3. Honor `CONFORMANCE_BREAK=1` in its env by loading a deliberately-broken implementation (this is what lets the negative control go RED). When the var is absent, load the real impl.
4. Never read `expected` and never decide pass/fail — the comparator owns the verdict.

See `../reference/semver/cli/run_py.py` for the canonical ~15-line runner (it honors `SEMVER_BREAK`; a generic runner honors `CONFORMANCE_BREAK`).

## Run

```bash
# Full gate (freeze + conformance + equivalence + negative controls):
./run.sh <corpus-dir>

# Individual gates:
node verify-freeze.mjs --corpus <corpus-dir>/spec/corpus.json --pin <sha256>   # freeze (verify)
node verify-freeze.mjs --corpus <corpus-dir>/spec/corpus.json                  # compute the pin
node conformance-equiv.mjs --corpus <corpus-dir>/spec/corpus.json --runners <corpus-dir>/runners.json
node conformance-equiv.mjs --corpus ... --runners ... --break py               # negative control: must go RED
```

`run.sh` exit 0 = all gates green; non-zero = block. Wire it as a CI step / a guardian pre-activation check for any SPEC that declares more than one target language (the cross-language equivalence guardian-gate — see `../SKILL.md`).

## Requirements

`node` (>=20 for the comparator + freeze gate). Each language's runner needs its own toolchain (python3 / node / go / rustc …) only when that language is in `runners.json`.
