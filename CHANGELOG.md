# Changelog

All notable changes to the ForgePlan Marketplace will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
