---
name: map-build-layer
description: "Generate ONE zone's drill-down layer (a validated sub-map with its own zones/nodes/edges/flows) for an already-built .forgeplan/map/map.json, on demand and append-only, by dispatching the forgeplan-map-pack pipeline in SCOPED mode. Usage: /map-build-layer \"<zone-id>\" [repo-root]. Deeper: /map-build-layer \"<zone-id>/<subzone-id>\"."
---

# /map-build-layer — generate one zone's drill-down layer (E3/E4)

`/map-build` produces the **top-level** map. This command produces the
**generated layer for a single zone** (PRD-076 FR-4): a scoped SCAN→EXTRACT→
VERIFY→EMIT→VALIDATE pass restricted to that zone's subtree, emitting the zone's
own sub-map (its own `zones`/`nodes`/`edges`/`flows`/`description_ru`) — so
descending into the zone in forgeplan-web shows an emitter-**generated**
architecture map, not just the client-derived un-hiding of raw children.

Append-only and EMITTER-safe: same denylist + `map-emitter-gate.sh` + guardian
single-write controls as `/map-build` — it writes only the layer output, never
mutates a forgeplan artifact.

## What to do

1. **Parse the target.** `$ARGUMENTS` is `"<zone-id>" [repo-root]`. The zone id may
   be nested (`"z.core/z.entities"`) for deeper recursion — the last segment is
   the zone to build, the earlier segments are the ancestor layer path. Resolve
   the repo root as `/map-build` does (arg or cwd).

2. **Preconditions.** Confirm `<repoRoot>/.forgeplan/map/map.json` exists (the top
   map must be built first — if not, tell the user to run `/map-build` first) and
   that the named zone id is present in it (or in the named ancestor layer). If the
   zone doesn't exist, stop and name the valid zone ids.

3. **Dispatch the orchestrator in SCOPED mode** — one Task call:

   ```
   Task(subagent_type="forgeplan-map-pack:map-orchestrator",
        prompt="SCOPED LAYER build for zone '<zone-id>' of the repo at <repoRoot>. "
             + "Read the existing .forgeplan/map/map.json, take the target zone's member "
             + "nodes as the seed set, and run a SCOPED SCAN (restricted to those members' "
             + "real paths/subtree) -> EXTRACT -> VERIFY -> EMIT -> VALIDATE producing a "
             + "sub-map for THIS zone only: its own zones (the sub-regions inside it), nodes, "
             + "edges, flows, and description_ru, at the same E1/E2 quality bar as the top map. "
             + "Write it as the zone's layer (see the layer contract below), NOT into the top "
             + "map.json's node set. Enforce gates G1-G4 on the scoped scratch. Deeper recursion: "
             + "if the target was '<ancestor>/<zone>', seed from the ancestor layer, not the top map.")
   ```

4. **Layer output contract (coordinate with forgeplan-web).** The layer is written
   as a **sibling file**: `.forgeplan/map/layers/<zone-id>.json`, itself a valid
   `forgeplan.map/v1` document (same schema, same guardian checks). forgeplan-web's
   `deriveSubDocument` seam (RFC-031) fetches this generated layer on descend when
   it exists, and falls back to its client-derived un-hide when it doesn't — so the
   layer degrades gracefully and needs no web change to be safe, only a small seam
   change to be *rendered*. (This is the one cross-repo contract decision PRD-076
   FR-3 flags — inline `layers[]` vs sibling file; this command ships the sibling-
   file shape.) Nested layers write to `.forgeplan/map/layers/<ancestor>/<zone>.json`.

5. **Report:** which zone, how many sub-zones/nodes/flows the layer has, whether the
   guardian confirmed it, and the layer file path. If the zone is thin (few members),
   say so — a shallow zone may not warrant a rich layer.

## Notes

- **Local, headless-only** (same as `/map-build`). Headless: `claude -p '/map-build-layer "z.core"' --add-dir <repo> --allowedTools Read Glob Grep Write Task`.
- **The UI can surface this command.** On a zone with no generated layer yet,
  forgeplan-web can show a copy-command hint (like the empty-state that suggests
  `/map-build`); running this command + a poller refresh makes the layer appear.
- **Deterministic + append-only.** Content-hash ids, no x/y, recursively. Re-running
  on an unchanged zone is idempotent.
