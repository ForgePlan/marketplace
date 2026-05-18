# Configuration

Full reference for every setting, env var, and resolution rule in
`fpl-hsmem`. If you just want it to work, [`GETTING-STARTED.md`](./GETTING-STARTED.md)
covers the happy path with zero configuration.

---

## Resolution order

Config is built up from five sources, later sources override earlier:

1. **Built-in defaults** (`src/lib/config.ts`)
2. **`~/.hindsight/config.json`** — user-wide overrides
3. **`<cwd>/.mcp.json`** → `mcpServers.hindsight.env` — project-level
   single source of truth for the bank
4. **`<cwd>/.hindsight.json`** — project-level override file
5. **Environment variables** — highest priority, override everything

If `bankId` is still unset after all five sources, it is derived from
`resolveProjectName(cwd)` — git-worktree-aware project name.

---

## Environment variables

### Core

| Variable | Default | Description |
|----------|---------|-------------|
| `HINDSIGHT_URL` | `http://localhost:8888` | Hindsight server URL |
| `HINDSIGHT_BANK_ID` | derived from cwd | Memory bank ID (isolation key) |
| `HINDSIGHT_API_KEY` | `""` | Bearer token for the Hindsight API (only needed for hosted instances) |
| `HINDSIGHT_DISABLED` | `false` | Disable both MCP and hooks for this project (alternative: `.hindsight-disabled` marker file) |
| `HINDSIGHT_DEBUG` | `false` | Emit `[Hindsight]` lines to stderr — useful for diagnosing hook behavior |

### Auto-recall hook

| Variable | Default | Description |
|----------|---------|-------------|
| `HINDSIGHT_AUTO_RECALL` | `true` | Master switch for the UserPromptSubmit hook |
| `HINDSIGHT_RECALL_BUDGET` | `mid` | `low` (fast, fewer strategies) / `mid` (balanced) / `high` (thorough, slower) |
| `HINDSIGHT_RECALL_MAX_TOKENS` | `1024` | Token budget for recalled memory block |
| `HINDSIGHT_RECALL_TYPES` | `["world","experience"]` | Which memory types to retrieve. JSON array. Available: `world`, `experience`, `observation` |
| `HINDSIGHT_RECALL_CONTEXT_TURNS` | `1` | Number of prior conversation turns included in recall query. `1` = only current prompt |
| `HINDSIGHT_RECALL_MAX_QUERY_CHARS` | `800` | Max length of the recall query string |

### Auto-retain hook

| Variable | Default | Description |
|----------|---------|-------------|
| `HINDSIGHT_AUTO_RETAIN` | `true` | Master switch for the Stop hook |
| `HINDSIGHT_RETAIN_EVERY_N_TURNS` | `10` | Throttling — retain only every Nth turn. `1` = every turn |
| `HINDSIGHT_RETAIN_OVERLAP_TURNS` | `2` | When chunked retention fires, extra turns from prior chunk for continuity |
| `HINDSIGHT_RETAIN_TOOL_CALLS` | `false` | Include `tool_use` blocks in retained transcript |
| `HINDSIGHT_RETAIN_CONTEXT` | `claude-code` | Label attached to retained memories — useful when multiple integrations write to the same bank |

### Bank persona

| Variable | Default | Description |
|----------|---------|-------------|
| `HINDSIGHT_BANK_MISSION` | `""` | One-sentence mission attached to the bank — affects how Hindsight phrases recall/reflect answers |
| `HINDSIGHT_RETAIN_MISSION` | `""` | Custom instructions for the fact-extraction LLM — `"Focus on technical decisions and explicit user preferences."` |

---

## File-based config

### `~/.hindsight/config.json` (user-wide)

```json
{
  "url": "http://localhost:8888",
  "recallBudget": "high",
  "debug": true
}
```

Applies to all projects unless overridden by project-level config.

### `<cwd>/.mcp.json` (project-level, source of truth for bank)

```json
{
  "mcpServers": {
    "hindsight": {
      "command": "node",
      "args": ["/path/to/fpl-hsmem/dist/index.mjs"],
      "env": {
        "HINDSIGHT_URL": "http://localhost:8888",
        "HINDSIGHT_BANK_ID": "billing-service"
      }
    }
  }
}
```

