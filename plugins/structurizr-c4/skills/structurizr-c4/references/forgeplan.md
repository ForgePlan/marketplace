# ForgePlan contract for C4 delivery

This reference is the **authoritative delivery specification** for C4 work inside ForgePlan projects. It is read by the producer (`structurizr-architect`), by the orchestration agents that dispatch it (`adr-architect`, `architecture` SPARC, `discover`), by the independent reviewers (`architect-reviewer`, `system-dev`), and by the methodology-check / guardian gates. Keep one source of truth: changes here apply everywhere. Do **not** duplicate this contract in agent prompts.

Legacy Mermaid C4 diagrams and inline C4 sketches remain historical sources. They are **not** an alternative delivery path for new or substantively re-reviewed C4 work. Unchanged active artifacts and past EVID remain untouched. General-purpose Mermaid flow/sequence and DDD context maps are outside this rule.

## Entrypoints

| Concern | Value |
|---|---|
| Portable skill | `structurizr-c4` |
| Claude Code / OMP commands | `/structurizr-c4:c4-build`, `/structurizr-c4:c4-review` |
| Claude Code producer | `structurizr-c4:structurizr-architect` |
| OMP producer | `structurizr-architect` (native task-agent name, no plugin prefix) |
| OMP portable skill | `/skill:structurizr-c4` or read `skill://structurizr-c4` |
| Codex portable skill | `$structurizr-c4` (discovered through `.agents/skills/structurizr-c4`) |
| Other agents | Read the installed `SKILL.md` and this reference, then use the client's native worker and file/CLI/browser tools. No Claude process or credentials are required. |
| Adapter files (thin) | `agents/structurizr-architect.md`, `commands/c4-build.md`, `commands/c4-review.md`, optional `adapters/codex/structurizr-architect.toml` |

Never use a skill name as an agent selector. Confirm the producer in the current runtime's actual agent catalog; command syntax and role registration are adapter-specific, not prerequisites for using the shared workflow. A client without dedicated role registration uses its native architecture-scoped worker.

`c4-review` is producer-side repair on the assigned workspace. It does not replace `architect-reviewer`, `system-dev`, or `guardian`, and it never asserts its own verdict. A reviewer is a different agent context.

## Producer role (Profile C-coder, architecture-scoped)

`structurizr-architect` is a **Profile C-coder restricted to architecture artefacts**:

- May read/write/edit: `workspace.dsl`, `workspace.json`, `evidence.md`, `assumptions.md`, `review.md`, files inside `exports/static/`, the navigation report under `docs/c4/<ARTIFACT-ID>.md`, and the declared `assumptions.md`/`review.md` siblings.
- Must **not** write: product source files, infrastructure as code, CI configuration or anything under `.forgeplan/`. The lifecycle helper may maintain its own local viewer process state; this does not authorize modifying client configuration.
- Must **not** invoke: `forgeplan_new`, `forgeplan_update`, `forgeplan_link`, `forgeplan_activate`, `forgeplan_claim`, `forgeplan_release`. Architecture decisions are the orchestrator's; the producer suggests evidence and trade-offs, it does not author or activate ADR/RFC/SPEC artefacts. Unknown boundaries escalate to the ADR/RFC author, never to "do whatever fits".

The Claude Code adapter declares the existing `agents-core` C-coder ForgePlan/Hindsight denylist without denying Write/Edit. That frontmatter is not a universal permission API: other clients must apply their native permission controls where supported and must not claim that an unsupported denylist is enforced. The architecture-only scope above applies in every runtime. Model binding belongs to the runtime adapter, not this portable contract; Claude aliases must not become another client's provider requirement.

## Job input (no new wire/schema)

Inputs are prompt fields, **not** new schema fields or ForgePlan-core changes:

| Field | Meaning |
|---|---|
| `system_boundary` | The C4 "system of interest" — name and one-sentence scope. |
| `sources` | Repositories, commits/branches, working-copy hashes, and any non-code documents consulted. |
| `state` | `as-is` (current behaviour) or `to-be` (designed-for). One state per workspace. |
| `required_levels` | Usually L1+L2. L3 only when a chosen container demands it. L4 never as a duplicate service map. |
| `workspace_path` | Concrete directory. If omitted, default by state: `docs/architecture/as-is/` or `docs/architecture/to-be/`. Greenfield = `to-be`. |
| `parent_id` | ADR/RFC id when present. The producer writes the navigation report to `docs/c4/<parent_id>.md` accordingly. |
| `report_path` | File the orchestrator expects back. May collide with a previous run. See "Report idempotency". |
| `auto_versioning` | Bool. See "Report idempotency". |

## Workspace lifecycle

