# MCP gotchas — where MCP and CLI quietly diverge

These are real findings from the ForgePlan production graph (forgeplan 0.32.1). Each is named, shown, and given the safe pattern. The first one is the most consequential in this entire skill.

## Gotcha 1 — the `body` literal-string trap (forgeplan#350, CRITICAL)

**The bug**: `mcp__forgeplan__forgeplan_update(id, body="@/path/to/file.md")` does **not** read the file. It writes the literal string `@/path/to/file.md` into the artifact body, overwriting everything that was there. The call returns `"message": "Updated successfully"` — **no error**. You discover the loss on the next `forgeplan_get`.

The CLI variant (`forgeplan update <ID> --body @file.md`) **does** expand `@filepath`. Agents that mirror CLI muscle-memory through MCP suffer silent data loss. Confirmed on two independent sessions 2026-05-27 (a user's repo lost 5 deltas + a full ADR body; reproduced in the marketplace sandbox).

**Canonical safe pattern** — read the file via your host, pass the content as a string:

```python
# CORRECT — host reads the file, MCP receives a literal string of content
body_text = Read(file_path="/tmp/PRD-001-body.md")
forgeplan_update(id="PRD-001", body=body_text)

# WRONG — silent data loss: writes the 16-char path as the body
forgeplan_update(id="PRD-001", body="@/tmp/PRD-001-body.md")
```

**Trap within the trap**: never start a `body` string with `@/` if the rest looks like a path. Profile A creators and Profile D maintainers are most exposed — they are the canonical body-writers. Full convention: `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` § "Critical safety convention".

## Gotcha 2 — CLI-vs-MCP argument-validation asymmetry (forgeplan#353)

The two surfaces do not validate identically. `forgeplan claim --agent <ID>` (CLI) **rejects** agent IDs containing `/`; `mcp__forgeplan__forgeplan_claim(agent=<ID>)` **accepts** them — and the MCP schema even suggests `"name/version"`. The compounding failure: an agent claimed via MCP with `agent="X/Y"` cannot be released via CLI — the validator rejects the same string, breaking the cross-surface promise.

**Rule**: assume MCP and CLI are **not** drop-in equivalents. Use dash-separated agent IDs only (`adr-architect-v1-11-1`, not `adr-architect/1.11.1`) — this stays valid on both surfaces. The general lesson: when a value round-trips across both surfaces, constrain it to the stricter surface's rules.

## Gotcha 3 — propagation and cache (mid-session staleness)

MCP servers resolve some state **once, at session start, and freeze it**. A stdio server's working directory is fixed at launch — `cd` later does not move it. Plugin/tool inventories are likewise resolved when the session opens.

**Trap**: editing `.mcp.json` mid-session does **not** hot-reload the server, exactly as editing `CLAUDE.md` mid-session does not reload context (`../claude-md/basics.md`). New server, new transport, or a freshly-installed tool surface all take effect on the **next session start**. If a tool you just wired is "not found", restart before debugging deeper.

## Gotcha 4 — the activity log is not a secret vault

Every MCP call is recorded by `forgeplan_activity`, including the `body=` field of `forgeplan_update`. **Rule**: never pass a secret, token, or key as an MCP argument that gets logged — the activity log preserves it verbatim. Secrets belong in environment variables, never in a tool argument or an artifact body.

## Related

- `integration.md` — the safe way to pass `body` (host Read → string)
- `debugging.md` — verification recipes to catch these before they bite
- `when-to-use.md` — MCP-first preference and the CLI fallback ladder
- `../claude-md/basics.md` — the same "no mid-session reload" rule for CLAUDE.md
