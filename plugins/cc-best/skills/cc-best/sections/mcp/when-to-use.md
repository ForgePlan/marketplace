# When to use MCP — a tool surface for AI, not every integration

## What MCP is, in one sentence

The Model Context Protocol (MCP) lets Claude Code call an external system through a **typed tool surface** — each capability appears as a named tool (`mcp__forgeplan__forgeplan_get`) the assistant can invoke directly, instead of you shelling out and parsing text.

## The decision: integrate MCP only when AI needs the tool surface

The rule is narrow: **add an MCP server when the assistant itself will call the capability mid-task.** MCP is a surface for the model, not a generic integration bus.

| Situation | Use |
|---|---|
| The assistant creates/queries artifacts while reasoning (forgeplan) | **MCP** — typed calls, observed by activity log |
| The assistant recalls cross-session memory (hindsight) | **MCP** — the model decides when to recall |
| A human runs a one-off command in a terminal | **CLI** — no MCP needed |
| A deterministic step in CI / a script | **CLI** or a hook — not MCP |
| Run lint after every Edit | **Hook** (`hooks.json`), not MCP — see `../hooks/_index.md` |

**Trap**: wrapping a CLI in an MCP server "to be thorough" adds a tool surface the model must now reason about every turn. If no AI decision point calls it, you have paid context cost for nothing. ForgePlan does NOT MCP-wrap `git` or `gh` — those are CLI/hook concerns; only the artifact graph (forgeplan) and memory (hindsight) earn an MCP surface.

## MCP-first preference (when a server IS wired)

Once a server is wired, prefer its MCP tools over the equivalent CLI for AI-driven work. ForgePlan's canonical phrasing, repeated across `restore`, `briefing`, and the cookbook: probe **MCP-first**, fall back to CLI when the MCP surface is absent.

Why MCP-first for artifact work:
- MCP returns **typed dicts** with `_next_action` hints — no fragile stdout parsing.
- Every MCP call is **observed automatically** by `forgeplan_activity`.
- MCP respects agent-frontmatter `disallowedTools` denylists — a Profile B reviewer physically cannot call `forgeplan_activate`.

## The fallback ladder

```
1. MCP wired?   → prefer mcp__<server>__* tools.
2. CLI on PATH? → fall back (e.g. `forgeplan health`).
3. Neither?     → escalate to the user. Do NOT invent intermediate state.
```

**Trap**: never silently skip the capability when both surfaces are missing. The cookbook is explicit — "Do not invent intermediate state." A made-up artifact ID is worse than an honest "forgeplan is not reachable here."

## Related

- `integration.md` — how to declare a server, transports, tool-name scoping
- `gotchas.md` — why MCP and CLI are NOT drop-in equivalents (the `body` trap)
- `debugging.md` — probing whether a server is actually connected
- `examples.md` — ForgePlan's three real MCP integrations
