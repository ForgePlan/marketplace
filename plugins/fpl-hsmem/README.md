# fpl-hsmem — ForgePlan Hindsight memory plugin

Long-term cross-session memory for Claude Code, packaged for the
ForgePlan marketplace.

Wraps [Hindsight](https://github.com/vectorize-io/hindsight) with:

- **13 MCP tools** — `memory_*`, `mental_model_*`, `document_*`
- **3 hooks** — auto-recall before every prompt, auto-retain after every
  response, force-retain on session end (with throttling and Claude Code
  compaction detection)
- **5 skills** — `/status`, `/bootstrap`, `/mental-model`, `/diagnose`,
  `/export-bank`
- **Two activation modes** — plugin install (everywhere) or per-project
  setup CLI (explicit opt-in)

## Two modes — which to pick

| | Plugin install | Per-project setup |
|---|---|---|
| Activation | One install, every project | Run `setup.js` per project |
| Bank ID | Derived from git/cwd | Pinned in project's `.mcp.json` |
| Opt-out | `.hindsight-disabled` marker | Don't run setup |
| Source of truth | Plugin manifest + cwd | Project's `.mcp.json` |
| Best for | Default-on across N projects | Explicit per-project control |

Both modes can coexist — project-level `.mcp.json` overrides plugin-level
config, so a project that ran `setup.js` will use its own bank even when
the plugin is installed.

## Mode 1 — Plugin install

```bash
# 1. Start Hindsight (no LLM key required — uses your Claude subscription)
docker run -d --name hindsight -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=claude-code \
  ghcr.io/vectorize-io/hindsight:latest

# 2. Install the plugin
claude plugin marketplace add ForgePlan/marketplace
claude plugin install fpl-hsmem

# 3. Verify
claude  # restart
# In any project, ask: "memory_status"
```

The plugin will:
- Register `mcp__hindsight__*` tools in every project
- Run auto-recall before every prompt
- Run auto-retain after every response (throttled, every 10 turns)
- Force-retain on session end
- Resolve `bank_id` per project from `git rev-parse --git-common-dir`

To **opt out** in a specific project, create a marker file:

```bash
touch .hindsight-disabled
```

Or set the environment variable `HINDSIGHT_DISABLED=true` in
`.claude/settings.local.json`.

## Mode 2 — Per-project setup CLI

For explicit, pinned-bank control. Recommended for projects where you
want the bank ID visible in `.mcp.json` and committed to git.

```bash
# 1. Start Hindsight (same docker command as Mode 1)

# 2. Build from source (one-time)
cd /Users/explosovebit/Work/Orchestra/utils/mcp/hindsight-mcp
npm install
npm run build

# 3. Wire up a project
cd ~/Work/my-project
node /Users/explosovebit/Work/Orchestra/utils/mcp/hindsight-mcp/dist/setup.mjs
```

The CLI creates:

- `.mcp.json` — registers the MCP server with an explicit bank ID
- `.claude/settings.local.json` — registers the 3 hooks
- `.claude/rules/hindsight.md` — project-level usage discipline
- An entry in `.gitignore` (if the directory is a git repo)

Options:

```bash
--bank <id>      Pin a specific bank ID
--url <url>      Hindsight URL (default: http://localhost:8888)
--committed      Use .claude/settings.json (shared via git)
--no-hooks       MCP only, no auto-recall/retain
--no-rules       Skip writing .claude/rules/hindsight.md
--force          Overwrite existing files
```

## 13 MCP tools

### Core memory

| Tool | Purpose |
|------|---------|
| `memory_retain` | Save a fact / decision / lesson |
| `memory_recall` | Semantic search (`budget`, `types`, `max_tokens`) |
| `memory_reflect` | LLM synthesis of memories into coherent answer |
| `memory_status` | Health + bank statistics |
| `memory_get_current_bank` | Confirm active bank ID |
| `memory_set_mission` | One-time bank persona setup |

### Mental models — living knowledge pages

A page is auto-re-synthesized after every memory consolidation.

| Tool | Purpose |
|------|---------|
| `mental_model_list` | List pages (metadata only) |
| `mental_model_get` | Read page content |
| `mental_model_create` | Create with `source_query` |
| `mental_model_update` | Change name or query |
| `mental_model_delete` | Delete |

### Documents

| Tool | Purpose |
|------|---------|
| `document_ingest` | Save raw text as a document |
| `document_ingest_file` | Read a file from disk and ingest |

## 5 skills

When the plugin is installed, slash-commands are namespaced as
`/fpl-hsmem:<skill>`.

| Skill | When |
|---|---|
| `/fpl-hsmem:status` | Quick health check, bank stats, list of pages |
| `/fpl-hsmem:bootstrap` | One-time setup for a new bank — set mission, ingest existing artifacts, create starter pages |
| `/fpl-hsmem:mental-model` | Guided mental model creation with validation |
| `/fpl-hsmem:diagnose` | Full 6-step diagnostic (server, bank, hooks, config, opt-out) |
| `/fpl-hsmem:export-bank` | Markdown snapshot of bank for backup or audit |

## 3 hooks

### `recall.mjs` — UserPromptSubmit

1. Reads prompt from stdin
2. Composes multi-turn query from transcript if `recallContextTurns > 1`
3. Calls Hindsight `recall`
4. Injects results as `additionalContext`

Result: Claude sees enriched prompt, user sees clean chat.

### `retain.mjs` — Stop

1. Reads transcript JSONL
2. Strips `<hindsight_memories>` (anti-loop)
3. Throttles: writes once every `retainEveryNTurns` (default 10)
4. **Compaction detection**: if transcript shrank vs last retain, bumps
   chunk index so the prior longer document survives
5. POST to Hindsight with `async:true`

### `session-end.mjs` — SessionEnd

Force-retains regardless of throttling — safety net for short sessions.

## Configuration

Resolution order (later wins):

1. Built-in defaults
2. `~/.hindsight/config.json` (user-wide)
3. `<cwd>/.mcp.json` → `mcpServers.hindsight.env` (project override)
4. `<cwd>/.hindsight.json` (project config)
5. Environment variables

If `bankId` is empty after all sources, it's derived from
`resolveProjectName(cwd)` (git worktree-aware).

| Env / config key | Default | Description |
|---|---|---|
| `url` / `HINDSIGHT_URL` | `http://localhost:8888` | Hindsight API |
| `bankId` / `HINDSIGHT_BANK_ID` | derived from cwd | Bank isolation key |
| `apiKey` / `HINDSIGHT_API_KEY` | `""` | Bearer token if needed |
| `autoRecall` / `HINDSIGHT_AUTO_RECALL` | `true` | Enable recall hook |
| `autoRetain` / `HINDSIGHT_AUTO_RETAIN` | `true` | Enable retain hook |
| `recallBudget` / `HINDSIGHT_RECALL_BUDGET` | `mid` | `low` / `mid` / `high` |
| `recallMaxTokens` / `HINDSIGHT_RECALL_MAX_TOKENS` | `1024` | Token budget |
| `recallContextTurns` / `HINDSIGHT_RECALL_CONTEXT_TURNS` | `1` | Multi-turn query |
| `retainEveryNTurns` / `HINDSIGHT_RETAIN_EVERY_N_TURNS` | `10` | Throttling |
| `retainToolCalls` / `HINDSIGHT_RETAIN_TOOL_CALLS` | `false` | Include tool_use blocks |
| `debug` / `HINDSIGHT_DEBUG` | `false` | `[Hindsight]` stderr logging |
| `HINDSIGHT_DISABLED` | `false` | Disable everything in this project |

## Repo layout

```
.claude-plugin/plugin.json         Plugin manifest
.mcp.json                          Plugin MCP server registration
hooks/hooks.json                   Plugin hook registration
skills/                            5 skills (status, bootstrap, ...)
src/                               TypeScript source
├── index.ts                       MCP server entrypoint
├── setup.ts                       Per-project setup CLI (Mode 2)
├── lib/
│   ├── config.ts                  Config loader (5 sources, opt-out)
│   ├── client.ts                  Hindsight HTTP client
│   ├── bank.ts                    Project name + bank ID derivation
│   ├── transcript.ts              Claude Code JSONL parser
│   ├── content.ts                 Memory tag stripping, query composition
│   └── state.ts                   Atomic file state (turns, retention)
└── hooks/
    ├── recall.ts                  UserPromptSubmit
    ├── retain.ts                  Stop (throttling + compaction)
    └── session-end.ts             SessionEnd (force-retain)
dist/                              esbuild bundles (.mjs, standalone)
templates/                         For setup.js Mode 2
build.mjs                          esbuild script
```

## Usage discipline files

- `~/.claude/rules/hindsight.md` — global rules (auto-loaded every
  session): principles, when to use which tool, what to store and what not
- `<project>/.claude/rules/hindsight.md` — project specifics (auto-loaded
  in the project): which bank, which mental models, which domain tags.
  Created by `setup.js` in Mode 2

Both files are auto-loaded by Claude Code; no `@`-import in `CLAUDE.md`
is needed.

## Debugging

```bash
# Plugin loaded?
claude plugin list

# Hindsight reachable?
curl http://localhost:8888/health

# MCP server starts cleanly?
node dist/index.mjs < /dev/null

# Hook runs against mock input?
echo '{"prompt":"test","cwd":"/path/to/project","session_id":"x"}' | \
  HINDSIGHT_DEBUG=true node dist/hooks/recall.mjs

# State files (turn counter + retention tracking)
ls -la ~/.hindsight/state/

# Hindsight logs
docker logs hindsight -f

# Hindsight Web UI — memory graph
open http://localhost:9999
```

## Links

- [Hindsight](https://github.com/vectorize-io/hindsight) — the underlying memory engine
- [Hindsight docs](https://hindsight.vectorize.io)
- [MCP Protocol](https://modelcontextprotocol.io)
- [Claude Code plugins](https://docs.claude.com/en/docs/claude-code/plugins)
