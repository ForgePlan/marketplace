# Pattern overlays — the composition-with-overlays contract

A **base composition** (`compositions/*.yaml`) describes what a project IS (its
TYPE) and gives the base zone skeleton. A **pattern overlay** (this directory)
describes how an architectural PATTERN is STRUCTURED, and ADDS or SPLITS zones on
top of the base. Real repos are hybrids — a monorepo can hold a frontend, a
backend, microservices, and serverless functions at once — so a map = **one base
+ zero-or-more active overlays**, composed into a single document.

See `../../COMPOSITIONS-GUIDE.md` "Two axes: base TYPE + pattern OVERLAY" for the
model. This file is the overlay-file authoring contract.

## An overlay file may do exactly four things (+ its own detection)

```yaml
overlay: "<pattern-id>"            # e.g. microservices, serverless, cqrs, monorepo, mcp-server, api-gateway
role: >- <one line: which architectural pattern, abstractly>

# How TYPE detects this pattern is PRESENT (independent of the base score).
# Same shape as a base composition's detection; ACTIVE when its own score
# clears the overlay threshold (>=0.40). Overlays are NOT scored against each
# other or against the base — each is independently present-or-absent.
detection:
  strong: [ { signal, type: "dir_exists_any_depth", path } ]
  weak:   [ ... ]
  negative: [ ... ]

# 1. adds_zones -- new tier(s) this pattern introduces.
adds_zones:
  - { id, label, sub, kind, accent, cols, description_ru, tier }   # same zone shape as a base zone + a `tier` hint (see layout)

# 2. splits_zone -- divide a base zone into parts (e.g. cqrs: core -> command/query).
splits_zone:
  target: "z.core"
  into:
    - { id, label, sub, kind, accent, cols, description_ru, tier }

# 3. adds_zone_hints -- route matching modules into the added/split zones.
adds_zone_hints:
  - { zone, source, pattern }      # depth-agnostic `**/...` patterns, same as base hints

# 4. adds_flow_hints -- a named journey this pattern introduces.
adds_flow_hints:
  - { id, name, path: [zone-ids], steps_ru: [...] }

# (monorepo-only 5th op) regroup -- change the extractor's mega-collapse group
# key. `monorepo` adds/splits nothing; it just makes an over-capacity code zone
# group by top-level package instead of by kind (zone-extractor Algorithm 5).
regroup:
  by: "package"
```

## Rules

- **Abstract, not project-specific.** An overlay describes the PATTERN
  (`microservices`), never a repo. All the base-composition rules apply: the 7
  accent tokens, pinned `cols`, depth-agnostic `**/`-globbed hints, short EN
  `sub` + RU `description_ru`, short flow chip names.
- **Independent detection.** Each overlay's `detection` runs on its own at TYPE.
  Multiple overlays can be active simultaneously. `monolith` = no overlays active
  (no file needed).
- **Deterministic compose order.** The emitter applies active overlays in a
  fixed order (alphabetical by `overlay` id) so a hybrid produces a byte-stable
  map. `splits_zone` runs before `adds_zones`; a later overlay never un-does an
  earlier one's zones.
- **Tier-row layout.** Each added/split zone carries a `tier` hint
  (`entry` | `core` | `data` | `decisions`) instead of a fixed `cell`. The
  emitter lays zones out by tier ROW (entry row → core row → data row →
  decisions row), so a variable zone count still forms a clean 2D grid
  (COMPOSITIONS-GUIDE "How they compose").

## The overlay set (~6)

| Overlay | Adds / splits |
|---|---|
| `monorepo` | regroups nodes by `packages/*` / `apps/*`; adds no tier |
| `microservices` | adds a Services zone (core tier) + a Gateway zone (entry tier); a "Service call" flow |
| `serverless` | adds a Functions zone (core tier) + a trigger flow |
| `cqrs-eventsourcing` | splits the core zone into Command / Query (+ an event-store zone, data tier) |
| `mcp-server` | adds a Tools/MCP surface zone (entry tier) |
| `api-gateway` | adds a Gateway/edge zone (entry tier) in front of surfaces |
