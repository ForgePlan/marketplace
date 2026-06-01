# Tools and the denylist — the B2 paradigm

The natural intuition is to scope an agent with a `tools:` allowlist — enumerate what it CAN call. For subagents that need MCP, this is the wrong instinct, and it breaks silently. The canonical pattern (called **B2**) is a `disallowedTools:` denylist: block what must not run, inherit everything else from the parent session.

## Rule — use `disallowedTools`, never `tools`, for MCP-using subagents

A Task-dispatched subagent inherits all MCP tools from its parent session by default. The moment you specify a `tools:` allowlist, that inheritance is stripped — and you must then re-enumerate every MCP tool by exact name. Two things go wrong:

1. **Wildcards don't work.** `mcp__forgeplan__*` parses as "Unrecognized" and silently filters out the *entire* MCP server. The agent ends up with zero forgeplan tools and no error.
2. **Exact enumeration is brittle.** Miss one tool name, or the server adds a tool, and the agent is silently missing capability.

The denylist sidesteps both: you list only the handful of tools the profile must not call. Everything else — including all MCP tools — flows through by inheritance.

## Example — Profile A creator denylist

```yaml
disallowedTools: Write, Edit, NotebookEdit, mcp__forgeplan__forgeplan_activate
```

That is the whole gate. The agent inherits every forgeplan read and write tool except `forgeplan_activate`, plus all hindsight tools. The four denied entries enforce two invariants:

- `Write, Edit, NotebookEdit` — forces the agent to mutate the artifact store via MCP (`forgeplan_new`/`update`), never by writing files directly to the store's projection on disk.
- `forgeplan_activate` — activation is the gate's job, not the creator's (separation of duty).

Profile B adds `forgeplan_reason`, `forgeplan_claims`, and `memory_retain` to the denied set; Profile C-coder *inverts* the shape (allows Write/Edit/Bash, denies only the artifact-store mutations). See `profiles.md` for the per-profile sets.

## Trap — `memory: project` force-enables Write/Edit and overrides the denylist

There is a frontmatter field, `memory: project`, that looks harmless — "give the agent project memory". It is rejected outright in the marketplace, because it **force-enables `Read`, `Write`, and `Edit` regardless of `disallowedTools`**. An agent whose denylist carefully blocks `Write`/`Edit` would silently regain them the moment `memory: project` is added — a contract-breaking change that no lint catches and no error surfaces.

The lesson surfaced the hard way: a sub-agent once *reported* applying `memory: project` to five agents; on-disk check found zero actually got it. The over-report accidentally prevented a silent security regression. Cross-session memory is covered by a dedicated memory plugin (a Hindsight bank), which does not touch the tool gate. Never use `memory: project` to grant memory.

## Trap — trusting the allowlist as a security boundary

Even when `tools:` worked, it was only ever a soft gate — a misconfigured agent could still be dispatched with the wrong scope. Defence-in-depth does not live in one frontmatter field. It lives in three layers:

1. **Body Hard Rules** — procedural invariants the gate cannot express (e.g. "always identity-tag every claim", "never fake-pass a missing scanner").
2. **PreToolUse hooks** — block writes to protected paths at the harness level.
3. **Server-side enforcement** — the MCP server itself rejects anonymous or mis-tagged calls.

The denylist is one layer of several, not the whole wall. A lint rule enforces the canon: any agent that denies `forgeplan_activate` (Profiles A/B/D) MUST also deny `Write`/`Edit`/`NotebookEdit` — otherwise it could bypass MCP and write the store's files directly.

## Related

- `profiles.md` — the exact denied set per profile, and the C-coder inversion
- `frontmatter.md` — the `disallowedTools` field rules and the model field
- `examples.md` — denylists from real `coder` and `guardian` agents
- `../mcp/gotchas.md` — MCP propagation gotchas and debugging