1. **Reuse first.** If the assigned `workspace_path` already contains a model, read it and edit in place. Do **not** call `init` on an existing workspace. Existing element IDs and view keys are stable across runs.
2. **`init` is illustrative.** When a brand-new workspace is necessary, `init` writes a scaffold, not a real model. Replace example elements/technologies with source-backed or explicitly proposed input, and remove the example `ApplicationComponents` view unless selected L3 was requested.
3. **One state per workspace.** `as-is` and `to-be` are separate workspaces by convention. Both are only built when the orchestrator asks for a comparison; do not materialise a second one on your own.
4. **No parallel siblings.** Multiple writers on the same workspace are sequential. Do not create per-ADR clones of a shared model.
5. **Required files in the workspace:**
   - `workspace.dsl` — model, view keys, scope.
   - `workspace.json` — saved native model and layout (coordinates, vertices, label positions); mandatory for a complete delivery even without manual edits.
   - `evidence.md` — per-element/relation ID, claim, status (`identified | inferred | proposed | unknown`), source path/section, limits.
   - `assumptions.md` — consequential unknowns and the assumptions they rest on.
   - `review.md` — see "Review record".
   - `exports/static/` — at minimum, the final export below.

## Final export

After the layout is accepted, regenerate the static export **always with** `--use-layout`. The export must use the saved `workspace.json`, not the auto-layout approximation:

```bash
python3 "$structurizr_skill_dir/scripts/architecture.py" export "$workspace_path" \
    --format static --use-layout
```

Do not bypass the stale-JSON check by touching timestamps. The initial preview can omit `--use-layout`; the **final** export never does.

`--use-layout` proves only which JSON was supplied, not that geometry was saved. A JSON containing only `automaticLayout` settings and no persisted rendered positions — including placeholder `x: 0, y: 0` for every element — is **incomplete**. Persist the actual rendered element positions and applicable routes/labels through the native editor, then perform a **full page reload** and inspect the saved result. Switching URL fragments between views is not a reload test. Re-running automatic layout in both the viewer and export is not proof that saved coordinates survived. If the client cannot complete native save/reload, keep the delivery explicitly incomplete; do not redefine completion as automatic-layout configuration.

Fresh timestamps and matching report hashes do not prove DSL/JSON agreement. Before final export, independently parse/export the current DSL as JSON into a disposable directory using the installed CLI (`structurizr export -workspace <workspace.dsl> -format json -output <temporary-directory>`; inspect its actual output filename). Compare that parsed model with saved `workspace.json`: element IDs/types/names/technologies, relationship IDs/endpoints/descriptions/technologies, view keys/types/scopes and included element/relation IDs must agree. Ignore only layout coordinates/vertices/label positions, automatic-layout settings and volatile runtime metadata. Do not discard semantic differences through broad normalization. A newer JSON from a different model is incomplete delivery even if its hashes are truthful. Record the comparison and remove the temporary export; do not overwrite the saved JSON during this read-only check.

Record final hashes after the last native-viewer visit and final export: the local viewer can persist `lastSavedView`/`lastModifiedDate` even without a diagram edit. Freeze the accepted original before handoff. Independent native-viewer checks may use a disposable copy of that exact hashed snapshot; compare its model/layout with the original and never save changes into the submitted workspace. Static export inspection is read-only.

Record a navigation report's own hash externally in the orchestration/evidence record after writing it, not inside the report being hashed. Do not publish a stale self-hash with a disclaimer that later edits may have changed it.

## Levels and views

- **L1 System Context + L2 Containers** are the default. View keys start as `Context` and `Containers`. Existing workspaces keep their view keys; the producer enumerates them in `review.md`.
- **L3 Components** appears only for a chosen container whose question warrants internal detail. It is not a directory listing and not a second service map.
- **L4 Code** does not materialise as another service map. The producer either attaches a UML/image view, links to the real code-level document, or omits L4 with a justification in `assumptions.md`.
- Dynamic, deployment and landscape views are added when a stated question needs them. They are not manufactured for completeness.

## Review record (`review.md`)

`review.md` is the producer's check record, not an independent verdict. Required headings are `## Source snapshot`, `## Commands`, `## Rendered views`, `## Layout and export`, and `## Limitations`:

- **Source snapshot** — repo URL/branch/commit (or working-copy path + `git rev-parse HEAD`), the SHA-256 of `workspace.dsl` and `workspace.json`, the runtime version (`structurizr version` output), and the browser/automation surface used for visual checks.
- **Commands** — exact commands and their exit codes. Helper invocations, `inspect` runs, routing helper runs, native viewer reload, static export.
- **Rendered views** — actual view keys inspected, with a per-view statement of whether lines avoid blocks, labels are readable, and arrows are visible at reading scale.
- **Layout and export** — whether `workspace.json` was modified, the resulting layout coordinates summary, the static export path and SHA-256, and the comparison between the saved viewer reload and the export for both views.
- **Limitations** — what was not checked (e.g. browser unavailable, single view reviewed by mistake, inspect deactivation), and the concrete missing component. Do not paper over a missing piece with "looks good".

## Navigation report for ADR/RFC (`docs/c4/<ARTIFACT-ID>.md`)

When the orchestrator passes a `parent_id` (ADR or RFC), the producer writes a **navigation** report — **not a copy of the model**. Required sections:

