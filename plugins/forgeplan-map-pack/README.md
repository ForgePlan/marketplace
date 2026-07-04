[English](README.md) | [Русский](README-RU.md)

# forgeplan-map-pack

> Scan any forgeplan-enabled repo through an 8-agent orchestrated pipeline and emit one validated `.forgeplan/map/map.json` — the data forgeplan-web's composed-map view renders as an interactive, zoned understanding-map of your project.

A Claude Code marketplace pack that closes the gap between forgeplan-web's already-shipped composed-map renderer (P0) and real project data: no scanner existed before this pack, so the renderer had only ever drawn a hand-authored fixture. This pack is the generation half — a fully orchestrated, deterministically-gated pipeline, not a thin script.

> [!WARNING]
> Requires `forgeplan` CLI v0.25+ (playbook runtime + read-only `forgeplan_graph`/`list`/`get` MCP surfaces). Scanning is **local headless invocation only** — `forgeplan-web`'s server structurally cannot spawn `claude` (it only shells the `forgeplan` binary, and only for read-only subcommands), so there is no "run analysis" button in the web UI. You run `/map-build` (or the equivalent headless `claude -p` invocation) yourself, in the target repo.

## Quick Start

```bash
/plugin install forgeplan-map-pack@ForgePlan-marketplace
/reload-plugins
```

Then, in any `forgeplan`-enabled repo:

```bash
claude -p '/map-build' --add-dir <repo> --allowedTools Read Glob Grep Write Task
```

This scans the repo, classifies its project type, extracts a zone/node/edge graph, and writes `.forgeplan/map/map.json` as `status: "proposed"`. The deterministic guardian gate then either flips it to `"confirmed"` or reports exactly what's blocking that.

## What's inside

### 8 agents (`agents/`)

The full orchestrated pipeline — see [ARCHITECTURE.md](ARCHITECTURE.md) for the complete design. In one line each:

| Agent | Stage | Role |
|---|---|---|
| `map-orchestrator` | conductor | Dispatches every stage, enforces the 4 gates, writes nothing |
| `code-scanner` | SCAN | Source tree, manifests, entry points → its own scratch file |
| `forgeplan-scanner` | SCAN | The `.forgeplan/` artifact graph, read-only MCP → its own scratch file |
| `docs-scanner` | SCAN | README/docs → RU narration facts, real prose only, never invented |
| `zone-extractor` | EXTRACT | Merges the 3 scans into zones/nodes/mega-nodes, mints content-hash ids |
| `edge-verifier` | VERIFY | Classifies edges, grep-verifies code dependencies, drops what it can't verify |
| `map-emitter` | EMIT | The sole writer of `map.json`'s content, atomic write, `status: "proposed"` |
| `map-guardian` | VALIDATE | Runs the deterministic gate script; its `exit 0` is the only path to `"confirmed"` |

### 3 skills (`skills/`)

The reusable algorithm knowledge behind the three highest-stakes agents — the exact id-derivation formula, the zone-binning + mega-node-collapse rules, the edge trust-classification + argv-safe grep discipline. Invoked by their same-named agents; not general-purpose tools.

### 3 composition templates (`compositions/`)

Data, not code — how a scanned project maps to zones. `rust-cli-mcp` and `web-fullstack` are hand-tuned dogfood targets; `generic` is the correctness floor that always renders *something*, even on a repo the other two don't recognize.

### The contract (`schemas/map.schema.json`)

The structural JSON Schema every `map.json` must satisfy — the shared reference for the emitter, the guardian, and forgeplan-web's own client-side validator.

### The gate (`scripts/map-guardian.mjs`)

A deterministic, dependency-free Node script — never an LLM call. Six checks plus two cross-source checks, re-derived independently from the emitted document and the real repo state. Only its `exit 0` flips a map to `"confirmed"`.

### The write-path hook (`hooks/`)

A fail-closed PreToolUse gate: no agent in this pack can write anywhere under `.forgeplan/` except `map/map.json` and `map/.work/**`, no matter what any agent's prompt is talked into. This is one of three independent, layered controls — see ARCHITECTURE.md's "EMITTER-safe" section for why a denylist alone isn't enough.

## Design principles

- **Orchestrated, not autonomous-in-one-context.** Every stage runs in its own isolated context — the same generator-never-verifies-itself discipline this marketplace uses for BMAD/SPARC/TDD.
- **Deterministic by construction.** Content-hash node ids, no node ever carries `x`/`y`, a pure layout function owns geometry. A re-run adds nodes without reshuffling the ones that already exist.
- **The map is derived, not authored.** It's gitignored like `lance/` — delete it, re-run, get the same thing back (modulo real repo changes). No forgeplan artifact is ever mutated by this pack; the write-path controls make that structurally, not just conventionally, true.
- **Gated, honestly.** Every guarantee this pack makes is either a deterministic check that actually runs, or explicitly labeled as convention-enforced rather than structurally enforced. Nothing is claimed that isn't backed by a real check.

## Related forgeplan artifacts

`EPIC-004` → `PRD-075` → `SPEC-003` (the contract) → `RFC-023` (the architecture) → `ADR-016` + `ADR-017` (the two frozen build decisions). All active in this workspace's `.forgeplan/`.
