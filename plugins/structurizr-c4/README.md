# Structurizr C4

Build architecture models from source evidence, produce focused C4 views, and keep their lines and labels readable after saving and exporting. This is the **primary C4 entrypoint** for ForgePlan projects: `adr-architect` and `architecture` delegate to it for new and amended architectures; reviewer agents and `guardian` verify against its native contract.

[Russian guide](README-RU.md) · [Skill](skills/structurizr-c4/SKILL.md) · [ForgePlan contract](skills/structurizr-c4/references/forgeplan.md) · [Routing rules](skills/structurizr-c4/references/line-routing.md) · [Marketplace integration](docs/marketplace-integration.md)

## Components

- `skills/structurizr-c4/`: the reusable workflow, review criteria, starter DSL, local lifecycle helper and read-only rendered SVG checker. The shared ForgePlan contract lives in `references/forgeplan.md` and is the authoritative specification for delivery and acceptance.
- Its scripts include `extract_native_svg.py` for measured geometry, `route.py` for routing candidates, and `apply_layout.py` for checked layout patches with backups. See [routing tools](skills/structurizr-c4/references/routing-tools.md).
- `.agents/skills/structurizr-c4`: relative interop symlink to the same skill, following the ForgePlan marketplace convention.
- `agents/structurizr-architect.md`: a thin agent loaded by Claude Code and OMP. Scoped as Profile C-coder to **architecture files only**: may write/edit model, report, layout and export; may not write product source, infrastructure, `.forgeplan/`, or activate artifacts. Architecture decisions and unknown boundaries escalate to the ADR/RFC author. Client permission enforcement is adapter-specific; Claude frontmatter is not a cross-client sandbox.
- `commands/c4-build.md` and `commands/c4-review.md`: entry points loaded by Claude Code and OMP. `c4-review` is **producer-side** repair/refresh; it does not replace `architect-reviewer`, `system-dev`, or `guardian`.
- `adapters/codex/structurizr-architect.toml`: an optional Codex custom-role template. It is not auto-registered by the Claude plugin manifest; portable skill discovery happens through `.agents/skills/structurizr-c4`.

The skill is the source of architecture and geometry instructions. The agents and commands only select it, so fixes do not drift between duplicated prompts.

## Requirements

Use the official modern `structurizr` command on PATH, Python 3.9+ for the local helper, and a browser automation surface that can inspect rendered SVG. The initial tested Structurizr version is 2026.09.19. Verify installed subcommand help when upgrading; old CLI/Lite commands are not interchangeable.

