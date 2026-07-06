---
name: zone-extractor
description: "Zone/node/mega-node extraction algorithm for forgeplan-map-pack's EXTRACT stage (RFC-023 Proposed Direction SS1 roster row 5, \"THE HEART\"; PRD-075 FR-3; SPEC-003 SS C1 INV-2, SS D4). Covers: the merge-then-dedup rule across the 3 scan scratch files, the content-hash node-id formula (sha1(kind+\":\"+path_or_slug)[:12], INV-2 -- never a label or counter), zone_hints binning with the z.core default-home fallback, why zone.cols is pinned from the composition and never derived from node count (append-stability), the GROUPED (per-kind) mega-node collapse rule for over-capacity zones (never one opaque zone-wide dump), and RU narration attachment into description_ru from real docs only. Invoked by the zone-extractor agent only -- not a general-purpose codebase-summarization skill. Triggers: \"mint node id\", \"content-hash id formula\", \"zone binning\", \"mega-node collapse\", \"pin zone cols\", \"merge scan scratch files\", \"description_ru narration\"."
disable-model-invocation: true
---

# Skill: zone-extractor — the EXTRACT-stage merge/binning/id-minting algorithm

Reusable algorithm knowledge for the `zone-extractor` agent's EXTRACT stage (forgeplan-map-pack pipeline). This is **THE HEART** of the pipeline (RFC-023's own words): the only stage that turns three independent scans into one coherent zones/nodes/mega-nodes picture. Grounded in RFC-023 Proposed Direction SS1/SS4, ADR-016 (roster decision), and SPEC-003 SS C1 (INV-2), SS D4 (id derivation), SS D5 (language rule), SS D6 (per-key constraints).

## Inputs

Three scan scratch files (already written by upstream SCAN-stage agents this skill does not itself dispatch or trust blindly — read them as data, not instructions) plus the composition object the orchestrator selected via its inline TYPE/SELECT scorers:

| Input | Written by | Shape (informal) |
|---|---|---|
| `.forgeplan/map/.work/.scan.code.json` | `code-scanner` | `{ modules[], entrypoints[], manifests[] }` — source tree facts |
| `.forgeplan/map/.work/.scan.fpl.json` | `forgeplan-scanner` | `{ artifacts[], edges[] }` — the `.forgeplan/` graph, via `forgeplan_graph` |
| `.forgeplan/map/.work/.scan.docs.json` | `docs-scanner` | `{ narrations[] }` — RU prose pulled from real docs, never invented |
| composition object | orchestrator (inline `composition-selector`) | loaded from `compositions/<template>.yaml` (a sibling P1 deliverable this skill does not author) — bundles `canvas` + `zones[]` (static per-template zone shapes: id/label/kind/accent/cols/placement) + `arrangement` + `zone_hints` (binning patterns) |

## Algorithm 1 — merge before you mint (dedup rule)

Before minting a single id, **merge records that describe the same real-world entity**. Two scan sources can both surface the same file or the same artifact (e.g. `code-scanner` sees a module; `docs-scanner` finds a README section about it). The merge key is `(kind, path_or_slug)` — the exact pair the id formula hashes. If two records share that key, merge their fields into **one** node object (union the data, prefer the more specific `provenance`) before computing the id. Minting two separate ids for the same `(kind, path_or_slug)` is impossible by construction (the hash is deterministic) — but minting the SAME id twice from two un-merged records is not, and that is exactly what trips gate G2's "no duplicate ids" condition. Dedup first, hash second.

## Algorithm 2 — content-hash node ids (INV-2)

```
node.id = sha1(kind + ":" + path_or_slug)[:12]
```

- `kind` — the node's type string (e.g. `"gate"`, `"component"`, `"store"`, or a forgeplan artifact kind like `"adr"`/`"prd"`).
- `path_or_slug` — for a code-derived node, the repo-relative file path (from `.scan.code.json`); for a forgeplan-artifact-derived node, the artifact ID (e.g. `"ADR-003"`, from `.scan.fpl.json`).
- Result — 12 lowercase hex characters, truncated from a full SHA-1 hex digest.

