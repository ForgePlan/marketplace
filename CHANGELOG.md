# Changelog

All notable changes to the ForgePlan Marketplace will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2026-04-05

### Added
- 5 agent plugin packs: agents-core (11), agents-domain (11), agents-pro (21), agents-github (7), agents-sparc (5)
- 55 verified agents — all clean, universal, 85-156 lines each
- SPARC methodology integration into /sprint Deep scale (3 execution modes: Sequential, Team-up, Inline)
- SPARC integration into /forge-cycle Build step and advisor agents
- Agent recommendations in /audit (code-reviewer, security-expert, architect-reviewer, tester)
- ARCHITECTURE.md and ARCHITECTURE-RU.md — 4-layer system documentation
- README-RU.md for all 5 agent plugins
- Advisor Agents, Agent Packs, How Agents Work sections in USAGE-GUIDE (EN+RU)
- "How It All Fits Together" section in USAGE-GUIDE (EN+RU)
- "Where to Start?" guide in marketplace README
- ADR-001: 4-Layer Architecture (Orchestra + Forgeplan + FPF + SPARC)
- ADR-002: SPARC Execution Modes with task dependency chains

### Changed
- Marketplace catalog bumped to v1.6.0
- All original plugins bumped to v1.4.0
- plugin.json v2 schema: category, requires, supersedes, components fields
- Command collision detection added to validation script and CI
- /reload-plugins added to README Quick Start
- Recommended Stacks moved to README for visibility

### Fixed
- Duplicate sections in USAGE-GUIDE (Advisors/Agents/How Agents Work appeared twice)
- ux-reviewer.md missing tools field in frontmatter

## [1.4.0] - 2026-04-05

### Added
- plugin.json v2 schema fields: category, requires, supersedes, components
- Command name collision detection in validation script and CI
- v2 optional field checks in CI workflow

### Changed
- All plugins bumped to v1.4.0, catalog to v1.5.0

## [1.3.1] - 2026-04-04

### Added
- USAGE-GUIDE: Hook Behavior, Recommended Stacks, Dependency Requirements (EN+RU)

### Fixed
- forge-audit.md: note that it extends /audit from dev-toolkit
- test-hint.sh: tightened regex, added false-positive comment
- fpf README: marked scripts/ section as maintainer-only

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
