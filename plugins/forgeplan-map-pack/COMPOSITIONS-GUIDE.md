# Composition authoring guide — the abstract-archetype contract

A composition is **data, not code**: it describes how a project of a given
**application TYPE** turns into a zoned map. The rule that governs this whole
directory:

> **A composition is keyed to an application ARCHETYPE, never to a specific
> project.** `web-fullstack` is "the fullstack-web archetype", not "the map for
> forgeplan-web". `cli-tool` is "the CLI archetype", not "forgeplan-core". This
> mirrors the *unreasonable-effectiveness-of-HTML* gallery: one tuned treatment
> per **type** of thing, reused across every instance of that type.

Anything project-specific — a repo's own directory prefix (`template/src/`), a
vendored fixture path, a product name — is a **detection/scanner** concern, not
a composition identity. Compositions stay abstract; the depth-agnostic scanner
(`agents/code-scanner.md` `source_root` discovery + `**/`-globbed hints) is what
adapts an abstract archetype to a concretely-nested repo.

## The mental model (from the reference maps)

- **Zone = a tier / layer** of the system (surfaces, core, storage, decisions).
  4–6 zones is the comfortable range; a zone with >8 nodes collapses to a
  mega-node (zone-extractor Algorithm 5).
- **Node = a component** in a tier, carrying a `kind`.
- **Flows are the headline.** 2–4 named end-to-end paths per archetype, rendered
  as chips (click → dim all, light the path). An archetype with no flows renders
  a dead chip bar — always ship `flow_hints`.
- **2D, not a ribbon.** Lay zones across a grid (`grid.cols ≥ 2`), never a single
  tall column.

## Fixed shared constants (verbatim in EVERY composition — never drift)

```yaml
arrangement: "stack-ttb"          # schema-pinned single enum value in P1
canvas:
  gap: { x: 88, y: 70 }
  margin: 40
  cell:
    card_w: 190
    card_h: 60
    card_gap: 36
    zpad: { top: 50, side: 24, bottom: 24 }
```

`canvas.grid` and `placements` are the ONLY per-archetype canvas fields — pick a
2D grid that fits the zone count (4 zones → `{cols:2, rows:2}`; 6 zones →
`{cols:3, rows:2}`).

## The 7 accent tokens → zone-kind convention

`zone.accent` MUST be one of exactly these 7 full tokens (never a hex, never a
bare name — the web validator's Rule 15). Use this semantic mapping so accents
read consistently across archetypes:

| Token | Zone role (`kind`) |
|---|---|
| `--map-accent-cyan` | entry / surfaces / routes / API (`kind: surface`) |
| `--map-accent-emerald` | core / domain / the write path (`kind: core`) |
| `--map-accent-violet` | intelligence / logic / compute (`kind: core` or `component`) |
| `--map-accent-amber` | orchestration / config / control (`kind: component`) |
| `--map-accent-rose` | UI / components / presentation (`kind: component`) |
| `--map-accent-orange` | external / integrations / third-party (`kind: ext`) |
| `--map-accent-slate` | decision trail (`kind: truth`) — always `z.decisions` |

## Pinned literals (every zone, P1)

`treatment: "neutral-dashed"`, `rule_edge: "off"`, `layout_rule: "grid"`,
`overflow: "grow"`, `capacity: null`. Every zone's **`cols` is pinned** (a small
integer, typically `2`; `z.decisions` uses `4`) — NEVER derived from node count
(append-stability; zone-extractor Algorithm 4).

## The unconditional `z.decisions` zone

Every archetype ends with the same decision-trail zone (the orchestrator appends
it whenever `.forgeplan/` is present, and it is identical across archetypes):

```yaml
- id: "z.decisions"
  label: "Decision Trail"
  sub: "PRD · RFC · ADR · EVID · EPIC"
  kind: "truth"
  accent: "--map-accent-slate"
  treatment: "neutral-dashed"
  rule_edge: "off"
  layout_rule: "grid"
  cols: 4
  capacity: null
  overflow: "grow"
```

with the matching hint `{ zone: "z.decisions", source: "fpl.artifacts", pattern: "**" }`.

## `zone_hints` — depth-agnostic, abstract signals

Each hint is `{ zone, source, pattern[, note] }`. `source` ∈ `code.entrypoints`,
`code.modules`, `fpl.artifacts`. Patterns MUST be **depth-agnostic** — lead with
`**/` (`**/entities/**`, `**/routes/**`) so they match the layer at the repo
root OR under any nested app root. A module matching no hint falls back to
`default_node_home` (never dropped). Use generic layer names (`routes`, `api`,
`services`, `models`, `components`, `handlers`, `lib`, `store`), NOT a specific
repo's folders.

## `detection` — abstract type signals

`detection: { strong[], weak[], negative[] }`. Each signal is
`{ signal, type: "dir_exists_any_depth", path[, alt_path] }`. Score =
Σstrong·0.40 + Σweak·0.15 − Σnegative·0.50 (clamp 0..1); ≥0.70 & gap≥0.20 wins.
Signals are **generic layer directories** that characterize the TYPE
(`entities/`, `routes/`, `services/`, `models/`, `packages/`, `cmd/`), matched at
any depth. Stack specifics (Rust, SvelteKit, a particular framework) belong in
`weak` signals that *boost* confidence — never as the archetype's identity.

