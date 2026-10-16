# Cross-CLI setup

ForgePlan Marketplace publishes portable skills and the forgeplan MCP server.
Clients consume the surfaces they support: MCP compatibility does not imply
plugin, command, agent or hook compatibility.

This guide is the per-CLI setup companion to the root
[`AGENTS.md`](../AGENTS.md) - the cross-CLI primary context file. Where this
doc and `AGENTS.md` disagree, `AGENTS.md` is the source of truth for cross-CLI
concerns and `CLAUDE.md` is the source of truth for Claude-Code specifics.

Three things travel across CLIs, and they cross at different maturity levels:

| Surface | Cross-CLI? | How |
|---|---|---|
| **MCP server** (forgeplan tools) | Yes - any MCP client | Section (a) |
| **Skills** (plugin knowledge bases) | Yes - any agentskills.io client | Section (b) |
| **Agents / commands / hooks** | Runtime-specific | Claude Code and compatible OMP plugin loaders; other clients need their own adapters. Do not infer hook or permission equivalence. |

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
Per-client `forgeplan mcp install` is the **terminal supported path** — one run
per client target. `forgeplan mcp-manifest` (a one-call generator) is an upstream
convenience this marketplace makes no commitment to (ADR-025).

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

Clients with agentskills.io discovery can load skills from `.agents/skills/`.
The aliases above publish the portable bodies; they do **not** install plugin
payloads into a consuming project or register Claude agents in another runtime.
A user reaches the same skill body only after installing it into a discovery
location supported by that client.

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

### Primary C4 in each runtime

The primary C4 entrypoint is the portable [`structurizr-c4` skill](../plugins/structurizr-c4/skills/structurizr-c4/SKILL.md). Its [ForgePlan contract](../plugins/structurizr-c4/skills/structurizr-c4/references/forgeplan.md) defines delivery and independent acceptance; this setup section does not replace it.

| Runtime | Installation and invocation |
|---|---|
| Claude Code | `/plugin install structurizr-c4@ForgePlan-marketplace` installs the full plugin. Invoke `/structurizr-c4:c4-build` or `/structurizr-c4:c4-review`; orchestrators dispatch `structurizr-c4:structurizr-architect`. |
| OMP | First register `omp plugin marketplace add ForgePlan/marketplace`; if already registered, use `omp plugin marketplace update forgeplan-marketplace` instead. Then `omp plugin install --scope project structurizr-c4@forgeplan-marketplace`. In a fresh session, use the same namespaced build/review commands, `/skill:structurizr-c4`, or `skill://structurizr-c4`. OMP's native task-agent name is **`structurizr-architect`**, without a plugin prefix. It loads the compatible plugin format and discards Claude model aliases rather than requiring Claude credentials. For an uninstalled checkout: `omp --plugin-dir <plugin-directory>`. |
| Codex | Install the portable skill into the project's `.agents/skills/structurizr-c4` (or another supported skill-discovery root). Invoke `$structurizr-c4` and use a native worker with the contract's architecture-only write scope. The optional TOML adapter is not automatically registered as a role. |
| Other agents | Install the entire `skills/structurizr-c4/` directory via the host's skill mechanism, or explicitly read its `SKILL.md`; then use native file/CLI/browser tools. No Claude commands, subprocess or credentials are needed. Skill installation does not automatically register a dedicated agent. |

The catalog's `targets: ["claude-code", "omp"]` lists native plugin adapters, not a restriction on the portable workflow. File read/write, local command execution, the official Structurizr runtime and browser automation are the capability contract for any consumer. If browser verification is unavailable, report an unverified draft rather than closing the C4 row. Client-specific permission controls must preserve architecture-only writes; a Claude `disallowedTools` declaration is not a universal sandbox.

For a local checkout, keep the whole plugin payload (skill references, scripts and assets included), then link the canonical skill into the consumer project. For example, from that project's root:

```bash
# Point this at the installed/checked-out plugin, not a fixed cache version.
STRUCTURIZR_PLUGIN=/absolute/path/to/forgeplan-marketplace/plugins/structurizr-c4
mkdir -p .agents/skills
# Only create when the destination is absent; preserve an existing installation.
test ! -e .agents/skills/structurizr-c4 && test ! -L .agents/skills/structurizr-c4 &&
  ln -s "$STRUCTURIZR_PLUGIN/skills/structurizr-c4" .agents/skills/structurizr-c4
```

Use a relative link when the installed payload shares a stable project-relative location. Confirm discovery in a fresh session; the plugin's own `.agents/skills` alias is publisher-side only, not a global installation. `cross-runtime.mjs` repairs project discovery links; it does not download this payload or register the Codex TOML adapter.

Native delivery needs `structurizr`, `python3` and browser access for viewer/export checks. Install prerequisites explicitly using official instructions (macOS: `brew install structurizr`); loading the plugin does not install Java or system packages. Models belong in the consuming project, not the installed plugin. Missing runtime/browser checks leave an unverified draft; Mermaid is not a C4 fallback. Producer-side review/repair does not replace independent Profile B review.

---

## (c) What is Claude-Code-native by design

**The published agents, commands and hooks use Claude Code formats; that is not a claim that only Claude Code can load them (ADR-025).** OMP can discover compatible plugin agents and commands directly. No second generated agent/hook format is introduced by that compatibility.

- **Agents** (`plugins/<name>/agents/*.md`) use Claude Code frontmatter.
  OMP loads these plugin agents under their frontmatter `name` and discards
  Claude model aliases; other clients dispatch through their own agent layers.
  Portable workflow bodies remain in skills. Do not assume identical tool
  permissions merely because a role was discovered.

  **The denylist does not travel, and its absence is silent.** `disallowedTools`
  is a Claude Code key — verified absent from the OMP binary entirely. 42 agents
  here carry a denylist and every one denies `forgeplan_activate`; in a runtime
  without the key, none of that holds and nothing errors. Any invariant that
  matters is therefore also stated as a HARD RULE in the agent body, which is the
  only part that travels. See the "Denylists are Claude Code-only" section of
  `AGENT-AUTHORING-GUIDE.md` before writing a new agent.

- **Commands** (`plugins/<name>/commands/*.md`) use Claude Code slash-command
  format, also loaded by OMP with the plugin namespace. Codex uses skills
  instead; OpenCode reads `.opencode/commands`, not `.claude/commands`.
  Therefore a slash command alone is not a portable entrypoint.

  **The pattern that works**: ship the command *and* a skill that points at it —
  the skill carries the trigger description plus the irreducible core, and says
  "read the command file and follow it". One source of truth, discoverable from
  the portable path. Four synchronised copies of a 200-line router is a promise
  nobody keeps past the second edit.
- **Hooks** (`plugins/<name>/hooks/hooks.json`) - Claude Code hook events
  (`PreToolUse`, `PostToolUse`, `SessionStart`, etc.). Other CLIs have their own
  automation primitives; no cross-CLI hook emit is shipped, and none will be
  built without a new decision — a concrete request opens one (ADR-025 Trigger 2).

**Posture (ADR-025).** The portable surface is **MCP tools + skills + AGENTS.md**
— by design and terminally, as compliance with open standards (MCP,
agentskills.io, AGENTS.md), not as Tier 0 of a deferred adapter programme.
The adapter source format remains Claude-Code-native, with **no separate
cross-CLI emit by decision**; compatible consumers such as OMP may load it
directly. A new emitted format requires a new decision (ADR-025 supersedes ADR-014).

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
