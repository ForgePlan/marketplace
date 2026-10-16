---
name: structurizr-c4
description: Build and review evidence-based C4 architecture in Structurizr DSL from source code, documentation and deployment manifests. Use for system context, container, component and selected code views, keeping current and proposed architecture distinct and checking rendered routing before delivery.
---

# Structurizr C4

Create a verifiable model that produces consistent, readable views. Use the official modern `structurizr` application; the initial tested version is **2026.09.19**. Resolve helpers and references relative to this skill's actual directory, never to a particular user's home or fixed plugin cache version. Check installed subcommand help and [official documentation](https://docs.structurizr.com/) when commands differ. Legacy CLI and Lite are not prerequisites.

This is ForgePlan's primary C4 workflow. Read [references/forgeplan.md](references/forgeplan.md) first for job inputs, workspace reuse, full native delivery, report idempotency and independent acceptance. That contract takes precedence over an illustrative starter. No automatic Mermaid fallback closes new C4 work.

## Interactive intake

When not dispatched with sufficient inputs, ask only unresolved questions: system boundary and audience; people/external systems; relation purposes/directions/protocols; runtime containers and stores; current (`as-is`) versus proposed (`to-be`) state; and whether one selected container needs L3. Prefer evidence already available in sources over asking. Record unknowns rather than inventing topology. A dispatched job passes these answers as prompt fields, not a new ForgePlan schema.

## C4 boundaries

- **C1 System Context:** one system of interest, people and external systems; no internal services or tables.
- **C2 Containers:** runtime applications, processes and data stores of one system. A C4 container is not synonymous with Docker. A library or class is not a standalone runtime container.
- **C3 Components:** internals of one selected container, with relevant neighboring dependencies. Model responsibilities and interfaces rather than listing all files.
- **C4 Code:** optional detail of one important component, grounded in real classes/functions. Structurizr has no native code model: use separate UML or another appropriate diagram with a local SVG/PNG image view or link. Do not relabel another component map as Code.

Context and containers usually provide the first useful views. Add deeper detail for the question, complexity and available evidence; do not mechanically produce every level for every element. Business layers are a separate slice, not C4 zoom levels. Add landscape, dynamic, deployment and thematic views when each answers a stated question.

## From sources to a model

1. Establish the system boundary, audience, questions and available repositories. Record commit/branch and working-tree state. Read project instructions. Do not run application code merely to discover architecture.
2. Inspect entry points, composition roots, API/events, background processes, storage adapters, configuration, infrastructure manifests and operating documentation. Use targeted discovery and available symbol tools for definitions/references/dependencies; follow their initialization instructions. Verify README claims against implementation and record conflicts.
3. Create `evidence.md`: stable element/relation ID, specific claim, status `identified | inferred | proposed | unknown`, repo/commit and `path:line` or exact document/section, and limits. Identify changed working-copy files and hashes when useful. `identified` means evidence was found, not that production behavior passed acceptance. Configuration alone does not prove a deployed service exists.
4. Build C1/C2, then selected C3 views from one model. Use stable identifiers and explicit view keys. Set workspace scope to `softwaresystem` or `landscape` according to the boundary. Label relations with direction, purpose and known protocol. Avoid indiscriminate `include *` when it makes a view unreadable.
5. Keep current/proposed states in separate workspaces when both are requested, using comparable identifiers. Current models contain discovered behavior; target models mark proposals. Do not declare an external integration verified from only one backend. Do not invent production topology, replicas, zones, availability or SLA.
6. Validate technically, review meaning with [references/c4-review.md](references/c4-review.md), and check every rendered view with [references/line-routing.md](references/line-routing.md). Run `scripts/check-routing.js` through allowed read-only DOM evaluation, then inspect visually at reading scale. For reproducible repair, follow [references/routing-tools.md](references/routing-tools.md): native SVG capture, verified ID mapping, obstacle-aware routing and explicit safe application. Fix lines through unrelated blocks/labels, overlapping blocks/labels and obscured arrows. `Orthogonal` and a successful parser check do not establish clean geometry. Fully reload after file edits, then check the final export; state missing visual review explicitly.

Ask the orchestrator precise questions when missing data blocks the system boundary; continue independent work. Do not invent nodes to conceal missing sources. You share the working directory: preserve other contributors' edits and change only assigned architecture artifacts. Product code and infrastructure require a separate task.

## Output and local tooling

Use the assigned or linked workspace path first. Otherwise current architecture defaults to `docs/architecture/as-is/`, an ADR/RFC design or greenfield proposal to `docs/architecture/to-be/`. Build both only for a requested comparison. Deliver all native files and the navigation report required by [references/forgeplan.md](references/forgeplan.md), including saved `workspace.json` and `exports/static/`. Keep consumer models in the consumer project, never the installed plugin. Existing models are read and amended in place; serialize writers and preserve IDs/view keys. `init` creates illustrative examples: replace them from sources/proposed input and remove `ApplicationComponents` unless selected L3 was requested.

The stdlib helper supports Python 3.9+ and does not replace architectural analysis. Set `structurizr_skill_dir` below to the directory from which this skill was loaded:

```bash
structurizr_skill_dir="/path/to/installed/skills/structurizr-c4"
python3 "$structurizr_skill_dir/scripts/architecture.py" init docs/architecture/as-is --name "System: current architecture"
python3 "$structurizr_skill_dir/scripts/architecture.py" validate docs/architecture/as-is
python3 "$structurizr_skill_dir/scripts/architecture.py" export docs/architecture/as-is --format static
python3 "$structurizr_skill_dir/scripts/architecture.py" start docs/architecture/as-is --port 18080
python3 "$structurizr_skill_dir/scripts/architecture.py" status docs/architecture/as-is
python3 "$structurizr_skill_dir/scripts/architecture.py" stop docs/architecture/as-is
```

`init` refuses to overwrite existing DSL; preserve that protection. `export` also supports `mermaid`, `plantuml` and `json`; inspect output for the actual destination. Prefer static for interactive handoff. Mermaid/PlantUML are useful translations, not native route preservation.

In version 2026.09.19, `inspect` defaults violations to severity `error`, including absent docs/ADRs; its exit code reflects their count. Attach actual docs/evidence with `!docs` and inspect findings rather than disabling every inspection. Never fabricate ADRs. If historical decisions are unavailable, targeted `structurizr.inspection.model.softwaresystem.decisions info` on the affected system is acceptable with a reason in review. See the checklist.

Manual geometry belongs to **`workspace.json`** alongside DSL. Remove `autoLayout` only from a view needing manual editing, then save coordinates, vertices and label positions. Preserve both files, stable IDs and view keys. Every final static export uses the saved native JSON:

```bash
python3 "$structurizr_skill_dir/scripts/architecture.py" export docs/architecture/as-is --format static --use-layout
```

The helper refuses layout JSON older than DSL. After changing DSL, update/save the viewer before exporting. Do not merely touch stale JSON to bypass the check. Verify the saved/reloaded viewer and exported artifact: transient auto-layout may differ from a persisted render.

Use local styles/resources by default: no remote includes/themes, executable DSL plugins/scripts or automatic cloud uploads. Inspect unfamiliar DSL before invoking it: it can reference the network or executable extensions. Keep credentials, personal data and token-bearing URLs out of models/exports. No Structurizr MCP is required for this file/CLI/browser workflow; for a concrete client need, read [references/mcp.md](references/mcp.md) before adding a verified optional integration.

## Handoff

Return actual model/export/report links, checked view keys, hashes, key unknowns and verification limits per [references/forgeplan.md](references/forgeplan.md). Respect report collision/versioning before writing and return the path actually written. Do not claim all views were reviewed after opening only one. Independent acceptance belongs to another reviewer context; producer self-check is not an EVID verdict. The real Claude role is `structurizr-c4:structurizr-architect`; other clients use their native architecture-scoped worker with this portable skill. Missing runtime/skill/browser leaves an explicitly incomplete draft, never a Mermaid substitute.

## Canonical sources

- [C4 diagrams and depth](https://c4model.com/diagrams)
- [C4 Code](https://c4model.com/diagrams/code)
- [C4 checklist](https://c4model.com/diagrams/checklist)
- [Structurizr DSL](https://docs.structurizr.com/dsl/language)
- [Structurizr image view](https://docs.structurizr.com/dsl/cookbook/image-view/)
