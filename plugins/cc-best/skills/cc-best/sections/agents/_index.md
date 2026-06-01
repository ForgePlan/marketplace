# agents — router

Five content files. Each is self-contained — load one based on the user's intent, do not pre-load the rest. All examples come from the ForgePlan marketplace (real `agents-core` / `agents-pro` agents) and the canonical `AGENT-AUTHORING-GUIDE.md`.

## Intent to file

| User asks about | Load |
|---|---|
| "frontmatter fields", "what's required", "model", "color", "description schema" | `frontmatter.md` |
| "which profile", "creator vs reviewer", "CRUD-R-A", "maintainer", "orchestrator" | `profiles.md` |
| "tools vs disallowedTools", "denylist", "B2 paradigm", "memory: project", "MCP propagation" | `tools-and-denylist.md` |
| "do I need a subagent", "when to dispatch", "generator vs verifier", "ground truth" | `when-to-use.md` |
| "show me a real agent", "annotated example", "coder", "guardian" | `examples.md` |

## Cross-references

- `frontmatter.md` declares fields; `tools-and-denylist.md` explains why the `disallowedTools` field is a denylist, not an allowlist. Load both for "build an agent from scratch".
- `profiles.md` and `tools-and-denylist.md` overlap on the per-profile blocked set — profiles explains *which* profile, tools-and-denylist explains *what each profile denies and why*.
- `when-to-use.md` answers the prior question to all the others: should this even be a subagent? Read it before authoring.

## When the user's question spans multiple files

Pick the file with the most direct answer first. Cite the others by relative path (`see profiles.md`) — do not concatenate them into one response.

## When in doubt

Default to `when-to-use.md` for "should I write an agent for this". Default to `profiles.md` for "I'm writing an agent, where do I start".
