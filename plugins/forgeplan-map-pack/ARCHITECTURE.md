# forgeplan-map-pack — Architecture

Full design authority: **RFC-023** (architecture), **SPEC-003** (the `forgeplan.map/v1` contract), **ADR-016** (build the full pipeline from the start), **ADR-017** (deterministic guardian gate), all in this workspace's `.forgeplan/`. This file is a condensed, implementation-facing map of what's on disk — read the forgeplan artifacts for the full reasoning and the frozen alternatives-considered record.

## What this plugin does

Installed into any `forgeplan`-enabled repository, it scans that repository through an 8-agent orchestrated pipeline and emits exactly one file — `.forgeplan/map/map.json` (schema `forgeplan.map/v1`) — that `forgeplan-web`'s already-shipped composed-map view renders as an interactive, zoned "understanding map" of the project.

## The pipeline

```
precondition(.forgeplan/ exists)
  -> SCAN (parallel x3: code-scanner || forgeplan-scanner || docs-scanner)
  -> [G1] -> TYPE (inline scorer, no LLM)
  -> SELECT (inline, no LLM)
  -> EXTRACT (zone-extractor)
  -> [G2] -> VERIFY (edge-verifier)
  -> [G3] -> EMIT (map-emitter)
  -> [G4] -> VALIDATE (map-guardian)
```

`map-orchestrator` conducts all seven stages. Five are separate isolated `Task` dispatches (the three parallel scanners, EXTRACT, VERIFY, EMIT, VALIDATE); TYPE and SELECT are inline pure-function scoring the orchestrator runs in its own context — no LLM, no isolated dispatch, because neither step involves judgment a script can't make. Every gate (G1-G4) is checked by the orchestrator re-reading the actual scratch file, never by trusting a dispatched agent's prose summary. On a gate FAIL the orchestrator loops back to the named stage, up to 3 rounds, then emits `<<NEED_USER_INPUT>>` and stops.

## The 8 agents

| Agent | Role | Profile | Writes |
|---|---|---|---|
| `map-orchestrator` | Conductor | B-orchestrator | Nothing |
| `code-scanner` | Source tree, manifests, entry points | EMITTER | `.work/.scan.code.json` |
| `forgeplan-scanner` | `.forgeplan/` artifact graph (read-only MCP) | EMITTER | `.work/.scan.fpl.json` |
| `docs-scanner` | README/docs, RU narration | EMITTER | `.work/.scan.docs.json` |
| `zone-extractor` | Merges the 3 scans into zones/nodes/mega-nodes, mints content-hash ids | EMITTER | `.work/.extract.json` |
| `edge-verifier` | Classifies + grep-verifies edges | EMITTER | `.work/.edges.json` |
| `map-emitter` | Assembles + writes `map.json`'s content | EMITTER | `map/map.json` (content only) |
| `map-guardian` | Runs the deterministic gate | read-only B-gate | Nothing via tool calls (its invoked script performs one narrow `meta.status` write) |

## Three non-negotiable schema invariants (SPEC-003 §C1)