**Never** derive the id from `label` (display name) or from a counter/array index — either breaks append-stability the instant the label is re-worded or the array is re-ordered. **Always** use the same `(kind, path_or_slug)` pair for the same real-world entity across runs so the id is byte-identical run to run (this is what `map-guardian.mjs` GC-6 later re-derives and checks, and what the whole `source_fingerprint` no-op-refresh guarantee depends on).

The 12-hex format is a **pipeline-run-only** convention — `schemas/map.schema.json` deliberately does NOT enforce a hex pattern on `node.id` (a hand-authored fixture with human-readable ids like `n.init` must still validate structurally). Format correctness on a real run is `map-guardian.mjs` GC-6's job, not a schema rule — but this agent should still mint it correctly the first time; do not rely on the guardian to catch a formula mistake three stages later.

## Algorithm 2a — `kind` is an ALTITUDE-INVARIANT identity property (CM-02)

`kind` is one of the two id inputs, so if `kind` for the **same real-world
entity** differs between the top map and a drilled-in layer, `sha1(kind:ref)`
differs, and the entity gets **two different ids at two altitudes** — the
v0.7.1 dogfood defect CM-02. When forgeplan-web's `deriveSubDocument` (or the
E5 auto-cascade) tries to carry a node from the top map into its zone's layer,
the mismatched id means it can't match/hide/expand the same node — the drill-down
silently shows a *different* graph than the card it opened from.

