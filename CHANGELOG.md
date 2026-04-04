# Changelog

All notable changes to the ForgePlan Marketplace will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