The plugin **reads `mcpServers.hindsight.env`** to pick up `HINDSIGHT_*`
values, even when run via the plugin (not Mode 2 setup CLI). This means
your project's `.mcp.json` is always the canonical bank declaration.

### `<cwd>/.hindsight.json` (project-level overrides)

```json
{
  "recallBudget": "low",
  "retainEveryNTurns": 5,
  "retainTags": ["{session_id}", "billing"]
}
```

Useful for project-specific tuning without modifying `.mcp.json` (which
many tools regenerate).

### `.claude/settings.local.json` (Mode 2 only)

Created by `setup.mjs`. Registers the 3 hooks for this project.
Hook-specific env vars can be set per hook:

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "hooks": [{
        "type": "command",
        "command": "node /path/to/fpl-hsmem/dist/hooks/recall.mjs",
        "timeout": 12,
        "env": {
          "HINDSIGHT_RECALL_BUDGET": "high"
        }
      }]
    }]
  }
}
```

---

## Bank ID resolution

`bankId` is derived in this order:

1. Explicit value from any config source (env, `.mcp.json`, `.hindsight.json`)
2. **Git worktree resolution** — `git rev-parse --git-common-dir`,
   then basename of the parent. All worktrees of a repo share one bank.
3. **Plain directory basename** if cwd is not a git repo

### Worktree behavior

Suppose:
- Main checkout: `/Users/me/Work/myproject`
- Worktree: `/Users/me/Work/myproject-wt1`

Both resolve to `bankId = "myproject"`. Memory does not fragment across
short-lived branches. To override and use the literal directory basename
instead, pin `HINDSIGHT_BANK_ID` in that project's `.mcp.json`.

### Monorepo workflows

Default behavior — one bank per repo, no matter how deep you `cd`.
Useful when team context is shared. If you want per-package isolation,
pin `HINDSIGHT_BANK_ID` per subdirectory via a nested `.mcp.json`.

---

## Three modes — detailed config

### Mode 1 — Plugin install

```bash
/plugin install fpl-hsmem@ForgePlan-marketplace
```

- MCP server registered via plugin's `.mcp.json`
  (`${CLAUDE_PLUGIN_ROOT}/dist/index.mjs`)
- 3 hooks registered via plugin's `hooks/hooks.json`
- 5 skills available as `/fpl-hsmem:<skill>`
- Bank ID — derived from cwd (no config needed)
- Configuration overrides — only via env vars or `~/.hindsight/config.json`

Good for: default-on across all projects with zero per-project setup.

### Mode 2 — Setup CLI

```bash
cd ~/Work/my-project
node ~/Work/forgeplan-marketplace/plugins/fpl-hsmem/dist/setup.mjs
```

Generates 3 files in the project:

| File | Purpose |
|------|---------|
| `.mcp.json` | MCP server registration with explicit `HINDSIGHT_BANK_ID` |
| `.claude/settings.local.json` | The 3 hooks (gitignored by default, or `--committed` for shared) |
| `.claude/rules/hindsight.md` | Project-level usage discipline reminder |

CLI options:

| Flag | Default | What |
|------|---------|------|
| `--bank <id>` | derived | Pin specific bank ID |
| `--url <url>` | `http://localhost:8888` | Hindsight URL |
| `--committed` | `false` | Write to `.claude/settings.json` instead of `.local` |
| `--no-hooks` | `false` | Only `.mcp.json`, skip hook registration |
| `--no-rules` | `false` | Skip writing `.claude/rules/hindsight.md` |
| `--force` | `false` | Overwrite existing files |

Good for: explicit, committed, team-visible configuration of a single
project.

### Mode 3 — Direct MCP

Edit project's `.mcp.json` manually:

```json
{
  "mcpServers": {
    "hindsight": {
      "command": "node",
      "args": ["/Users/me/Work/forgeplan-marketplace/plugins/fpl-hsmem/dist/index.mjs"],
      "env": {
        "HINDSIGHT_URL": "http://localhost:8888",
        "HINDSIGHT_BANK_ID": "experiment-2026-05"
      }
    }
  }
}
```

