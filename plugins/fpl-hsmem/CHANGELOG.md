# Changelog

All notable changes to `fpl-hsmem` are documented here. Format:
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning:
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.0] — 2026-05-18

### Added
- `GETTING-STARTED.md` — 10-minute walkthrough from zero to first
  recall: Docker setup, plugin install, bootstrap, first mental model.
- `CONFIGURATION.md` — full environment variable reference, resolution
  order, 3-mode configuration recipes, opt-out semantics.
- `USAGE.md` — real-world use cases (bug history, onboarding, decisions
  log) and integration patterns with `fpl-skills` / forgeplan
  artifacts.
- `TROUBLESHOOTING.md` — diagnostic recipes for common issues (server
  unreachable, recall empty, hooks not firing, compaction tracking,
  opt-out troubleshooting).
- README **Mode 3** (Direct MCP) — `dist/index.mjs` is a standalone
  bundle and can be wired into any project's `.mcp.json` without
  installing the plugin or running setup CLI. Use case: MCP tools
  without the auto-recall/retain background machinery.

### Changed
- README.md restructured to match `fpl-skills` flagship conventions:
  ~140 lines, clear Quick Start → Usage Examples → What's Included
  → Companion plugins → Credits flow. Detailed sections moved to
  dedicated files (GETTING-STARTED, CONFIGURATION, USAGE,
  TROUBLESHOOTING).
- README Mode 2 setup CLI path: was `~/Work/Orchestra/utils/mcp/hindsight-mcp`
  (the obsolete dev location); now points to the canonical
  `~/Work/forgeplan-marketplace/plugins/fpl-hsmem/dist/setup.mjs`.
- README-RU.md regenerated to match the new EN structure.

### Internal
- TypeScript source (`src/`, `build.mjs`, `tsconfig.json`) consolidated
  into the plugin directory. Was previously developed in
  `~/Work/Orchestra/utils/mcp/hindsight-mcp/` and hand-synced to the
  marketplace lean copy — that workflow is now gone, single source of
  truth lives at `plugins/fpl-hsmem/src/`.
- `npm run build` at the new location produces `dist/*.mjs` that is
  bit-for-bit identical to the v2.0.0 published artifact — no runtime
  behavior change.

## [2.0.0] — 2026-05-18

Initial publication of `fpl-hsmem` in the ForgePlan marketplace.
Bundled as part of v0.32 loop closure (PRD-024 + PRD-025 + RFC-002 +
RFC-003 + ADR-005, NOTE-004 outcome-feedback pattern adoption).

### Added — MCP server (13 tools)

**Core memory:**
- `memory_retain` — save a fact / decision / lesson with optional tags
- `memory_recall` — semantic search with `budget`, `types`,
  `max_tokens` filters
- `memory_reflect` — LLM synthesis of memories into a coherent answer
- `memory_status` — bank health check + statistics
- `memory_get_current_bank` — confirm the active bank ID
- `memory_set_mission` — one-time bank persona / mission setup

**Mental models (living knowledge pages):**
- `mental_model_list` — list pages (metadata only)
- `mental_model_get` — read page content (re-synthesized on each
  consolidation)
- `mental_model_create` — create a page with a `source_query`
- `mental_model_update` — change name or query
- `mental_model_delete` — delete a page

**Documents:**
- `document_ingest` — save raw text as a document
- `document_ingest_file` — read a file from disk and ingest it

### Added — auto hooks (3)

- **`recall.js` (UserPromptSubmit)** — semantic recall before every
  prompt, results injected as `additionalContext`. Configurable
  `recallContextTurns` for multi-turn query composition.
- **`retain.js` (Stop)** — saves transcript after every response.
  Throttling via `retainEveryNTurns` (default 10). **Compaction
  detection** — if the transcript shrinks vs last retain, bumps a
  chunk index so the prior longer document survives.
- **`session-end.js` (SessionEnd)** — force-retain on session close,
  safety net for short sessions.

### Added — skills (5)

- `/fpl-hsmem:status` — quick health check + stats
- `/fpl-hsmem:bootstrap` — one-time setup for a new bank (mission,
  ingest existing artifacts, create starter mental models)
- `/fpl-hsmem:mental-model` — guided mental-model creation
- `/fpl-hsmem:diagnose` — full 6-step diagnostic
- `/fpl-hsmem:export-bank` — markdown snapshot for backup / audit

### Added — activation modes (2)

- **Plugin install** — `claude plugin install fpl-hsmem`, default-on
  across all projects, bank derived from cwd via git-worktree resolution
- **Per-project setup CLI** — `node dist/setup.mjs` writes explicit
  `.mcp.json` + `.claude/settings.local.json` + `.claude/rules/hindsight.md`

### Added — opt-out

- `.hindsight-disabled` marker file in project root, or
  `HINDSIGHT_DISABLED=true` env var, disables both MCP and hooks for
  the affected project.

### Architecture notes

- TypeScript source, esbuild bundle into self-contained `dist/*.mjs`
  (~190KB index, ~20KB per hook). No `node_modules` required at runtime.
- Atomic file state under `~/.hindsight/state/` (`turns.json`,
  `retention.json`) for throttling and compaction tracking. Capped at
  10 000 sessions with FIFO eviction.
- Wraps [Hindsight](https://github.com/vectorize-io/hindsight) by
  vectorize-io. Default LLM provider for fact extraction:
  `claude-code` (uses your Claude Pro/Max subscription, no extra API
  keys required).

[Unreleased]: https://github.com/ForgePlan/marketplace/compare/fpl-hsmem-v2.1.0...HEAD
[2.1.0]: https://github.com/ForgePlan/marketplace/compare/fpl-hsmem-v2.0.0...fpl-hsmem-v2.1.0
[2.0.0]: https://github.com/ForgePlan/marketplace/releases/tag/fpl-hsmem-v2.0.0
