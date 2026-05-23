# mcp — STUB

> **Status**: not yet authored. Coming in **RFC-008**.

This section will cover:

- When to use MCP vs CLI vs hook
- Server vs client roles and what each can do
- Propagation gotchas (the Anthropic #53865 `tools:` allowlist trap)
- Debugging connected vs disconnected states (PROB-072 — MCP cwd frozen at startup)
- Real production MCP integrations from ForgePlan (`forgeplan`, `hindsight`, `orch`)

Until shipped, see:

- Anthropic MCP specification.
- `.mcp.json` files in plugin roots for connection patterns.
- `forgeplan` upstream issues #303, #325 for known limitations.
