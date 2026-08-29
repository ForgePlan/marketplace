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

**This is gated, not trusted.** `interop-skills-check` asserts that every skill has an
alias, that each alias is a symlink rather than a copied directory, that each one resolves,
and that no stale entries remain. Add a skill, then run `node scripts/gen-interop-skills.js`.

The gate exists because the convention had drifted without anyone noticing: five plugins
had no interop directory at all and the flagship carried 22 aliases for 41 skills — 34
skills unreachable in the runtimes that read only this path. Nothing reported it, because
absence is exactly what these runtimes cannot distinguish from "no such skill".

---

## (b2) Consuming this marketplace from another runtime

The section above is the **producer** side — what this repo publishes. This is the
**consumer** side: what a project that installs these plugins does so its agents can see
them.

**Do not do this by hand.** `fpl-skills` ships a tool that detects which runtimes are
installed, reports what each one can and cannot see, and creates the missing links:

```bash
node "$CLAUDE_PLUGIN_ROOT/scripts/cross-runtime.mjs"           # report
node "$CLAUDE_PLUGIN_ROOT/scripts/cross-runtime.mjs" --fix     # wire it
node "$CLAUDE_PLUGIN_ROOT/scripts/cross-runtime.mjs" --strict  # exit 1 on any gap (CI)
```

Run from the root of the project being wired. Zero dependencies. The skill wrapper is
`/cross-runtime`.

It creates **relative** symlinks (they survive a clone and never leak a home path), and it
**deletes nothing**: a real directory where a link belongs is reported as `BLOCKED` because
it may hold edits that were never in the source, and MCP config is printed as a command
rather than written, because that file can be user-scoped or shared.

For reference, the wiring it produces:

| Link | Serves |
|---|---|
| `.agents/skills -> .claude/skills` | Codex (only path it reads), OMP, any agents.md client |
| `.opencode/skills -> .claude/skills` | OpenCode |
| `.opencode/commands -> .claude/commands` | OpenCode (it does not read `.claude/commands`) |

`npx skills` (vercel-labs) is the ecosystem's general-purpose installer and solves the
adjacent problem — pulling skills *from* many sources across ~70 agents, symlinking each to
one canonical copy. Use it for that. It does not know about this project's `.claude/`
layout, which is what the tool above wires.

Prefer symlinks over copies either way: a copy forks silently on the next edit, and nothing
tells you which of the two an agent actually read.

---

## (c) What is NOT yet cross-CLI

**Agents, commands, and hooks are Claude-Code-native today.**

- **Agents** (`plugins/<name>/agents/*.md`) - Claude Code subagent format
  (frontmatter `tools` / `disallowedTools` denylist per the PRD-026 B2 paradigm).
  Other CLIs dispatch through their own agent layers; the skill bodies an agent
  orchestrates are portable Markdown, but the agent definition itself is not yet
  emitted in a cross-CLI format.

  **The denylist does not travel, and its absence is silent.** `disallowedTools`
  is a Claude Code key — verified absent from the OMP binary entirely. 42 agents
  here carry a denylist and every one denies `forgeplan_activate`; in a runtime
  without the key, none of that holds and nothing errors. Any invariant that
  matters is therefore also stated as a HARD RULE in the agent body, which is the
  only part that travels. See the "Denylists are Claude Code-only" section of
  `AGENT-AUTHORING-GUIDE.md` before writing a new agent.

- **Commands** (`plugins/<name>/commands/*.md`) - Claude Code slash-command
  format. Codex deprecated custom prompts in favour of skills and has no command
  directory at all; OpenCode reads `.opencode/commands`, not `.claude/commands`.
  So a plugin whose entry point is a slash command is a plugin those two runtimes
  cannot start.

  **The pattern that works**: ship the command *and* a skill that points at it —
  the skill carries the trigger description plus the irreducible core, and says
  "read the command file and follow it". One source of truth, discoverable from
  the portable path. Four synchronised copies of a 200-line router is a promise
  nobody keeps past the second edit.
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

## (d) Portability traps — all four fail silently

Each of these was found by running this marketplace in a second runtime, and each one
presents as something other than what it is. That is the common thread: none of them
raises an error, so the reader reaches a wrong conclusion instead of a stack trace.

| Trap | What you see | What it actually is |
|---|---|---|
| **Tool-name prefix** | "the MCP server is not connected" | `mcp__server__tool` is Claude Code's spelling; OMP collapses it to one underscore. The server is fine. Write tool names **bare** in prose — correct in both. Check the host's `/mcp` listing before concluding an outage. |
| **Catalog name** | "Missing or invalid field `name`" | The field is present. OMP validates it against lowercase-kebab and rejects the whole catalog over a capital letter. Hence the generated `.omp-plugin/marketplace.json`. |
| **Denylist** | nothing at all | The key does not exist outside Claude Code, so every denial silently lapses. The invariant has to be in the body. |
| **Missing skill alias** | "no such skill" | The skill exists but has no `.agents/skills` entry, and Codex reads only that path. Gated now. |

The shape is the same every time: **a runtime difference that reads as a fault in the
thing being used.** When something appears absent in a second runtime, check how that
runtime spells or discovers it before concluding it is broken.

---

## References

- Root cross-CLI context: [`AGENTS.md`](../AGENTS.md) (Cross-CLI compatibility,
  Skills interop directory, Agent identity, MCP vs CLI parameter semantics).
- agents.md standard: <https://agents.md> (Linux Foundation, December 2025).
- Multi-agent multi-CLI architecture: RFC-003 (dispatch / agents / memory /
  cross-CLI layers).
- Claude-Code specifics (hooks, settings.json, skill directory layout):
  [`../CLAUDE.md`](../CLAUDE.md).
