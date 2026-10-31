# C4 model review

Use after modelling and before handoff. This semantic review supplements parsing using the [C4 checklist](https://c4model.com/diagrams/checklist), [view boundaries](https://c4model.com/diagrams) and [Structurizr DSL](https://docs.structurizr.com/dsl/language).

## Correct scope

| View | Boundary | Typical errors |
|---|---|---|
| C1 Context | One system among people/external systems | Internal DBs, handlers or classes; unexplained boundaries |
| C2 Container | Runtime apps and stores of one system | Docker pod mistaken for whole system; library promoted to process; omitted stores |
| C3 Component | One selected container | Unbounded internals of several containers; directory tree without responsibilities |
| C4 Code | One selected component | Service map relabelled Code; invented methods/classes; unhelpful detail |
| Dynamic | One scenario at consistent scale | Generic labels; lost ordering; unexplained sync/async; happy path presented as retry guarantee |
| Deployment | One named environment | Local compose presented as production; invented replicas/networks; missing instance mapping |

C3 can show neighboring containers/systems as dependencies while detailing only one container. Reuse identifiers across views of one state.

## Evidence

For meaningful nodes/relations, check stable ID, specific claim, status, repo/commit/path/line or document/version/section, and limits/conflicts in evidence.md.

- `identified`: direct evidence, without production acceptance claims.
- `inferred`: interpretation supported by named sources and reasoning.
- `proposed`: target requiring implementation or confirmation.
- `unknown`: missing/conflicting data with a concrete question.

A client config does not prove server availability. A queue does not prove durable delivery, retries, idempotency or exactly-once. JWT middleware does not prove end-to-end ACL. One backend does not prove another system's implementation. Keep these limits visible. Escalate unknowns blocking the system boundary while continuing independent work.

## Clarity

- Title states view type, system/container and current/target state.
- Nodes identify name, type, concise responsibility and relevant technology.
- Relations describe purpose, direction and known transport.
- Legend explains colors, shapes, styles and status without color alone.
- Text is not clipped; arrows are visible; scale is useful for reading.
- C1→C2→C3 zooms into the same elements, not unrelated models.
- Business layers are distinct from C4 levels; extra views answer stated questions.

## Technical and rendered checks

Initial tested version: **2026.09.19**. Set workspace scope explicitly to `softwaresystem` or `landscape`. Inspect defaults violations to `error`, including absent docs/ADRs; its exit can count findings. Attach real docs/evidence with `!docs`. Never fabricate ADRs or disable all inspections for a pass. A targeted `structurizr.inspection.model.softwaresystem.decisions info` on an affected system is acceptable for unavailable historical ADRs with a reason in review.

1. Run helper validate, inspect output and resolve/justify findings. Confirm installed command help instead of assuming legacy flags. Parsing does not prove architectural truth.
2. Open every affected view, including legend and long labels. A loaded page is not a visual review.
3. Follow [line-routing.md](line-routing.md): rendered scan plus reading-scale inspection, fixes, save, reload, rescan, layout-preserving export and opening that export. Minimize crossings without promising planar graphs. Zero approximate hits does not replace visual review.
4. Manual layout lives in workspace.json. Use `export --use-layout`; JSON older than DSL is refused. Update/save the viewer after DSL changes rather than bypassing the stale check.
5. Record version, source snapshot, commands/results, actual view keys inspected, fixes and remaining issues. If rendering/browser access is absent, say visual review did not run.

## Handoff

Deliver DSL, evidence, assumptions, review and actual export; include JSON after manual routing. Provide the viewing/updating command. Source changes require renewed evidence and affected views. DSL holds the model; JSON retains manual geometry; exports regenerate from both. Check local assets survive handoff and no credentials/token-bearing URLs are embedded. Do not upload to external services without a user request.