- **## Context** — two-sentence summary the ADR/RFC author will reuse in the decision body.
- **## C4 model** — relative links (relative to the report file) to `workspace.dsl`, `workspace.json`, `evidence.md`, `assumptions.md`, `review.md`, and the native static export under `exports/static/`. Use the **actual** filenames produced by the export step.
- **## View coverage** — state (`as-is`/`to-be`/`proposed`), level (L1/L2/L3 if used), and the **actual** view keys verified.
- **## Verification** — `git rev-parse HEAD` (or the working-copy scope), SHA-256 of the DSL/JSON/exports, runtime version, exit codes of the verification commands, the reload test, and the export comparison.
- **## Limitations** — only truthful limits; never a marketing line.

The body of the parent ADR/RFC links back to this report. The producer does **not** write the ADR/RFC body itself.

### Report idempotency

The producer must never silently overwrite a prior report at `report_path`:

- If the requested report does not exist, write that canonical path. On collision with `auto_versioning = true`, insert the first free version before `.md`: `ADR-123.v2.md`, `ADR-123.v3.md`, …; return the path actually written.
- Otherwise, if a report exists → return `<<NEED_USER_INPUT>>` with choices overwrite/version/abort; do not overwrite without an explicit choice.
- A versioned report freezes the **snapshot** it describes (its `## Verification` block). It is not a guarantee that the underlying workspace is unchanged; renewal requires a fresh build with a fresh hash.

### Renewal semantics on a populated workspace

The producer edits the assigned DSL/JSON in place. It does **not** call `init` over an existing model and does not silently move to a sibling directory. If sources for the system boundary are insufficient, return a precise question to the orchestrator and continue independent work; do not invent topology to fill the gap.

### Missing runtime, skill, or browser

If the runtime (`structurizr` CLI), the skill, or the browser is unavailable, the producer must **not** substitute a Mermaid diagram and must **not** claim visual review. The model may stay as an explicitly unverified draft with the missing component named in `## Limitations` and `assumptions.md`, but the C4 row in `guardian` / `methodology-check` is not closed. State the missing piece; do not hide it.

## Artefact integration (orchestrator responsibility, **not** the producer's)

The producer writes model + report. It does **not** call `forgeplan_new`, `forgeplan_update`, or `forgeplan_link`. The orchestration layer (Profile A via `artifact-author` or the relevant kind specialist) creates and links artefacts:

- For an interactive architecture with no parent: L1 → Epic + Note, L2 → PRD per container, a chosen L3 → RFC for that container, explicit L4 → RFC/Spec. Existing kind specialists or `artifact-author` create these MCP-first in `draft`, with `## Sources` linking the model/view/evidence.
- For an existing ADR/RFC: add the `## Context` summary from the navigation report and link back to `docs/c4/<ARTIFACT-ID>.md`. Reuse existing IDs; do not create a parallel graph.
- A repeated call **reuses** the same model. It does not fork a second graph, and it does not run a Markdown ingest on the DSL.
- Without ForgePlan artefacts, the local delivery above is still complete on its own. Do not invent IDs to please the catalogue.

The existing `mappings/c4-to-forge.yaml` importer remains compatible with the **historical** `C4-Documentation/c4-*.md` Markdown format. It is not a parser for the Structurizr DSL, and this contract does not ask it to become one. Native references enter artefact bodies through the Profile A path; a DSL parser/core-ingest API is intentionally not added.

## Reviewer contract (independent agents)

Independent readers of this contract use it as **acceptance criteria**:

- Re-open `workspace.dsl`, `workspace.json`, the navigation report, `evidence.md`, `assumptions.md`, `review.md`, and the native static export under `exports/static/`.
- Re-compute the hashes; compare against what `review.md` claims.
- Independently repeat the DSL-parsed model/view-identity comparison above against saved JSON. Hashes plus mtime are necessary but insufficient; a semantically mismatched JSON leaves C4 CONCERNS even when viewer and static export agree with each other.
- Verify each view key listed under `## View coverage` actually renders the corresponding view in the saved viewer and in the final export.
- Confirm boundary, L1+L2, selected L3, `as-is` / `to-be` separation, provenance, view-key reuse, and the report→artefact link.
- Do not silently modify `workspace.json` or run `apply_layout.py --write`; route concerns back through the orchestrator.
- Record the verdict as an `EVIDENCE` artefact `informs` the parent ADR/RFC. Profile B independence: do not let the producer's `review.md` count as the verdict.

A missing or stale delivery converts the C4 row to **CONCERNS** in `guardian` (not a new BLOCKER), and to `1/PARTIAL` or `0/MISSING` in `methodology-check`. Remediation is a fresh producer run plus a fresh independent review.

## Compatibility policy

- `stability: beta` is kept despite the primary role. A single successful native smoke does not establish correctness for every architecture or layout.
- Workspace identifiers and view keys are a public contract for downstream tools. Preserve them when updating examples or customer models.
- Bumping the plugin version is mandatory when this contract changes. Bumping only this file without bumping the plugin is a release-discipline error.