## `flow_hints` — 2–4 per archetype

```yaml
flow_hints:
  - id: "f.<slug>"
    name: "Short chip"          # 2–3 words, EN, never a sentence
    path: ["z.a", "z.b", "z.c"] # zone-id sequence the emitter walks
    steps_ru: ["…RU шаг…", …]   # RU narration (SPEC-003 D5), copied verbatim
```

The emitter resolves each hint against the extracted graph (map-emitter skill
Algorithm 1b): representative `node_ids` per zone in path order, `edge_ids` from
connecting edges, `steps` from `steps_ru`. A hint whose path zones have no nodes
is skipped — never an empty flow. Always include one `Decision trail` flow over
`z.decisions`.

## `node.meta` vs `description_ru` (emitter, but authors should know)

`node.meta` is a SHORT card subline (≤~30 chars: basename or `kind · tag`). Full
prose → `node.description_ru`, shown in the detail panel (zone-extractor
Algorithm 7 / O-1). Compositions don't set node fields, but zone `sub` follows
the same "short" discipline.

## File skeleton

```
template: "<archetype>"
role: >- <one paragraph: what TYPE of system, abstractly>
detection: { strong[], weak[], negative[] }
arrangement: "stack-ttb"
canvas: { grid, gap, margin, cell }        # shared constants + a 2D grid
composition: { template, arrangement, entry_zone, placements[], zone_connectors[] }
default_node_home: { zone, note }
zones: [ …3–5 archetype zones…, z.decisions ]
zone_hints: [ …depth-agnostic patterns…, z.decisions catch-all ]
flow_hints: [ …2–4 flows incl. a decision-trail flow… ]
```

## Two axes: base TYPE + pattern OVERLAY (the composition model)

Real repos are hybrids — a monorepo can hold a frontend, a backend, several
microservices, and serverless functions at once. So a composition is not one
flat label; it is **a base archetype + zero-or-more pattern overlays**, composed
into a single map. Keep the two axes separate:

- **Base archetype = what the project IS (its TYPE).** Determines the base zone
  skeleton. Exactly ONE base is chosen (the highest-scoring type).
- **Overlay = how it's STRUCTURED (an architectural PATTERN).** Detected
  independently; **several can be active at once**; each ADDS or SPLITS zones on
  top of the base.
- **Domain (fintech, copywriting, devops, PM) is NOT an axis** — it doesn't
  change the map structure, so it never becomes a composition (a copywriting SaaS
  and a task-tracker are both `web-fullstack`). Domain is at most a light label.

### Base archetypes (~12 + generic)

| Group | Base types |
|---|---|
| Client / UI | `web-frontend`, `mobile-app`, `desktop-app` |
| Backend / fullstack | `web-fullstack`, `backend-api` |
| CLI / libraries | `cli-tool`, `library-sdk` |
| Data / ML / AI | `data-pipeline`, `ml-project`, `ai-agent` |
| Content | `cms`, `docs-site` |
| Floor | `generic` (one zone per top-level dir, cap 8 — always renders something) |

### Pattern overlays (~6)

Each overlay is its own file under `compositions/overlays/` with a restricted
shape — it may only `adds_zones`, `splits_zone`, `adds_zone_hints`,
`adds_flow_hints`, plus its own `detection`:

| Overlay | What it adds/splits |
|---|---|
| `monorepo` | regroups nodes by `packages/*` / `apps/*`; adds no tier |
| `microservices` | adds a Services zone + a Gateway node; a "service call" flow |
| `serverless` | adds a Functions zone (handlers/lambdas) + a trigger flow |
| `cqrs-eventsourcing` | splits the core zone into Command / Query (+ event store) |
| `mcp-server` | adds a Tools/MCP surface zone |
| `api-gateway` | adds a Gateway/edge zone in front of surfaces |

`monolith` = simply "no overlays active" — no file needed.

### How they compose (engine)

1. **TYPE** picks the single highest-scoring base archetype (unchanged).
2. **TYPE** also runs each overlay's `detection` independently → the set of
   ACTIVE overlays (0..n).
3. **EMIT** starts from the base zones/hints/flows, then applies each active
   overlay in a deterministic order (adds/splits/regroups), pins every `cols`,
   and lays zones out by **tier rows** (entry row → core row → data row →
   decisions row) so a variable zone count still forms a clean 2D grid.

Example — a monorepo with a frontend, a backend, and microservices:
`base=web-fullstack`, `overlays=[monorepo, microservices]` → one map with
Surfaces / Core / UI (base) + Services + Gateway (microservices overlay) +
grouped by `packages/*` (monorepo overlay) + Decisions.

When two BASE types genuinely tie on a real repo, the scorer's gap band marks the
map `NEEDS_CONFIRM` (expected, not a bug — RFC-023 §5). Overlays never tie —
they are independently present-or-absent, not scored against each other.

> The overlay ENGINE (multi-detect in TYPE, compose-in EMIT, tier-row layout)
> brings RFC-023's deferred "blend mode" forward from Phase 2. It is tracked as
> an RFC-023 amendment; base archetypes and overlays are built against this guide
> once the engine lands.
