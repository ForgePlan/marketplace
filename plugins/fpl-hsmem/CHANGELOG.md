# Changelog

All notable changes to `fpl-hsmem` are documented here. Format:
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning:
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.6.1] — 2026-09-10

### Added

- **`TROUBLESHOOTING.md` — "Consolidation stops keeping up on a large bank".**
  The symptom is quiet: mental models stay stale, the observation count stops
  moving, nothing errors on your side. Three measured runs on the same bank
  (41,972 memories, 2,063,526 links) locate the cause in the *scope* of the run,
  not the size of the bank, and name the fix: `observation_scopes` narrows
  consolidation to one tag set at a time. Also documents the trap that cost a
  week here — while a consolidation job sits queued, every later
  `POST /consolidate` returns **that same job** and answers `200`, so one job
  that can never finish blocks consolidation permanently and silently.

### Fixed

- **This file.** Versions 3.1.0 through 3.6.0 shipped with no changelog entries —
  six releases recorded nowhere except the merge commits. Reconstructed below
  from those commits. A changelog that skips releases is worse than none: it
  reads as "nothing happened" rather than "nobody wrote it down".

## [3.6.0] — 2026-09-10

### Added

- **Retrieval advice now depends on project size.** `RETRIEVAL-AND-MEMORY.md`
  gains "Size decides which layers are worth having" — brackets by *tracked*
  file count (`git ls-files`, not `find`), with the measurements marked as one
  repository's observations rather than thresholds. At 1,674 tracked files the
  index **lost** (29 ms unindexed vs 36 ms indexed); most of the often-quoted
  speedup came from not scanning vendored code, which the unindexed searcher
  gets for free. `/memory-setup` counts the project and tells the user which
  layers are worth installing at that size — and which are theatre.

## [3.5.0] — 2026-09-10

### Fixed

- **Three plugin descriptions had been truncated mid-word** by a `[:6000]` slice
  in an earlier bump script — `…StructuredOutput-`, `…is a membe`,
  `…the _content_s`. Restored verbatim from the pre-truncation commit.

### Added

- **`scripts/ci/description-shape-check.js`** + self-test (6 cases) so a
  description that ends mid-sentence fails the build instead of shipping.

## [3.4.0] — 2026-09-10

### Added