The root cause is classifying `kind` from **where the node landed this run**
(its `zone`, which legitimately changes by altitude — a node is in `z.ui` on the
top map, but a layer IS the inside of `z.ui`, so the node's sub-zone differs).
**Never derive `kind` from the current scope's zone binning.** Decouple the two:

- **`zone` is a PLACEMENT** — altitude-dependent, re-computed per scope from that
  scope's `zone_hints` (Algorithm 3). It is allowed to change between the top map
  and a layer.
- **`kind` is an IDENTITY** — a frozen, pure function of the entity itself
  `(source, path_or_slug)`, computed ONCE and applied **byte-identically at every
  altitude**. It must NOT change between the top map and a layer.

Freeze `kind` with this altitude-invariant classifier (a pure function of the
entity, never of the zone it's binned into this run):

| Entity | Frozen `kind` |
|---|---|
| forgeplan artifact (`.scan.fpl.json`) | its own artifact kind, lowercased — `adr`/`prd`/`rfc`/`evid`/`epic`/`note`/`spec`/`problem`/`solution`. Invariant by nature. |
| declared entry point (matches `.scan.code.json` `entrypoints[]`) | `entrypoint` |
| config file (`*.config.*`, `*.yaml`/`*.yml`/`*.toml`, `*rc`) | `config` |
| data/store (schema/migration/`*.sql`, a vector/db dir like `lance/`) | `store` |
| test file (`*.test.*`, `*.spec.*`, `__tests__/…`) | `test` |
| any other code module | `module` |
| a group mega (Algorithm 5) | `mega` (see GC-10 — `is_mega ⟺ kind==="mega"`) |

The exact taxonomy matters less than the discipline: **the classifier reads only
the entity, resolves ONCE, and both `/map-build` (top) and `/map-build-layer`
(scoped) call the SAME function** — so a node's id is byte-identical across
altitudes. This is precisely what `map-guardian.mjs` GC-6 re-derives (`sha1(kind:ref)`)
and what layer id-carry depends on; do not "sharpen" a node's kind just because a
scoped composition would bin it more specifically — that specificity belongs in
`zone`, never in `kind`.

## Algorithm 3 — zone binning (zone_hints + the z.core fallback)

Each scanned entity is bound to exactly one zone using the selected composition's `zone_hints` (pattern → zone-id matchers this skill consumes but does not author — they live in `compositions/<template>.yaml`). **Every node gets a home**: when no `zone_hint` matches, the node falls back to `z.core` (the composition's default zone) rather than being dropped. This is the correctness floor at the node level, mirroring the `generic` template's correctness floor at the composition level (SPEC-003 E3).

**Match patterns as globs, DEPTH-AGNOSTICALLY.** code-scanner reports each module `path` relative to the **repo root**, so on a nested app layout a module is `template/src/entities/user`, not `entities/user`. A `zone_hint` pattern with a leading `**/` (e.g. `**/entities/**`) therefore matches the layer at **any depth** — root-level `entities/user` AND nested `template/src/entities/user` and `packages/web/src/entities/user`. Honor the `**/` glob semantics literally: `**/entities/**` matches any path that contains an `entities/` path segment. A bare start-anchored pattern (`entities/**`) matches ONLY the root-level case — that was the v0.2.0 dogfood miss on forgeplan-web (all its FSD layers live under `template/src/`, so every start-anchored hint fell through to the `z.core` default and no node landed in `z.ui`). The v0.4.0 web-fullstack composition ships the `**/`-prefixed forms; apply them as written.

`node.zone` MUST be one of the ids present in the composition's `zones[]` — an unbound or misspelled zone reference is a G2 / GC-2c failure downstream. Do not invent a zone id that isn't in the composition.

## Algorithm 4 — pinned `zone.cols` (never derived from node count)

`zone.cols` is **read from the composition's static zone definition and written through unchanged** — it is never computed from `zone.nodes.length`, never `Math.ceil(n / 3)`, never anything derived from how many nodes actually landed in the zone this run. This is deliberate: a zone that goes from 3 nodes to 5 nodes on the next scan must not silently reflow its column count and shove every node to a new grid position — that would break append-stability (SPEC-003 D1 references this as "PINNED — MUST be present + non-null; NEVER `ceil(n/3)`. Append-stability by construction"). If the composition's zone definition for a given zone id is missing `cols`, that is an upstream compositions-authoring defect, not something this agent may paper over by computing a substitute value — surface it and let gate G2 fail cleanly (`zones[i].cols missing or < 1`) rather than silently inventing a number.

## Algorithm 5 — GROUPED mega-collapse for over-capacity zones (E1a)

When a zone has more members than fits comfortably, **do NOT collapse the whole
zone into one opaque mega** — that is the "artifact dump" the understanding-map
brief calls out (the decision-trail zone on ForgePlanWeb collapsed **170
artifacts into a single unreadable card**). Instead, collapse by a **group key**
so the zone shows a small handful of legible group cards.

**Threshold.** Collapse a zone only when its member count exceeds the zone's own
`capacity` (from the composition), or **8** when `capacity` is null. A zone at or
under the threshold stays flat (real nodes, no mega).

**Group key.** When over threshold, partition the zone's members and emit ONE
mega per group with ≥2 members (a single-member group stays a flat node — never
wrap one node in a mega):

- **Primary key = `kind`.** The decision-trail zone → one mega per artifact kind:
  `PRD (32)`, `RFC (18)`, `ADR (12)`, `EVID (95)`, `EPIC (4)`, `NOTE (9)` — a
  readable ~6-card summary instead of one 170-node blob.
- **Secondary split for uniform-kind zones.** If all members share one `kind` (a
  code zone of `component`s) and the single kind-group still exceeds the
  threshold, sub-split that group by the **top path segment** under the zone
  (e.g. `entities/user`, `entities/map` → `user (…)`, `map (…)`). If even that
  doesn't split it, leave the one large group mega — the raw members live one
  level down once E3 (generated per-zone layers) ships.
- **Monorepo overlay override.** If the composed composition carries a
  `regroup: { by: "package" }` signal (the `monorepo` pattern overlay is active),
  the group key for CODE zones becomes the node's **top-level package segment**
  (`packages/<pkg>/…` or `apps/<pkg>/…` → `<pkg>`) instead of `kind`, so a big
  monorepo reads as `web (12) · api (8) · shared (20)` cards. The decision zone
  (forgeplan artifacts, no package) still groups by kind. Nodes keep their real
  paths; only the mega grouping key changes.

**Each group mega:**

```jsonc
{
  "id": "a1b2c3d4e5f6",             // sha1("mega:" + zoneId + ":" + groupKey)[:12]
                                     // -- a normal 12-hex content-hash id, UNIQUE
                                     // per group (zoneId+groupKey), so multiple
                                     // megas in one zone never collide (GC-2
                                     // duplicate-id). NOT a "mn_<slug>" placeholder.
  "label": "EVID (95)",             // "<Group label> (<N>)" -- legible, counted
  "kind": "mega",
  "zone": "<same zone id>",
  "found_at": "<extraction timestamp, ISO 8601>",
  "is_mega": true,
  "children": ["<id 1>", "<id 2>", "..."],   // the group's members only
  "collapsed": true
}
```

Rules:

- **Group by kind first; one mega per multi-member group; singletons stay flat.**
  The old "one mega for the whole zone past 8" rule is replaced by this.
- The original member nodes are **not removed** from `nodes[]` — they stay, each
  with its own real `zone`/`id`/`provenance`. Each group mega's `children`
  reference only that group's members; `map-guardian.mjs` GC-3 checks every
  `children` id resolves to a real node and that there is no nesting cycle
  (multiple megas per zone is fine — GC-3 validates each independently).
- G2 requires every node — including each group mega — to carry a valid id, a
  `zone`, and a `provenance`. Give a group mega a synthetic-but-honest
  provenance, e.g. `{ "source": "zone-extractor", "ref": "<zone-id> · <groupKey> group (N members)", "confidence": 1.0 }`.
- Mint each group mega's `id` as `sha1("mega:" + zoneId + ":" + groupKey)[:12]`
  (`kind="mega"`). Stable run-to-run as long as the zone id and group key don't
  change (append-stability: adding an EVID grows the `EVID (N)` mega's child list
  and its label count, but its id — keyed on zone+kind — stays byte-identical).

## Algorithm 6 — rich `description_ru` from grounded understanding (E1c)

This is the **understanding-map lever**. The reference bar (`DETAIL` in
`understanding-map-ru.html`) gives every module a rich RU body like *"Единственный
путь мутации графа… своей логики нет"* — a 1–3 sentence explanation of **what the
module is, what's inside, and how it relates to its neighbours**. Bare paths
binned into generic zones (the "artifact dump") fall far short. Attach
`description_ru` from a GROUNDED source, in this priority:

1. **Zone `description_ru`** — take it from the **composition** (E1b: the archetype
   authors an abstract region description — "Входные двери приложения: маршруты,
   API и UI-оболочка"). This describes the region TYPE, not this repo's specifics,
   so it is authored, not scanned.
2. **Node `description_ru`** — synthesize a grounded 1–3 sentence RU explanation
   from REAL scanned material, in this order of preference:
   a. `.scan.docs.json` `narrations[]` — a real docs match for this module (README
      prose, a doc-comment paragraph). Prefer this; it's the author's own words.
   b. Else, `.scan.code.json` `modules[].facts` — the grounded facts the
      code-scanner recorded (top-comment, exported symbols, role). Turn them into a
      neutral RU explanation: what the module does + what it exposes + its place in
      the flow. Example facts `["role: entities/map FSD layer", "exports:
      computeComposedLayout", "top-comment: pure layout, no side effects"]` →
      *"Слой `entities/map`: чистая функция раскладки `computeComposedLayout` —
      берёт зоны/узлы, возвращает координаты, без побочных эффектов."* Keep EN code
      identifiers verbatim in `<code>`-style inline (§15).

**The hard rule (§23 narration): grounded or absent — NEVER fabricated from the
filename.** If a module has NO docs narration AND NO usable `facts` (no comment, no
readable exports), **omit `description_ru` entirely** — do not paraphrase the path
into pseudo-Russian, do not invent a plausible sentence. A missing description is
an honest, renderable state (the tour skips it); a fabricated one validates against
the schema but is a lie the schema can't catch — so this discipline lives here, not
in GC-1. Group megas (`EVID (95)`) carry a short factual `description_ru` too:
*"95 артефактов вида EVIDENCE — раскрой, чтобы увидеть по отдельности."*

Also set a **short structural `node.meta`** from the same facts (Algorithm 7):
`<zone-role> · <tech> · <count>` (e.g. `поверхность · clap · 76 команд`,
`entities/map · SPEC-006`), never a sentence.

`label`/`meta`/zone `sub` stay **English**, verbatim like the underlying code/source identifiers (crate names, file names, artifact titles) — do not translate those.

## Algorithm 7 — `node.meta` is a SHORT card subline, never a sentence

`node.meta` renders as the **subline on a ~190px card** (one line). It MUST be a short tag — a rule of thumb is **≤ ~30 characters**: a bare basename (`init.mjs`), a `kind · <count/tag>` summary (`surface · 76 commands`, `core · routing`, `store · lancedb`), or a one- or two-word role. It MUST NOT carry a full descriptive sentence. The first rendered real map put a 146-char sentence in `node.meta` (e.g. `"bin/commands/init.mjs — init subcommand: scaffolds .forgeplan-web/ from bundled dist image, ..."`) and **29 of 32 cards overflowed** their zone, up to 706px past the card (O-1). The full prose belongs in **`node.description_ru`** (Algorithm 6) — the renderer shows that in the detail panel, off the card. When you have a full sentence for an entity, split it: a terse EN tag → `meta`, the full RU narration (only if a real docs source exists) → `description_ru`. If no short tag is natural, prefer the path basename or `<kind> · <a one-word role>` over truncating a sentence.

## Output shape

Write exactly one file, `.forgeplan/map/.work/.extract.json`:

```jsonc
{
  "zones": [ /* from the composition, cols/accent/treatment/rule_edge/layout_rule pinned through unchanged */ ],
  "layers": [],           // NOT populated in P1 (SPEC-003 D6 — Phase 2 only); leave empty
  "nodes": [ /* merged, id-minted, zone-bound, mega-collapsed */ ],
  "megaNodes": [ /* the subset of nodes[] where is_mega === true, for the orchestrator's own bookkeeping convenience */ ]
}
```

`layers` stays empty in P1 — do not populate it, and do not set `node.layer` either (there is nothing yet for it to reference).

## Self-check before returning control (this IS gate G2's condition — catch it here)

Before handing back to the orchestrator, verify all four, and only claim success if all four hold:

1. Every node's `id` is well-formed (12-hex on a real pipeline run) and every node has a non-empty `zone` and a `provenance` object.
2. No two nodes share an `id`.
3. Every zone in the output has `cols` present and a positive integer (never null, never omitted).
4. Every `node.zone` refers to a zone id actually present in this extraction's `zones[]`.

If any of these fail and you cannot resolve it (e.g. the composition itself is missing `cols` for a zone), say so plainly in your handoff rather than silently emitting invalid data — the orchestrator's gate check exists to catch this, but a self-aware failure report is far cheaper than a blind G2 loop.

## Common pitfalls

| Pitfall | Correct behavior |
|---|---|
| Minting an id from `label` or an array index | Always `sha1(kind+":"+path_or_slug)[:12]` — label/index are display concerns, not identity |
| Re-classifying `kind` from the current scope's zone (so the same entity gets 2 ids across altitudes) | `kind` is frozen per entity, altitude-invariant (Algorithm 2a); only `zone` changes by altitude — the id must be byte-identical on the top map and in a layer (CM-02) |
| Computing `cols` from the actual node count | `cols` is read from the composition, written through unchanged, always |
| Leaving an over-capacity zone flat (no mega) | Check every zone's final member count; past the threshold (`capacity` or 8) collapse GROUPED — one mega per kind-group, singletons flat (Algorithm 5) |
| Collapsing a whole 170-node zone into ONE mega | The E1a dump bug — group by kind (PRD/RFC/ADR/EVID/…) so the zone shows a legible ~6-card summary, never a single opaque blob |
| Removing original nodes when creating a mega-node | Keep them in `nodes[]`; the mega-node's `children` references them, it doesn't replace them |
| Inventing `description_ru` from a label | Omit the field when `.scan.docs.json` has no real match — never fabricate narration |
| Writing extraction output to `map.json` | Extraction is scratch-only (`.work/.extract.json`); only `map-emitter` writes `map.json` content |
| Dropping a node that matched no `zone_hint` | Fall back to `z.core` — every node gets a home, none are silently discarded |
