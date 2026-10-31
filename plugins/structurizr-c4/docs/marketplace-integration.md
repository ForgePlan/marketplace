# ForgePlan marketplace integration

`structurizr-c4` is the primary C4 entrypoint for ForgePlan projects. This document records how a developer integrates a payload into the marketplace and how every consumer expects to find it afterwards. New and amended C4 work goes through this plugin; Mermaid is a historical source, not a delivery path.

## Source of truth and adapters

The shared contract lives in `skills/structurizr-c4/SKILL.md` and `references/forgeplan.md`. Keep Claude commands and the architect agent thin — they only select the skill. The `.agents/skills/structurizr-c4` alias points to that same skill. The optional Codex TOML adapter references the installed skill and is not automatically registered by Claude's manifest.

The inspected marketplace uses `.claude-plugin/plugin.json` plus `.agents/skills` aliases. It does not currently define a native Codex-role publishing pipeline. Accordingly this package does not invent one or claim that a Claude agent file becomes a Codex subagent. Its Codex capability is the portable skill; the role adapter is optional and requires runtime-specific installation.

## Changes in the marketplace checkout

1. Read current `AGENTS.md`, `CONTRIBUTING.md` and `docs/CROSS-CLI.md`. Check `git status` and preserve pre-existing changes. Use a feature branch and PR according to repository policy.
2. Add the payload as `plugins/structurizr-c4/`, preserving the relative `.agents/skills/structurizr-c4` symlink. Do not copy the enclosing customer project's directory. The archive is unpacked via `unzip` (not `tar -xzf`); no `.pyc`, no `__pycache__`, no DocMind files belong in the marketplace checkout.
3. `docs/marketplace-entry.json` is the portable template for the catalog entry. Use it as-is when adding the entry to `.claude-plugin/marketplace.json`. Cost, stability, targets and `requires` belong in the catalog, not the strict plugin manifest. `requires.cli` declares `structurizr` and `python3` as non-optional; the browser is described as a capability requirement, not a fake binary.
4. Add `structurizr-c4` once to the catalog's `profiles.full` (and to the architectural bundles — `forgeplan-core`, `developer`, `security`, `agents` — but **not** to `frontend`: that bundle does not install architectural workflows by itself). Other profiles are product choices. Bump the catalog `metadata.version` to the current release value at the time of integration; follow the same version-bump class for the touched plugin manifests.
5. Add `dependencies: ["structurizr-c4"]` to every consumer plugin (currently `fpl-skills`, `agents-pro`, `agents-sparc`, `forgeplan-brownfield-pack`) and the reverse dependency must not be introduced. The marketplace top-level does not auto-install transitive dependencies; `validate-install-manifests.js` only validates names and profiles.
6. Run `node scripts/gen-interop-skills.js` and `node scripts/gen-omp-catalog.js` from the marketplace root. Review both generated diffs and preserve unrelated aliases/catalog entries. Do not hand-edit the OMP catalog output; the generator is the source of truth.
7. Run `node scripts/ci/catalog-check.js` in read-only mode. Its output identifies catalog-owned documentation needing updates; adjust those existing sections in `AGENTS.md`, `CLAUDE.md`, `README*.md`, `docs/INDEX.md`, `docs/CROSS-CLI.md`, `docs/USAGE-GUIDE*.md`, `docs/AI-SDLC-MAPPING*.md`, `docs/process-from-idea-to-delivery-{EN,RU}.md`, `docs/METHODOLOGIES*.md`, `forgeplan-brownfield-pack/README*.md`. Do not replace whole docs or blindly accept a generator rewrite.
8. Remove the obsolete Mermaid generator at `plugins/fpl-skills/skills/c4-diagram/SKILL.md` and its `.agents/skills/c4-diagram` symlink before merging. `fpl-skills` gets a major version bump for this breaking removal entrypoint; do not silently edit it to a patch.
9. Run the gates below, inspect the actual diff, then use the repo's ordinary feature-branch/PR process. No direct push to main/dev.

## Validation before PR

```bash
claude plugin validate plugins/structurizr-c4 --strict   # only if the host has the official CLI
bash plugins/structurizr-c4/tests/test-package.sh
bash plugins/structurizr-c4/tests/test-routing.sh        # 38 synthetic parser/router cases
bash plugins/structurizr-c4/tests/test-marketplace-compat.sh    # 0 args: position-derived checkout
bash plugins/structurizr-c4/tests/test-marketplace-compat.sh .  # 1 arg: explicit checkout
node scripts/ci/interop-skills-check.js
node scripts/ci/frontmatter-check.js
node scripts/ci/validate-no-personal-paths.js
node scripts/ci/validate-install-manifests.js
node scripts/ci/description-shape-check.js
node scripts/ci/omp-catalog-check.js
node scripts/ci/catalog-check.js
./scripts/validate-all-plugins.sh structurizr-c4         # runner that wraps all of the above
```

The final wrapper also runs repo-wide gates and test suites; a pre-existing unrelated failure must be reported with its observed scope. Do not call the whole repository validated based only on the standalone plugin validator.

`test-marketplace-compat.sh` accepts zero or one argument. With zero, it resolves the marketplace checkout from its own script position (`$plugin_root/../..`) regardless of the caller's cwd. With one, it uses the explicit path. With two or more, it prints usage and exits 2. The five required marketplace CI gates are mandatory: a missing checkout or any missing gate file fails the test; there is no silent skip. The fixture never installs the plugin or edits the real checkout. A fixture pass does not replace catalog/documentation checks after integration.

When native tooling (the `structurizr` CLI plus a browser) is available, also run a real end-to-end smoke outside the shipped payload: a temporary workspace initialised and edited, the viewer reloaded after layout edits, the static export opened and inspected, a separate `architect-reviewer` invoked against the model. A negative smoke must remain explicit: a Mermaid-only report or a stale `workspace.json` is **not** a delivery.

For the skill frontmatter, run the current host's skill-validator against `plugins/structurizr-c4/skills/structurizr-c4` when available. That validates metadata and scaffold quality, not diagram semantics.

## What the package intentionally leaves to deployment

- System installation of the official Structurizr runtime and Java dependencies.
- User/project choice of Codex custom-role registration; no automatic global config edit.
- A separately verified optional Structurizr MCP integration. No server registration, ports, tokens or startup hooks are shipped by default.
- Client-specific browser permission and workspace filesystem scope.

## Updating later

Change the shared skill/references/helpers once, then update the thin adapters. Bump plugin and catalog entry versions together, bump the catalog version, regenerate OMP metadata, and rerun applicable gates. Preserve backward-compatible workspace identifiers and saved JSON layout when updating examples or customer models.

## Historical artefacts (preserved, not re-validated)

`docs/validation.md` is preserved as the author's dated evidence for the 38-test routing suite and other standalone checks. It is **not** re-asserted as the result of any later integration. After merging, the same checks live as reproducible commands above.
