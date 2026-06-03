# Cross-CLI setup

ForgePlan Marketplace is **CLI-agnostic**. The same plugins, skills, and the
forgeplan MCP server work across any agent CLI that speaks the MCP standard
and/or the [agents.md](https://agents.md) standard.

This guide is the per-CLI setup companion to the root
[`AGENTS.md`](../AGENTS.md) - the cross-CLI primary context file. Where this
doc and `AGENTS.md` disagree, `AGENTS.md` is the source of truth for cross-CLI
concerns and `CLAUDE.md` is the source of truth for Claude-Code specifics.

Three things travel across CLIs, and they cross at different maturity levels:

| Surface | Cross-CLI today? | How |
|---|---|---|
| **MCP server** (forgeplan tools) | Yes - any MCP client | Section (a) |
| **Skills** (plugin knowledge bases) | Yes - any agentskills.io client | Section (b) |
| **Agents / commands / hooks** | No - Claude-Code-native today | Section (c) |

---

## (a) MCP - connect the forgeplan MCP server

Any CLI with an MCP client can connect to the forgeplan MCP server. The server
is launched as a stdio process: command `forgeplan`, args `serve`.

### Canonical wiring command (preferred)

`forgeplan mcp install` is the supported, idempotent, smart-merge way to
register the forgeplan MCP server. Smart-merge preserves existing entries
(`hindsight`, `orch`, any other MCP servers); re-running is safe - already-correct
configs are no-ops. Prefer this over editing config files by hand.

```bash
# Claude Code (project-scope - wiring travels with the repo)
forgeplan mcp install --client claude --scope project

# Claude Code (user-scope - every project sees forgeplan, host-personal)
forgeplan mcp install --client claude --scope user

# Cursor / Windsurf
forgeplan mcp install --client cursor   --scope project
forgeplan mcp install --client windsurf --scope project

# Dry-run (recommended on a populated .mcp.json the first time)
forgeplan mcp install --client claude --scope project --dry-run
```

Verify the command's current sub-commands with `forgeplan mcp --help` - as of
forgeplan 0.32.1 the available sub-commands are `serve` and `install` only.
`forgeplan mcp-manifest` (one call generates all client configs) is planned as
the Batch F deliverable per RFC-003 but is **not yet shipped**; until then, run
`forgeplan mcp install` once per client target.

### Per-client config (what the command writes, or write by hand)

For CLIs that `forgeplan mcp install` targets directly (Claude Code, Cursor,
Windsurf), use the command above. For the others, the config files below carry
the same stdio shape (command `forgeplan`, args `serve`).

**Claude Code** - `.mcp.json` (project scope) or `~/.claude.json` (user scope):

```jsonc
{ "mcpServers": { "forgeplan": { "command": "forgeplan", "args": ["serve"], "transport": "stdio" } } }
```

**Gemini CLI** - `~/.gemini/settings.json`:

```jsonc
{ "mcpServers": { "forgeplan": { "command": "forgeplan", "args": ["serve"] } } }
```

**Codex CLI** - `~/.codex/config.toml`:

```toml
[mcp_servers.forgeplan]
command = "forgeplan"
args = ["serve"]
```

**OpenCode** - `opencode.json` (the `mcp` block). OpenCode registers stdio MCP
servers under its `mcp` key; supply the same launch shape (command `forgeplan`,
args `serve`). Follow OpenCode's current `mcp` schema for the exact field
layout; the ForgePlan side never changes - it is always the `forgeplan serve`
stdio process.

**Goose** - `config.yaml` (the `extensions` block). Goose registers MCP servers
as stdio "extensions"; supply the same launch shape (command `forgeplan`,
args `serve`). Follow Goose's current `extensions` schema for the exact field
layout.

> OpenCode and Goose are MCP-capable clients the marketplace targets, but their
> exact config-file field layout is owned by those tools' own standards and is
> not pinned in `AGENTS.md`. The invariant ForgePlan guarantees is the launch
> shape (`forgeplan serve`, stdio); map it into each client's documented MCP
> config key.

After wiring, every CLI gets the same forgeplan tool surface (`forgeplan_health`,
`forgeplan_list`, `forgeplan_new`, `forgeplan_reason`, etc.). ForgePlan declares
its tool surface once and reaches Claude Code, Cursor, Windsurf, Gemini, Codex,
OpenCode, and Goose.

### MCP vs CLI parameter safety (load-bearing)

The MCP `body` parameter of `forgeplan_update` (and other body-accepting tools)
is a **literal string only** - it does NOT parse the `@/path/to/file.md` syntax
that the CLI shell variant supports. Passing `body="@/path/file.md"` writes the
literal string and silently overwrites the artifact body (confirmed on forgeplan
0.32.1, [forgeplan#350](https://github.com/ForgePlan/forgeplan/issues/350)). Safe
pattern on any CLI: read the file with the host's file-read primitive, pass the
loaded content as a literal string. CLI shell calls (`forgeplan update <ID>
--body @file.md`) do parse `@filepath` correctly - the asymmetry is the bug. See
`AGENTS.md` "MCP vs CLI parameter semantics" for the full table.

---

## (b) Skills - `.agents/skills/` interop directory

Plugins publish their skills in two locations:

- `plugins/<name>/skills/` - the Claude Code path (existing).
- `plugins/<name>/.agents/skills/` - the interop alias (agentskills.io standard).
  Each entry is a relative symlink to the existing skill
  (`<skill> -> ../../skills/<skill>`), so there is exactly one copy of every
  skill body on disk; the `.agents/` path is a discovery alias, not a duplicate.

Any CLI with agentskills.io support loads skills from `.agents/skills/` -
including Cursor, Windsurf, Cline, Codex, Gemini, OpenCode, Goose, and Kilo.
This makes **all** plugin skills discoverable cross-CLI: a Russian- or
English-speaking user on any of those clients reaches the same skill bodies a
Claude Code user does.

The symlinks are relative (never absolute), so they resolve correctly after a
fresh clone on any machine and never leak a developer's home path.

---

## (c) What is NOT yet cross-CLI

**Agents, commands, and hooks are Claude-Code-native today.**

- **Agents** (`plugins/<name>/agents/*.md`) - Claude Code subagent format
  (frontmatter `tools` / `disallowedTools` denylist per the PRD-026 B2 paradigm).
  Other CLIs dispatch through their own agent layers; the skill bodies an agent
  orchestrates are portable Markdown, but the agent definition itself is not yet
  emitted in a cross-CLI format.
- **Commands** (`plugins/<name>/commands/*.md`) - Claude Code slash-command
  format. No cross-CLI equivalent is shipped yet.
- **Hooks** (`plugins/<name>/hooks/hooks.json`) - Claude Code hook events
  (`PreToolUse`, `PostToolUse`, `SessionStart`, etc.). Other CLIs have their own
  automation primitives; no cross-CLI hook emit is shipped yet.

**Roadmap.** Cross-CLI emit for agents/commands/hooks is the Tier-1 / Tier-2
work, tracked under the multi-agent multi-CLI architecture (RFC-003, four layers:
dispatch / agents / memory / cross-CLI) and the AGENTS.md cross-CLI section.
Until that lands, the portable surface is **MCP tools + skills**; agents,
commands, and hooks remain Claude-Code-first.

One thing already bridges all CLIs at the orchestration layer: **smith**, the
master-orchestrator. Its routing logic is declared in `AGENTS.md` so the same
"what do I do now?" entry-point is discoverable by Claude Code, Cursor, Gemini,
Codex, OpenCode, and Goose via the agents.md standard, even though each CLI
invokes it through its own dispatch primitive.

---

## References

- Root cross-CLI context: [`AGENTS.md`](../AGENTS.md) (Cross-CLI compatibility,
  Skills interop directory, Agent identity, MCP vs CLI parameter semantics).
- agents.md standard: <https://agents.md> (Linux Foundation, December 2025).
- Multi-agent multi-CLI architecture: RFC-003 (dispatch / agents / memory /
  cross-CLI layers).
- Claude-Code specifics (hooks, settings.json, skill directory layout):
  [`../CLAUDE.md`](../CLAUDE.md).
