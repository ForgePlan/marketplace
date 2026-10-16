# MCP examples — annotated production integrations

Three real MCP integrations from the ForgePlan ecosystem, progressing from the richest (forgeplan, 66 tools) to the simplest pattern (memory). Each shows the wiring and the lesson.

---

## Example 1 — forgeplan: a 66-tool artifact graph (MCP-first)

The flagship. The assistant creates, queries, scores, and gates project artifacts mid-task — a textbook case where AI needs the tool surface, so it earns an MCP server.

### Wiring

```jsonc
// .mcp.json — installed via `forgeplan mcp install --client claude --scope project`
{ "mcpServers": { "forgeplan": { "command": "forgeplan", "args": ["serve"], "transport": "stdio" } } }
```

### The MCP-first call pattern

```python
have_mcp = "mcp__forgeplan__forgeplan_health" in available_tools   # probe once
if have_mcp:
    health = mcp__forgeplan__forgeplan_health()    # typed dict + _next_action hint
else:
    # CLI fallback — `forgeplan health` (parse stdout)
    ...
```

**Annotation**:
- stdio transport — the CLI owns the `forgeplan serve` process lifecycle.
- 66 tools means schema-on-demand: most arrive as deferred names; fetch with `ToolSearch` before calling.
- The write path obeys Gotcha 1 — body content is passed as a host-`Read` string, never `@/path` (`gotchas.md`).
- `_next_action` is surfaced, not auto-executed (`debugging.md`).

---

## Example 2 — orch: a remote project-management surface

Orchestra (tasks, messages, documents) exposes ~50 tools so the assistant can read tasks and post updates. Note the **safety boundary**: some tools are team-visible side effects.

```jsonc
{ "mcpServers": { "orch": { "url": "https://orchestra.host/sse", "transport": "sse" } } }
```

**Annotation**:
- SSE/HTTP transport — a remote, already-running server reached by URL (contrast forgeplan's local stdio).
- Tools are scoped `send_message`, `query_entities` — the scoping that denylists match.
- **Trap**: `send_message` and `delete_entity` are destructive / team-visible. Never invoke them without an explicit user request — server instructions say so, and no `disallowedTools` denylist substitutes for that judgment.

---

## Example 3 — fpl-hsmem: project-opted memory, the model decides when

Cross-session memory. The runtime registers the built client once; project identity and safety
policy live in that project's `.hindsight.json`.

```jsonc
// Direct Codex/OMP-style stdio registration. Claude Code plugin users do not duplicate this.
{ "mcpServers": { "hindsight": {
  "command": "node",
  "args": ["/absolute/path/to/fpl-hsmem/dist/index.mjs"]
} } }
```

**Annotation**:
- `.hindsight.json` supplies an explicit `url`, `banks`, `defaultBank`, token source and tool
  policy. There is no legacy bank environment selector and no implied URL.
- The initial 3.7 pilot is read-only with both automatic hooks off. Client BankGate/policy narrows
  calls but is not server authorization.
- Real secrets never belong in committed MCP config; use the bounded token mechanisms documented
  by fpl-hsmem.

---

## The through-line

All three share one shape: a typed tool surface the **model** calls, scoped `mcp__server__tool`, wired by a tool (`forgeplan mcp install`) rather than hand-edited JSON, probed MCP-first with a CLI/escalate fallback. None wraps `git` or `gh` — those stay CLI/hook concerns. That restraint is the lesson: MCP is for AI-invoked capabilities, not every integration.

## Related

- `when-to-use.md` — why these three earned a server and `git` did not
- `integration.md` — transports, scoping, `ToolSearch` shown here in practice
- `gotchas.md` — the `body` trap and secret-in-args trap referenced above
- `debugging.md` — the probe-once pattern from Example 1
