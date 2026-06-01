# MCP integration — declaring servers, transports, tool scoping

## Declaring a server

MCP servers are declared in `.mcp.json` (project scope, travels with the repo) or `~/.claude.json` (user scope, host-personal). A plugin can also ship a `.mcp.json` in its root.

```jsonc
// .mcp.json — minimal stdio server
{ "mcpServers": { "forgeplan": { "command": "forgeplan", "args": ["serve"], "transport": "stdio" } } }
```

**Rule**: prefer a tool over hand-editing JSON when the server ships one. ForgePlan's canonical wiring is `forgeplan mcp install --client claude --scope project` — idempotent, smart-merge (preserves existing `hindsight` / `orch` blocks), safe to re-run. Hand-editing risks clobbering a sibling server's entry.

**Trap**: project-scope `.mcp.json` is shared with the team; user-scope is not. Wiring a personal server (a local experiment) into project scope leaks a dependency every teammate must now have installed. Match scope to audience — same logic as the CLAUDE.md tiers (`../claude-md/hierarchy.md`).

## stdio vs SSE transports

| Transport | When | Shape |
|---|---|---|
| **stdio** | Local process the CLI launches and pipes to | `"command": "forgeplan", "args": ["serve"]` |
| **SSE** / HTTP | Remote or already-running server over a URL | `"url": "https://host/sse", "transport": "sse"` |

stdio is the default for local tools (forgeplan, hindsight) — the CLI owns the process lifecycle. SSE/HTTP is for a server you connect to over the network. **Trap**: a stdio server inherits its working directory **from the CLI at launch** and that cwd is frozen for the session — if you `cd` mid-session the server does not follow. Restart the session to re-anchor.

## Tool-name scoping

Every MCP tool is namespaced `mcp__<server>__<tool>`:

```
mcp__forgeplan__forgeplan_get      server = forgeplan,  tool = forgeplan_get
mcp__orch__send_message            server = orch,       tool = send_message
```

This scoping is what `disallowedTools` denylists match against. A Profile B reviewer agent denies `mcp__forgeplan__forgeplan_activate` by its fully-scoped name — see the CRUD-R-A profiles in `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md`. **Rule**: when you reference a tool in an agent frontmatter or a skill, always use the full `mcp__server__tool` form — the bare `forgeplan_get` is not a valid match target.

## Deferred tools and ToolSearch (schema-on-demand)

Large MCP surfaces are not all loaded up front. forgeplan ships **66 MCP tools**; loading every schema would burn context. Instead the harness lists deferred tools **by name only** — the parameter schema is fetched on demand.

```
# A deferred tool is visible by name but NOT yet callable — its schema is unloaded.
# Fetch the schema first, then call:
ToolSearch(query="select:forgeplan_get,forgeplan_update")   # loads exact schemas
ToolSearch(query="forgeplan health anomalies")              # keyword search, ranked
```

**Rule**: if a tool name appears in the deferred list but you call it without fetching its schema, the call fails with an input-validation error. Run `ToolSearch` first. The cookbook states it plainly: "Schema lives in the MCP tool description itself (via `ToolSearch` for deferred MCP tools)."

**Trap**: do not guess a deferred tool's parameters from its name. `forgeplan_new` vs `forgeplan_generate` take different arguments; only the fetched schema is authoritative.

## Cross-CLI portability

MCP is a standard, so the same server wires into any MCP-capable CLI — only the config file differs: `.mcp.json` (Claude Code), `~/.gemini/settings.json` (Gemini), `~/.codex/config.toml` (Codex). `forgeplan mcp install --client <name>` writes the right shape per client. This is why ForgePlan declares its tool surface once and reaches Claude Code, Gemini, Codex, and Goose.

## Related

- `when-to-use.md` — whether to add the server at all
- `debugging.md` — confirming the server connected; using `ToolSearch` to recover
- `gotchas.md` — surface asymmetries once connected
- `../claude-md/hierarchy.md` — project vs user scope, same tier logic
