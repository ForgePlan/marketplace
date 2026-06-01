# Debugging MCP — connected vs disconnected, schema-on-demand, hints

## First question: is the server even connected?

Before debugging a tool call, confirm the server is reachable. The cheapest probe is to check whether one of its tools is in the available set — a single, side-effect-free check.

```python
# One probe, no mutation — branch on the result
have_mcp = "mcp__forgeplan__forgeplan_health" in available_tools
```

This is the canonical opening move in ForgePlan's `restore` and `briefing` skills: probe once, then take the MCP-first path or the CLI fallback. **Rule**: probe once per session, not per turn. **Trap**: do not assume "the server is configured in `.mcp.json`" means "the server is connected now" — a stdio server can fail to launch (binary not on PATH, bad args) and the tools simply never appear.

## The tool name is visible but the call fails

If a tool appears **by name only** in a deferred-tools list, its parameter schema is not loaded yet — calling it directly returns an input-validation error. This is by design (schema-on-demand keeps context small on a 66-tool surface).

```
# Fetch the schema first, then the call succeeds:
ToolSearch(query="select:forgeplan_get,forgeplan_link")   # exact tools by name
ToolSearch(query="forgeplan score quality gate")          # keyword search, ranked best-match
```

**Rule**: "name visible ≠ callable." When a call fails with a schema/validation error on a tool you know exists, the fix is almost always "run `ToolSearch` to load its schema first," not "the tool is broken."

## Relay `_next_action` hints — but evaluate them

The forgeplan MCP server attaches a `_next_action` field to most responses, nudging the correct methodology step (Shape → Validate → Code → Evidence → Activate). Surface it to the user and weigh it against context — **do not execute it blindly**.

**Trap**: blind hint-following propagates bugs. forgeplan#348 shipped a `Next: forgeplan score-all` hint pointing at a **non-existent** subcommand (the real one is `forgeplan score --all`). An agent that auto-ran the literal hint would hit `error: unrecognized subcommand 'score-all'` mid-pipeline. The cookbook's rule: "Treat `_next_action` as a hint, not a command. Read it, evaluate it against your current context, then decide."

## Detect the silent bugs yourself

The dangerous MCP bugs are the **silent** ones — no error surfaces. Verify behaviour directly:

```bash
# forgeplan#350 — @filepath body trap (the silent data-loss one)
forgeplan new note "smoke" && echo "test content" > /tmp/t.md
#   mcp__forgeplan__forgeplan_update(id="NOTE-NNN", body="@/tmp/t.md")
#   mcp__forgeplan__forgeplan_get(id="NOTE-NNN")
# Expect body == "test content". If body == "@/tmp/t.md" → bug present.
```

**Rule**: for any tool that mutates state, verify the side-effect against ground truth (`forgeplan_get`) rather than trusting the success message. ForgePlan's wider discipline — generator ≠ verifier — applies here: a "Updated successfully" string is a self-report, not proof.

## When neither surface is reachable

If the MCP probe is false and `forgeplan` is not on `$PATH`, **escalate to the user**. Do not synthesize artifact state, do not invent IDs. An honest "forgeplan is not wired in this environment" beats a fabricated graph.

## Related

- `integration.md` — the deferred-tools / `ToolSearch` mechanism in full
- `gotchas.md` — the underlying bugs (#350, #353) these recipes detect
- `when-to-use.md` — the MCP-first → CLI → escalate fallback ladder
