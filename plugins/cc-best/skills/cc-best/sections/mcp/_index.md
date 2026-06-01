# mcp — router

Five content files. Each is self-contained — load one based on the user's intent, do not pre-load the rest.

## Intent to file

| User asks about | Load |
|---|---|
| "should I use MCP", "MCP vs CLI vs hook", "when to integrate", "tool surface for AI" | `when-to-use.md` |
| "declare a server", "stdio vs SSE", "tool-name scoping", "deferred tools", "ToolSearch" | `integration.md` |
| "the @filepath body trap", "CLI and MCP behave differently", "silent data loss", "cache" | `gotchas.md` |
| "MCP not connected", "probe the tool list", "schema-on-demand", "_next_action hint" | `debugging.md` |
| "show me a real MCP integration", "annotated production example" | `examples.md` |

## Cross-references

- Gotchas reference integration ("the right way to pass `body`") and debugging ("how to detect the bug yourself").
- Debugging explains the deferred-tools / `ToolSearch` mechanism that `integration.md` introduces — load it when a tool name is visible but the call fails.
- When-to-use decides MCP vs CLI; gotchas explains why the two surfaces are NOT interchangeable.

## When the user's question spans multiple files

Pick the file with the most direct answer first. Cite the others by relative path (`see gotchas.md`) — do not concatenate them into one response.

## When in doubt

Default to `when-to-use.md` for "should I" questions. Default to `gotchas.md` for "why did my MCP call lose data" — that is the most consequential trap in this section.
