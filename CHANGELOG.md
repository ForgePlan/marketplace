# Changelog

All notable changes to the ForgePlan Marketplace will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.3] - 2026-05-07

Operational docs overhaul — migration guide, tracker recipes, forgeplan-web walkthrough, plus a corrected `.forgeplan/` setup contract.

### Added
- `docs/MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md` and `-RU.md` — migration guide for users moving from `dev-toolkit` to `fpl-skills`. Covers the side-by-side mode (zero-risk default), clean-cut mode, slash command namespacing (`/dev-toolkit:audit` vs `/fpl-skills:audit`), `CLAUDE.md` reference updates, rollback plan, and explicit "what this migration does NOT change".
- `docs/TRACKER-INTEGRATION.md` and `-RU.md` — per-tracker recipes for Orchestra, GitHub Issues, Linear, Jira, and local `TODO.md`. Each section provides `docs/agents/issue-tracker.md` template, MCP/CLI commands, `/briefing` integration notes, and triage label conventions.
- `docs/FORGEPLAN-WEB.md` and `-RU.md` — guide to `@forgeplan/web` (the browser viewer at [github.com/ForgePlan/forgeplan-web](https://github.com/ForgePlan/forgeplan-web)). When to install, time-travel slider, graph viewer, integration with marketplace plugins, setup checklist (which pieces of `.gitignore` contract are mandatory for full functionality).

### Changed
- `plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md` — rewritten with the authoritative `.gitignore` contract: detailed effects-of-mistakes tables (config.yaml leak, notes/ ignore, session.yaml tracked, state/ ignore, memory/ ignore, literal API key in config.yaml), single-config-file model (`secrets.yaml` does not exist; only `config.yaml`), default fallback chain for `api_key_env`, agent-session anti-patterns (4 grouping mistakes), the two "memory" concepts disambiguation (forgeplan `memory/` vs Hindsight MCP).
- `fpl-skills` v1.0.2 → 1.0.3 (patch — documentation accuracy + new resource references in plugin tree).

### Notes
The setup contract update reflects authoritative info: `memory/` is a first-class Forgeplan artifact kind (categories: fact / convention / constraint / observation / procedure) and **must be tracked**, not gitignored. There is no separate `secrets.yaml` — `config.yaml` uses `api_key_env: VAR_NAME` and the actual key lives in process env (12-factor pattern).

## [Unreleased]

### Added
- `docs/DEVELOPER-JOURNEY.md` and `DEVELOPER-JOURNEY-RU.md` — narrative onboarding ("From Zero to Shipping") with 4 persona Day 0 walkthroughs (Solo / Frontend / Architect / Team with Orchestra), worked example "add user authentication" threading through commands, and a Mermaid diagram of ecosystem composition.

### Changed
- `docs/USAGE-GUIDE.md` and `USAGE-GUIDE-RU.md` rewritten as a reference manual (vs the old "first guide" framing). New structure: Installation → Recommended stacks (by persona) → Quick reference (15 commands) → Daily workflow → Agent activation rules → Hook behavior → Plugin reference → Troubleshooting. fpl-skills positioned as flagship; /fpl-init featured throughout; dev-toolkit demoted to legacy.
- `docs/ARCHITECTURE.md` and `ARCHITECTURE-RU.md` Plugin Map updated: fpl-skills added as the "glue layer" flagship; dev-toolkit reframed as legacy (soft-deprecated). Recommended Stacks rewritten persona-first.

## [1.10.2] - 2026-05-07

### Added
- New plugin resource: `plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md` — canonical `.forgeplan/` setup contract (gitignore, secrets layout via 12-factor `api_key_env`, env var overrides, anti-patterns, pre-commit verification).
- `plugins/fpl-skills/README-RU.md` — Russian mirror of the plugin README, aligned with marketplace bilingual convention.

### Changed
- `fpl-skills` v1.0.1 → 1.0.2: corrected `.forgeplan/` storage layout in `CLAUDE.md.template` (config.yaml is tracked but uses `api_key_env`; canonical .gitignore includes logs/, .lock, session.yaml, trash/, discovery/, .env; memory/ and state/*.yaml clarified as tracked artifact dirs).
- `plugins/fpl-skills/README.md` (67 → 139 lines) — aligned with canonical marketplace plugin README structure (tagline → Quick Start → Usage Examples → What's Included → Lifecycle integration → Companion plugins → Resource guides → Credits → License).
- Root `README.md` and `README-RU.md`: stats updated to 12 plugins / 15 commands / 5 KBs; "Where to Start?" matrix recommends fpl-skills as the flagship for forgeplan users; dev-toolkit moved down with `[!CAUTION]` deprecation callout; fpl-skills entry added FIRST in Available Plugins.

### Notes
This release addresses real-world feedback from smoke-testing `/fpl-init` on a fresh project. The earlier v1.0.1 template was inaccurate about secrets layout (claimed config.yaml was untracked); v1.0.2 corrects this and ships the full setup contract as a reference doc.

## [1.10.1] - 2026-05-07

### Added
- `plugins/fpl-skills/skills/fpl-init/SKILL.md` step 7 mandates literal template rendering (Read the file, abort-if-missing, no improvising, no reordering of sections).
- `plugins/fpl-skills/skills/bootstrap/resources/templates/CLAUDE.md.template` enriched 170 → 447 lines following the U-curve attention layout from `CLAUDE-MD-GUIDE.ru.md`.

### Changed
- `fpl-skills` v1.0.0 → 1.0.1: fix for `/fpl-init` agent that was improvising thin (~60-line) CLAUDE.md instead of rendering the full template. New sections added: Routing depth table, Artifact ID rules (slug/predicted/assigned), EvidencePack structured fields, Lifecycle commands, Standard flow example, Multi-agent dispatch/claim/release, Validator section aliases, Permission zones (🟢/🟡/🔴), Agent teams listing the 5 packs, Unified workflow (Forgeplan × Tracker × Memory).

### Notes
The verbosity of the template is load-bearing — primacy/reference/recency zones need population for U-curve attention. Earlier "thin" template silently stripped guard rails.

## [1.10.0] - 2026-05-07

### Added
- New plugin: `fpl-skills` v1.0.0 — flagship workflow plugin bundling 15 engineering skills (research, refine, sprint, audit, diagnose, autorun + bootstrap, /fpl-init, restore, briefing, build, do, rfc, setup, team) on top of forgeplan's artifact lifecycle.
- `/fpl-init` skill — one-command project bootstrap that probes forgeplan CLI, runs forgeplan init, merges .mcp.json and .claude/settings.json, then chains /bootstrap (universal CLAUDE.md template with stack detection) and /setup (docs/agents wizard).
- `plugins/fpl-skills/GETTING-STARTED.md` — human-readable bootstrap walkthrough.
- SessionStart hook in fpl-skills surfacing context-aware next-step hints (e.g. "Run /fpl-init" for fresh repos).

### Changed
- `dev-toolkit` v1.6.1 → 1.6.2: marked `deprecated: true`, `supersededBy: fpl-skills`. README opens with `[!CAUTION]` deprecation callout pointing to fpl-skills. Soft-sunset; existing installs continue to work. Hard removal deferred to catalog v2.0 (ADR-003 in `.forgeplan/adrs/`).
- Marketplace catalog metadata updated to mirror dev-toolkit deprecation flags on the catalog entry.

### Notes
First major catalog reshape since v1.6.0 (Agent Army). fpl-skills enters as the canonical entry point for forgeplan users. dev-toolkit kept in catalog for backward compatibility — no forced migration.

## [1.8.0] - 2026-04-26

### Added
- New plugin: `forgeplan-brownfield-pack` v1.0.0 — orchestrator pack for brownfield migrations. Composes existing marketplace plugins (`c4-architecture`, `autoresearch`, `ddd-expert`, `feature-dev`) with forgeplan's ingest engine via mapping YAMLs and playbook recipes (per ADR-009).

### Notes
Implements the orchestrator model: forgeplan does not re-implement extraction. Mapping layer (c4-to-forge) validated at CL3 on Forgeplan repo (2026-04-20).

## [1.7.0] - 2026-04-28

Aligned `forgeplan-workflow` with Forgeplan v0.25.0 (PRD-071 unified hint contract). All plugins bumped to v1.5.0, marketplace catalog to v1.7.0.

### Added

- `forgeplan-workflow`: new skill section `06-output-hints/agent-protocol.md` — full agent reading protocol for the 5-rule hint contract (Next/Or/Wait/Done/Fix markers)
- `forgeplan-workflow`: new prelude step "Reading Forgeplan Output" in `/forge-cycle` command — instructs the agent to read contract markers after every command
- `forgeplan-workflow`: new behavior #5 "Hint Contract Awareness" in `forge-advisor` agent — gently reminds when user/agent ignores `Next:`/`Fix:` markers (existing SPARC behavior renumbered to #6)

### Changed

- `forgeplan-workflow`: bumped to v1.5.0
- Marketplace catalog: bumped to v1.7.0
- `forgeplan-methodology` SKILL: Section router updated with new "hint protocol" topic; new top-level section "Hint Protocol" added
- README.md + README-RU.md: feature mention of v1.5.0 hint contract awareness

### Notes

Without v1.5.0, users installing `forgeplan-workflow` get an agent that does NOT read the new hint markers — wastes Forgeplan v0.25.0's contract work. v1.5.0 closes the distribution gap.

Compatibility:
- Requires Forgeplan binary >= v0.25.0 for full benefit (older versions still work but agent will not see contract markers)
- Backward compat: existing `/forge-cycle`, `/forge-audit`, advisor behaviors unchanged

## [1.6.0] - 2026-04-04

### Added
- Agent Army: 55 agents across 5 packs (agents-core, agents-domain, agents-pro, agents-github, agents-sparc)
- SPARC development methodology integration with /sprint Deep tasks
- ARCHITECTURE.md and ARCHITECTURE-RU.md documentation (4 Systems, 4 Layers)
- Bilingual architecture docs with cross-links

### Fixed
- Duplicate sections in USAGE-GUIDE.md (Advisor Agents, Agent Packs, How Agents Work appeared twice)
- README.md Quick Start updated with step-by-step flow
- Added "Where to Start?" role-based guide to README.md
- Architecture link added to README header stats

## [1.4.0] - 2026-04-04

### Added
- plugin.json v2 schema support
- Collision detection for overlapping plugin commands

### Changed
- Marketplace catalog updated with v2 schema fields

## [1.3.1] - 2026-04-04

### Changed
- USAGE-GUIDE.md expanded with Advisor Agents, Agent Packs, How Agents Work, SPARC Methodology sections
- USAGE-GUIDE-RU.md expanded with matching Russian translations

### Fixed
- Small formatting fixes in usage guides

## [1.3.0] - 2026-04-04

### Added
- CHANGELOG.md for tracking marketplace changes
- hooks.json schema documentation in CONTRIBUTING.md
- Mandatory PR workflow rules in CLAUDE.md
- Version bumping policy in CLAUDE.md

### Changed
- CONTRIBUTING.md: added hooks.json schema reference and examples

## [1.2.0] - 2026-04-04

### Fixed
- Python injection vulnerability in validate-all-plugins.sh and CI workflow (use sys.argv)
- Safety hooks fail-open when jq absent (added python3 fallback, fail-closed)
- Incomplete rm -rf patterns in safety hooks (broadened regex)
- set -euo pipefail crash in forge-safety-hook.sh (removed -e)
- WARN on missing required fields changed to FAIL with error counting
- Unbound variable $1 in validate script
- Install commands in 6 README files (3 plugins x EN+RU)
- GitHub org URL casing in forgeplan-workflow READMEs

### Changed
- Pinned GitHub Actions to SHA (actions/checkout@11bd719...)
- Added version field assertion in CI
- Orchestra unified-workflow sections moved to sections/ subdirectory
- pre-code-check.sh: matcher narrowed to Write-only, added 5-minute cache
- FPF update-fpf.sh: added submodule SHA integrity verification
- All plugins bumped to v1.2.0, marketplace catalog to v1.3.0
- laws-of-ux plugin.json: added Svelte to description

## [1.1.2] - 2026-04-03

### Changed
- forgeplan-orchestra bumped to v1.1.2 (milestone approach + sync)

## [1.1.1] - 2026-04-03

### Fixed
- Hook scripts: sanitize inputs, scope DROP rule, add explicit exit 0
- All prompt hooks replaced with command hooks (silent when not matching)

### Changed
- All plugins bumped to v1.1.0-1.1.1

## [1.0.0] - 2026-04-03

### Added
- Initial marketplace release with 5 plugins
- laws-of-ux: 30 UX laws, 9 code patterns, 2 commands, 1 agent, 1 hook
- dev-toolkit: 3 commands (audit, sprint, recall), 1 agent, 2 hooks
- forgeplan-workflow: 2 commands (forge-cycle, forge-audit), 1 agent, 2 hooks
- fpf: 4 commands, 1 agent, 224 FPF spec sections + 4 applied patterns
- forgeplan-orchestra: 2 commands (sync, session), 1 agent, 1 hook
- Validation script and CI workflow
- CONTRIBUTING.md with plugin submission guidelines
- Usage Guide (EN + RU)
