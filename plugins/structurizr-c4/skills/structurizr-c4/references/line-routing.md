# Line routing and readability

Use for every affected view. Lines must avoid unrelated nodes. Labels must not cover nodes, each other or unrelated lines. Direction and arrowheads remain visible. Minimize line crossings: arbitrary dense/non-planar graphs cannot be promised zero crossings.

## Controls

- `autoLayout tb 450 250` sets direction, rank separation and node separation. These values are a starting example, not a universal preset. Compare `lr`/`tb` for the actual graph and judge readability as well as geometry. A huge canvas can remain inconvenient.
- `routing Orthogonal` selects shape; it does not guarantee obstacle avoidance or room for labels. Check Direct/Curved after rendering too. A style switch alone is not a verified fix.
- Short meaningful labels and focused ingestion/query/evaluation views can beat excessive spacing. Preserve details in descriptions/evidence. Do not delete real dependencies for aesthetics: state thematic views' scope.
- Keep C4 levels consistent. A system landscape and a container's internals answer different questions.

## Edit and persist

1. Back up DSL/JSON outside any `!docs` directory. Preserve explicit view keys and identifiers. Name deployment instances too, e.g. `apiinstance = containerInstance api`: anonymous instances were observed to receive new UUIDs in `structurizr.dsl.identifier` on repeated parsing in 2026.09.19. When adding identifiers to an existing model, retain JSON and check coordinate mapping during migration.
2. Remove `autoLayout` from the selected view before manual editing; otherwise it locks editing. Open **Edit diagram**. If useful, invoke the editor's Auto-layout once to seed positions.
3. Leave corridors between groups, separate reciprocal links, and adjust nodes, vertices and labels along their own paths. Clicking a line adds a vertex. The editor documents Up/Down for a highlighted relation's label, but outside that state keys can switch views; observe results instead of sending keys blindly.
4. Use **Save workspace** before leaving. Confirm actual coordinates/vertices in `workspace.json`. Targeted local JSON editing is possible using verified IDs/view keys: `elements[].x/y`, `relationships[].vertices`, `position` (percentage along the path), and `routing`. Do not invent equivalent DSL fields. Do not edit JSON concurrently with an unsaved viewer editor.
5. Reload and recheck. In 2026.09.19, transient one-shot layout was observed to differ from the next render of saved vertices and global routing. Confirm per-relation routing/label positions after reopening; do not assign one routing mode to every view without checking.
6. Keep **DSL plus JSON**. DSL holds model/views; JSON also holds final geometry. After DSL changes, update/save the viewer. Do not discard JSON as disposable generated data. A changed graph requires another review.
7. Final static/JSON export uses `architecture.py export <directory> --format static --use-layout`. Ordinary DSL export loses manual geometry. Mermaid/PlantUML translate to other renderers and do not preserve routes pixel for pixel.

## Check every affected view

Execute `scripts/check-routing.js` in full through approved read-only DOM evaluation on the native viewer or static export. It is an IIFE: evaluate it as an expression, not a function body. It reads rendered SVG only, without private application state or page mutations.

It reports overlapping blocks, lines within unrelated blocks, labels on blocks, overlapping labels and lines crossing other labels. Fix each finding or record a specific justified exception. Empty/unsupported rendering must fail rather than report zero problems. Record view key, viewport, tool version and DSL/JSON hashes in review or a routing report.

The checker is approximate: it samples M/L/C paths and uses screen bounding boxes. Group boundaries, arrowheads, coincident segments, contrast, clipping and comfort still need visual inspection. Tiny fit-to-page views reduce sensitivity; inspect overview and reading-scale detail. Unsupported commands/transforms require a stated limit or another method. Views without links must match the model.

Once fixed: **save → reload → rescan and visually inspect → export with layout → open the export**. Review other renderers separately. Parser success and a zero-hit approximate scan are distinct observations, neither production acceptance nor a mathematical guarantee.

## Geometry strategy

For repeatable repair rather than one-off JSON edits, use [routing-tools.md](routing-tools.md). It documents the bundled native SVG parser, router and safe applier, including dynamic relation mapping, positive canvas bounds and full reload/export checks.

Start with orientation, scope and spacing. If routes hit obstacles, use deliberate manual corridors and individual label positions, retaining real relationships. Verify generated routes after rendering: native ports, vertices, curves and labels may differ from a layout engine's interpretation. Prefer the smallest change that solves the finding. If still dense, add a clearly scoped supplementary view while retaining the comprehensive model.

Keep baseline/candidate layouts and observed before/after findings. Do not turn improvement in one graph into mandatory orientation/spacing for all systems.

## Official sources

- [DSL autoLayout and styles](https://docs.structurizr.com/dsl/language)
- [Automatic layout](https://docs.structurizr.com/ui/diagrams/automatic-layout)
- [Manual layout and identifiers](https://docs.structurizr.com/ui/diagrams/manual-layout)
- [Editor vertices/routing/labels](https://docs.structurizr.com/ui/diagrams/editor)