- **`RETRIEVAL-AND-MEMORY.md`** — which question goes to which layer, and which
  layer verifies which. Corrects the tempting two-layer split ("search answers
  where, memory answers why"): ADRs, RFCs and PRDs are *files in the
  repository*, found by the same tools, and they **outrank** memory. Carries an
  anti-pattern table indexed by symptom, because every one of these failures
  produces a plausible answer rather than an error.
- **`docs/HINDSIGHT-BANK-ACCESS-CONTROL.md`** — seven options for per-bank
  access on a self-hosted deployment, each with what it does **not** enforce, a
  recommendation with its seven limits stated plainly, and six phases each
  carrying its own proof.

## [3.3.0] — 2026-09-10

### Fixed

- **A claim of ours was wrong and had spread.** `allowed-tools` is a
  *pre-approval*, not a restriction — the documentation states every tool
  remains callable. Only `disallowed-tools` restricts. The wrong claim had
  reached a generator header and a CI-guarded test; all corrected, with the
  header now naming what was claimed wrongly.
- **Plugin skills must be referenced as `plugin:skill`** in a subagent's
  `skills:` field; a bare name is skipped silently. A skill carrying
  `disable-model-invocation: true` cannot be preloaded at all.

### Added

- **`src/lib/version.ts`** — one version source, read from the plugin manifest,
  returning `"unknown"` rather than a plausible-looking `0.0.0`; plus
  `tests/test-version-consistency.sh`, which asserts the running server reports
  the manifest version at handshake and carries its own negative control.

### Removed

- 2,888 lines of superseded working documents (`ARCHITECTURE.md`, a dated
  handoff, a findings file, a docs-expansion spec) that described a shape the
  plugin no longer had.

## [3.2.0] — 2026-09-10

### Fixed

- **27 agent denylists across 8 packs had silently fallen out of date.** Seven
  memory-write tools added to the relay were absent from every one of them — the
  lists looked complete and were not. Found by comparing against the registry,
  not by reading: an absent line is indistinguishable from a deliberate omission.

### Added

- **`src/lib/tool-names.ts` → `MEMORY_WRITE_TOOLS`** as the single source, and
  **`scripts/ci/memory-denylist-check.js`** + self-test (4 cases) that derives
  each denylist from it and fails the build on a gap. Hand-maintained lists
  drift; a derived one cannot.

## [3.1.0] — 2026-09-10

### Added

- **The relay explains itself.** MCP `instructions` on the initialize result now
  carry the causal chain — which read is not interchangeable with which, and why
  a correction needs four calls rather than an edit. This is the protocol's place
  for context that no per-tool description can hold.
- **Errors say what to do.** `explainError` maps a status to an instruction
  instead of surfacing a bare code.
- **`/memory-setup`** — proposes what a given project should actually install,
  by layer, instead of assuming everything is worth having.
- **Bilingual skill descriptions** across the skill set, so the agent recognises
  them semantically in either language.

## [3.0.0] — 2026-09-10

The relay stopped being write-only. Until now it could add facts and read them
back, and that was all — there was no way to find a specific stored row, no way
to mark one wrong, and no way to see that a save had failed. A memory system
that cannot be corrected is not memory; it is sediment.

### Added

- **Browse and correct — the point of this release.** `memory_list` enumerates
  by structured filter (type, curation state, source document, tags) and is the
  only tool that can hand you the id of the row that is wrong — `memory_recall`
  ranks by meaning and cannot enumerate. `memory_get` reads one in full.
  `memory_invalidate` retires a fact with a **required stated reason**, keeping
  the text readable and reversible with `restore: true`. `memory_reconsolidate`
  rebuilds the derived beliefs that rested on it — the step whose absence is why
  "I already fixed that" kept not being true.
- **`memory_operations`** — the only place a failed background job is visible. A
  retain that failed produces no error anywhere the user can see: the
  conversation simply never became memory, and recall answers as if it never
  happened. On the first live run against this project's own bank it surfaced
  six failed retains nobody knew about.
- **Knowledge-page lifecycle**: `mental_model_refresh` (rebuild now) and
  `mental_model_clear` (blank the content, keep the query). Pages are created in
  edit-in-place mode, so a drifted page keeps drifting; clearing is the
  documented cure and, unlike `mental_model_delete`, it is recoverable.
- **Directives** — `directive_list` / `_create` / `_delete`. The rules synthesis
  follows. The live bank had none, meaning every reflect and every page rebuild
  was ungoverned.
- **Bank configuration** — `bank_config_get` shows the privacy posture that was
  previously unreachable from any tool. `bank_config_set` writes **behavioural
  settings only**, against an allowlist, and echoes the previous value so the
  change is undoable.
- **Documents** — `document_list` reports `memory_unit_count`, the blast radius
  of deleting one, which nothing else in the system reports. `document_delete`
  is the only irreversible tool in the set and the only remediation for a leaked
  transcript: it measures the target first, **refuses if the two counts
  disagree**, quotes the measured number in a confirmation asked of the human
  outside the conversation, and **refuses outright** in clients that cannot ask.
  No fallback to a token or a second call — a guard whose fallback is "ask the
  model again" is not a guard.
- **`src/lib/redact.ts`** — credential shapes are masked on every path that
  emits stored text: recall, list, get, reflect, and truncated upstream error
  bodies (an error body from this API can quote memory text). This bank stores
  transcripts unmasked, so the formatter is the last place a secret can be
  caught. It is a blast-radius reducer, not a control: it matches shapes, and
  the only remediation for an exposed credential is rotation.
- **`memory_retain` gains `wait`.** Retain returns before extraction runs, so a
  recall on the next line can miss the fact just written. `wait: true` makes the
  asynchrony visible instead of surprising.
- **Registry integrity** — `src/lib/tool-names.ts` is the one declaration of the
  tool set, and startup asserts that the tool definitions and the handler map
  both cover exactly it. At thirteen tools a human caught drift; at twenty-seven
  nobody would, and the failure mode is a tool that lists and then fails on call.
- **NEW agent `memory-curator`** — the plugin had no `agents/` directory at all.
  It knows which read tool answers which question, drives the correction cycle,
  and denies document deletion, extraction-rule changes and bank configuration
  by construction, with the same invariants restated as HARD RULES because
  denylists are a Claude Code feature and do not travel.
- **NEW skills** `correct-memory` (the headline workflow, `disable-model-invocation`),
  `audit-bank` (read-only posture audit) and `directives`.

### Fixed

- **Every shipped skill was silently denied its tools on a plugin install.** All
  five pinned `mcp__hindsight__*`, which binds only in a project that hand-wires
  that server name — as this repository does, which is why nobody noticed. A pin
  naming a tool the runtime does not have is not an error; it is a withheld
  tool. All eight skills now pin **both** prefixes, generated by
  `scripts/gen-skill-pins.mjs` from the bare names each skill declares, with a
  `--check` mode wired into the test suite and a negative control proving the
  checker can fail.
- **`document_ingest` re-injected every ingested document into memory as
  conversation.** `content.ts` classified a tool call as a chat message by
  guessing from its name, the pattern required a trailing underscore on its verb
  alternatives, and `document_ingest` carries its payload in a field literally
  named `content`. Our own tools are now matched by name from the registry, and
  the third-party fallback no longer requires the trailing underscore.
- **Three list filters were transcribed from documentation and are silently
  ignored by the server.** Measured: `types`, `fact_type` on memories and
  `task_type` / `operation_type` / `kind` on operations all return 200 and the
  unfiltered set. A tool built on them would report a narrowed view that was
  never narrowed. Only the verified spellings ship: `type` (singular), `state`,
  `document_id`, `q`, `tags`, and `status` on operations.
- **Unknown tool is now a protocol error** (`MethodNotFound`), not an `isError`
  result — the latter invites the model to retry a tool that does not exist.
- **Upstream failures are explained, truncated and redacted** instead of relayed
  verbatim: a 401 no longer reads the same as a 404.
- **`export-bank` claimed Hindsight has no import path.** It has one —
  `document-transfer` export/import — and that is the documented way to move
  memory between banks. Corrected, with the two cautions found live: a large
  export has been seen to fail with a timeout after three retries, and the admin
  CLI's `import-bank` restores a whole bank and fails if the target exists, so it
  cannot merge.

### Changed — BREAKING

- **`retain_mission` is no longer reachable as a tool argument** (removed in the
  F1–F8 security batch, released here). It steers what the server extracts from
  every future conversation: an agent able to set it could rewrite the memory
  rules for everything that followed, through a call that reads as cosmetic. It
  stays an operator setting, and `bank_config_set` refuses it by name.
- **Bank identity now anchors on the project root, not the raw working
  directory.** Two resolvers disagreed silently and split one project's memory
  across banks. Projects that relied on the old behaviour must declare
  `HINDSIGHT_BANK_ID` explicitly — `memory_status` now names the source of the
  bank id and warns when it was derived from a directory name.
- Server version string is `3.0.0`; `tools/list` grew from 13 entries to 27
  (13,662 bytes, still under half of upstream's 29-tool surface).

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