1. **Edge superset** — every edge, minus its optional extra keys, deep-equals exactly `{from, to, relation}` (a strict superset of forgeplan-web's `GraphEdge`).
2. **Content-hash node IDs** — `sha1(kind + ":" + path_or_slug)[:12]`, never a label or counter.
3. **No x/y on nodes, ever** — geometry is 100% the output of forgeplan-web's pure `computeComposedLayout()`.

## The three EMITTER-safe controls (SPEC-003 §C2)

A denylist alone is not enough — it still permits `Write`, which could target `.forgeplan/prds/*.md`. Three independent, layered controls close the surface:

1. **EMITTER denylist** — every worker agent except `map-orchestrator` (writes nothing) and `map-guardian` (its own narrower read-only+Bash profile) is granted exactly `Read, Glob, Grep, Write` (+ read-only MCP where needed; + `Bash` only for `edge-verifier`'s grep pass) and denied `Edit`, `NotebookEdit`, `MultiEdit`, and every `forgeplan_*` mutator.
2. **PreToolUse hook** (`hooks/scripts/map-emitter-gate.sh`, fail-closed) — denies any `Write`/`Edit`/`MultiEdit` under `.forgeplan/` except exactly `map/map.json` and `map/.work/**`, and denies a `map.json` write from any identity other than `map-emitter` when an identity signal is present.
3. **Guardian single-write check** (`map-guardian.mjs` GC-5) — after a run, confirms nothing besides `map/map.json` and `map/.work/**` changed. Because `map/map.json` is itself gitignored, this is *not* a bare `git status --porcelain` check — it asserts tracked paths are untouched *and* no ignored path outside `map/` changed.

The guardian's own `meta.status` flip on `exit 0` is a fourth, narrower, explicitly sanctioned write: it's a plain Node `fs` call from inside a `Bash`-invoked script, not a `Write`/`Edit`/`MultiEdit` tool call, so it is invisible to the hook by construction — bounded instead by GC-5 and a post-flip re-validate. This is documented behavior (ADR-017 Invariants), not a gap.

## The guardian (`scripts/map-guardian.mjs`)

A deterministic, dependency-free Node script — never an LLM call. Two layers:

- **Layer A** (GC-1..GC-4) — structural + cross-reference checks over the document alone. Runs on any `map.json`, including the vendored smoke-test fixture.
- **Layer B** (GC-5, GC-6, XC-1, XC-2) — pipeline-run-only checks needing real repo/git state (single-write audit, content-hash determinism, cross-source confirmation against the scan). Skipped under `--smoke`.

`exit 0` — and only `exit 0` from this script — flips `status: "proposed"` to `"confirmed"`. An advisory LLM semantic pass runs on top (in the `map-guardian` agent, not the script) but never changes the verdict.

Verified 2026-07-04 against the vendored `fixtures/checkpoint-map.json`: GC-1/GC-2/GC-3 pass cleanly; GC-4 correctly flags the fixture's 4 pre-existing `code-dep` edges as missing `verified_by` (expected — that fixture predates this contract). A clean baseline plus 8 single-mutation copies (x/y injection, duplicate id, dangling mega-node child, unknown relation, stripped `verified_by`, cell overlap, dangling edge endpoint, unpinned `cols`) each produced exactly its targeted BLOCKER. The write-path hook was separately verified against 10 synthetic PreToolUse payloads, including a path-traversal attempt that canonicalized correctly and was denied.

## Composition templates (`compositions/*.yaml`)

Data, not code — `(canvas + zones[] + arrangement + zone_hints)` per template. Selected by a pure, no-LLM scoring function the orchestrator runs inline at TYPE:

```
score = sum(strong * 0.40) + sum(weak * 0.15) - sum(negative * 0.50), clamped 0..1
>=0.70 & gap>=0.20 -> single high-confidence template
[0.40, 0.70)       -> single low-confidence, marked NEEDS_CONFIRM
<0.40               -> generic fallback (the correctness floor)
ALWAYS: .forgeplan/ present -> append a z.decisions zone, unscored
```

Three MVP templates:
- **`rust-cli-mcp`** — dogfood + CI target (`forgeplan` core repo). Detection: `crates/` + `rmcp` manifest dependency. (`.forgeplan/` was deliberately *removed* from this template's scoring signals during P3 review — the playbook's own precondition already requires it on every run, so scoring it too made every repo the pipeline can run on score >= 0.40, making the `generic` floor below unreachable. It still triggers the separate, unscored `z.decisions` append.)
- **`web-fullstack`** — second dogfood target (`forgeplan-web`). Detection: `entities/` + `widgets/` + `pages/`.
- **`generic`** — the correctness floor. One zone per top-level directory (cap 8, ranked by file count, overflow collapses into `z.other`), plus the unconditional `z.decisions` zone in its own reserved row. Canvas grid is 4x3 (12 cells) specifically to hold up to 8 directory zones *and* `z.decisions` without a placement collision.

## Plugin layout

```
plugins/forgeplan-map-pack/
├── .claude-plugin/plugin.json
├── ARCHITECTURE.md            (this file)
├── README.md / README-RU.md
├── agents/                    8 agents, flat *.md files
├── skills/                    3 skills (zone-extractor, edge-verifier, map-emitter) — the
│                               algorithm knowledge their same-named agents invoke. TYPE/SELECT
│                               scorers stay inline in map-orchestrator, not separate skills.
├── compositions/               3 MVP templates (YAML data)
├── schemas/map.schema.json     structural JSON Schema — the shared contract
├── scripts/map-guardian.mjs    the deterministic gate
├── fixtures/checkpoint-map.json vendored smoke-test oracle (from forgeplan-web)
├── hooks/                      hooks.json + the PreToolUse gate + its shared lib
├── playbooks/map-build.yaml    the orchestrated flow as a forgeplan playbook
└── mappings/discover-to-map.yaml  Phase-2 stub only (bridge to forgeplan-brownfield-pack)
```

## Out of scope for this plugin (P1)

Onboarding tour (`/onboard`), map-grounded chat, template blending, the local refresh daemon, and the full ~16-composition library are all later phases (P2/P3/P5) that live in `forgeplan-web`, not here. See PRD-075 for the full non-goals list.