On macOS, `brew install structurizr` provides the modern application. Other platforms should follow [the official installation guide](https://docs.structurizr.com/). The plugin does not install software or start a server on load. **Native tooling and a browser are mandatory** for accepting the ForgePlan C4 row. With them unavailable, the model may remain an explicitly unverified draft, but the C4 delivery is not closed.

## Usage

The primary interface is the **portable skill**, not a Claude subprocess. Any agent with file read/write, local command execution and browser automation can follow it using its own model and tools; neither Claude authentication nor a Structurizr MCP server is required.

| Runtime | Install / invoke |
|---|---|
| Claude Code | Install the plugin; invoke `/structurizr-c4:c4-build` or `/structurizr-c4:c4-review`. Producer role: `structurizr-c4:structurizr-architect`. Local session: `claude --plugin-dir <plugin-directory>`. |
| OMP | First register `omp plugin marketplace add ForgePlan/marketplace`; if already registered, use `omp plugin marketplace update forgeplan-marketplace` instead. Then `omp plugin install --scope project structurizr-c4@forgeplan-marketplace`. Start a fresh session; use the same namespaced build/review commands, `/skill:structurizr-c4`, or `skill://structurizr-c4`. The native task-agent name is **`structurizr-architect`**, without a plugin prefix. Local session: `omp --plugin-dir <plugin-directory>`. |
| Codex | Install the full skill directory into a supported skill root, such as `.agents/skills/structurizr-c4`; invoke `$structurizr-c4` with a native worker. The optional TOML role adapter needs separate registration using the installed Codex version's format. |
| Other agents | Install the full `skills/structurizr-c4/` directory through the client's skill mechanism, or read its `SKILL.md` directly. Follow it with native file/CLI/browser tools and the same architecture-only scope. Do not assume another client's slash syntax or agent registration. |

The catalog's `targets` names native plugin adapters, not all consumers of the portable skill. Relative helper paths and one shared contract keep model generation and acceptance independent of the client.

The helper is resolved relative to the skill's actual installed directory:

```bash
structurizr_skill_dir="/path/to/installed/skills/structurizr-c4"
python3 "$structurizr_skill_dir/scripts/architecture.py" init docs/architecture/as-is --name "Example system"
python3 "$structurizr_skill_dir/scripts/architecture.py" validate docs/architecture/as-is
python3 "$structurizr_skill_dir/scripts/architecture.py" export docs/architecture/as-is --format static --use-layout
```

`--use-layout` requires an existing `workspace.json` at least as recent as the DSL. An initial automatic export can omit this flag; a final export after manual routing must keep it. See the skill for the complete lifecycle.

## MCP is optional

The core workflow uses ordinary files, the official CLI and a browser. It does not require a Structurizr MCP server. An optional MCP integration can expose selected operations to clients that prefer structured tools, but it must provide its own documented tool surface, filesystem scope and authentication model. It does not replace rendered geometry review.

No `.mcp.json`, automatic registration, cloud upload, autostart hook or scheduler is included. Add a verified MCP integration only when it solves a concrete client limitation and the operator requests it.

See [MCP scope and limits](skills/structurizr-c4/references/mcp.md) for the inspected HTTP transport, available tools and unsupported rendering/layout operations.

## Model and layout

`workspace.dsl` holds the architecture model and stable view keys. `workspace.json` additionally holds manual coordinates, vertices and label positions. Keep both after manual editing. Static/JSON exports can use that saved layout; Mermaid and PlantUML are convenience translations and do not preserve every native route.

A successful DSL parse cannot prove that lines avoid blocks, or that the architecture matches production. The workflow checks code evidence, rendered geometry, reload persistence and the exported result separately. See the [ForgePlan contract](skills/structurizr-c4/references/forgeplan.md) for the delivery specification, including which files qualify a C4 row as satisfied.

Run `bash tests/test-routing.sh` for the 38 synthetic tests: 17 parser contracts and 21 router/applier checks. These contain no customer architecture and complement the required native render review.

## Delivery contract

A complete C4 delivery is: `workspace.dsl`, saved `workspace.json`, `evidence.md`, `assumptions.md`, `review.md`, and a native static export under `exports/static/` produced with `--use-layout`. For an ADR or RFC the producer also writes a navigation report (`docs/c4/<ARTIFACT-ID>.md`) that links those artefacts without copying the model. Default workspace locations: `docs/architecture/as-is/` for current state, `docs/architecture/to-be/` for designed-for changes. ADR authors may pass an existing workspace path; the producer works in the assigned scope and does not call `init` over an existing model. Mermaid and inline diagrams are not an alternative path — they belong to history, not new acceptance.

## Integration status

The plugin is the primary C4 entrypoint for ForgePlan. It is shipped in `plugins/structurizr-c4/`, exposed via `agents-pro`, `agents-sparc`, `forgeplan-brownfield-pack`, `fpl-skills`, `smith` routing and `fpl-init`'s operating contract v4. The historical Mermaid generator under `plugins/fpl-skills/skills/c4-diagram/` has been removed in `fpl-skills 2.0.0`; old Mermaid artefacts are kept as historical sources but do not close a new C4 row.

For a standalone read-only compatibility check, run `bash tests/test-marketplace-compat.sh [marketplace-checkout]`. With no argument, the script resolves the marketplace checkout from its own on-disk position; with one argument, it uses the explicit path; with two or more, it refuses with usage and exit 2. The script copies the marketplace CI gates into a temporary fixture containing this payload; it does not install the plugin, edit the checkout, or validate its complete existing catalog.