No hooks, no skills — just the 13 MCP tools. Bundle is standalone:
`dist/index.mjs` has no `node_modules` dependency at runtime (esbuild
bundled @modelcontextprotocol/sdk).

Good for: ephemeral / experimental use where you don't want background
hooks; or for non-Claude-Code clients that speak MCP.

---

## Opt-out

To disable Hindsight in a specific project even when the plugin is
installed:

```bash
# In the project root
touch .hindsight-disabled
```

Or via env (e.g. in `.claude/settings.local.json`):

```json
{
  "env": { "HINDSIGHT_DISABLED": "true" }
}
```

What this does:
- MCP server exits at startup → tools don't appear
- `recall.mjs` hook exits with `autoRecall = false` after detecting opt-out
- `retain.mjs` and `session-end.mjs` exit silently — nothing is written

Mode 2 / Mode 3 — just don't add the entries to `.mcp.json` /
`.claude/settings.json`. Opt-out flags are for the plugin mode.

---

## LLM providers (Hindsight server side)

`fpl-hsmem` is just an MCP client — the actual LLM for fact extraction
runs inside the Hindsight server. Provider is set when you launch the
Docker container.

| Provider | env vars |
|----------|----------|
| `claude-code` (recommended) | `HINDSIGHT_API_LLM_PROVIDER=claude-code` (no API key needed — reuses `claude auth login` credentials) |
| `openai` | `HINDSIGHT_API_LLM_PROVIDER=openai`, `HINDSIGHT_API_LLM_API_KEY=sk-...` |
| `anthropic` | `HINDSIGHT_API_LLM_PROVIDER=anthropic`, `HINDSIGHT_API_LLM_API_KEY=sk-ant-...` |
| `ollama` | `HINDSIGHT_API_LLM_PROVIDER=ollama`, `HINDSIGHT_API_LLM_BASE_URL=http://host.docker.internal:11434/v1`, `HINDSIGHT_API_LLM_MODEL=gemma3:12b` |
| `groq` | `HINDSIGHT_API_LLM_PROVIDER=groq`, `HINDSIGHT_API_LLM_API_KEY=gsk_...` |

See [Hindsight docs](https://hindsight.vectorize.io/developer/models) for
the full provider list and per-provider quirks.

---

## State files

Hooks persist runtime state under:

```
~/.hindsight/state/
├── turns.json       Per-session turn counter (used by retain throttling)
└── retention.json   Per-session message_count (used for compaction detection)
```

State files are bounded — capped at 10 000 sessions with FIFO eviction.
Safe to delete at any time; counters reset on next retain cycle.

If `CLAUDE_PLUGIN_DATA` env is set (plugin runtime), state lives there
instead — `${CLAUDE_PLUGIN_DATA}/state/`.

---

## Common configuration recipes

### Faster recall, less context bloat

```bash
HINDSIGHT_RECALL_BUDGET=low
HINDSIGHT_RECALL_MAX_TOKENS=512
```

### Retain every single turn (debugging)

```bash
HINDSIGHT_RETAIN_EVERY_N_TURNS=1
```

### Domain-tagged retains

In `.hindsight.json`:

```json
{
  "retainTags": ["{session_id}", "billing-service"],
  "retainContext": "billing"
}
```

### Custom bank persona for a backend service

```bash
HINDSIGHT_BANK_MISSION="TypeScript billing API — focus on data model changes, payment provider decisions, and currency / locale edge cases."
HINDSIGHT_RETAIN_MISSION="Extract billing-specific technical decisions, ignore generic refactoring discussions."
```

### Per-project recall budget without modifying env

In `.hindsight.json`:

```json
{
  "recallBudget": "high",
  "recallMaxTokens": 2048
}
```

---

## Verification

After any config change, restart Claude Code and run:

```
/fpl-hsmem:status
/fpl-hsmem:diagnose
```

`/fpl-hsmem:diagnose` walks all five resolution layers and shows which
source provided each value. Use it whenever bank ID or behavior doesn't
match expectations.
