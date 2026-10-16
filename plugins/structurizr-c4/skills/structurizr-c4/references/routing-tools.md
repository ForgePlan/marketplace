# Reproducible geometry repair

Use these tools when a rendered view has collisions. They do not inspect a repository or decide the C4 boundary. Keep already clean views unchanged unless another requirement calls for a change.

## Capture and measure

Use the native Structurizr SVG export or an approved browser's DOM inspection. Do not access private application state. Read actual rendered nodes, routes and label sizes; model defaults cannot predict wrapping reliably.

`extract_native_svg.py WORKSPACE_JSON VIEW_SVG --view VIEW_KEY -o SNAPSHOT_JSON` maps a native SVG to one workspace view. It verifies expected elements/relationships, handles repeated dynamic relationship IDs with their `order`, and excludes deployment group boundaries from solid obstacles. Unmatched elements/relations, malformed paths and unsupported transforms fail explicitly. Native box/person/cylinder bounds are supported; arbitrary SVG art is outside this parser's contract. Curves use 32 samples; straight segments use rectangle intersection checks.

The snapshot contains model-unit node bounds, measured endpoint ports, complete labels and label rectangles. A node's `elementX`/`elementY` are its layout origin; `x`/`y` are the measured obstacle bounding box. These can differ, for example when a shape has local offsets. Preserve the origin-to-bounds offset when moving a node; never write a bounding-box origin directly as its layout position.

Preserve `originalId`, dynamic `order` and the verified view index when applying a patch. Validate candidate endpoints against the captured ports and their source/destination nodes. A dynamic response can follow the original model relationship in reverse: use the occurrence's verified direction, not an unconditional assumption that every route follows the original relationship direction. Never treat a missing view, unmatched endpoint or failed export as a clean result.

For several native exports, render the selected SVGs once and observe the prepared download links in the export UI. If the approved browser exposes a `downloadMedia` API for those links, use it to save each observed URL and confirm the resulting file. Do not rely on a `waitForEvent("download")` plus click loop for a batch: browser multiple-download policies can leave that wait hanging. Use only download mechanisms permitted by the active browser and host policy; do not bypass a blocked download or switch to an unapproved transport. If the permitted mechanism is unavailable, report the limitation or use approved read-only DOM geometry; do not claim an export was saved without a file.

## Route and apply

Resolve `scripts_root` to this installed skill's `scripts` directory:

```sh
python3 "$scripts_root/route.py" snapshot.json -o candidate.json
python3 "$scripts_root/apply_layout.py" workspace.json snapshot.json candidate.json
python3 "$scripts_root/apply_layout.py" workspace.json snapshot.json candidate.json --write --backup ../layout-history/before-view.json
```

The first apply command is a dry run. `--output new-workspace.json` creates a separate candidate. `--write` makes a backup and atomically replaces the JSON. Choose a backup outside attached documentation. Remove `autoLayout` from the matching DSL view before accepting manual geometry; the applier removes `automaticLayout` in JSON but does not rewrite DSL.

`route.py` uses obstacle-aware rectilinear routing, shared-segment costs, final label refinement and optional outside channels. It preserves every relation and measured port, reports moved overlapping nodes, reduced clearance and unresolved constraints. Compare a few lane spacing values on a dense view rather than enforcing one preset. Outside channels can enlarge the canvas; use them only when readable after native review. Short common-port stubs and ordinary line crossings can remain.

`apply_layout.py` verifies IDs, counts, dynamic order, unchanged semantic model and unchanged unrelated views. It rounds coordinates, moves negative geometry into positive canvas space with one common offset, and expands dimensions to include routes and labels. Inspect the report; never apply a candidate with unresolved hard conflicts merely because the command succeeded.

## Accept the actual render

Fully reload the viewer after file edits. Switching only the URL hash can select another view in the old in-memory workspace. Recheck every changed view and the clean views included in the delivery; compare node/relation counts with the captured model. Use `check-routing.js` on the native DOM plus visual inspection of routes, arrows, grouping and clipping.

Solver reports are predictions, not native-render results. Fix discrepancies, save/reload and recheck. Final static/JSON export must use `architecture.py export ... --use-layout`; open the static result and repeat checks. Verify the exported model and view geometry match the accepted JSON, allowing documented exporter metadata differences. Mermaid/PlantUML are supplementary representations, not routing proof.

Record before/after findings, actual checked view keys, tool version, source/layout hashes, backups and limits in the project. Keep customer snapshots, SVGs, models and reports out of the plugin payload.

The plugin's 38 synthetic tests run with `bash tests/test-routing.sh`: 17 parser contracts and 21 router/applier checks. They cover obstacle avoidance, shared routes, final label checks, exact IDs/order, endpoint validation, backup behavior, incomplete SVGs and unchanged semantic models. A unit test pass does not replace the native render checks.
