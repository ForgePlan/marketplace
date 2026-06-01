# antipatterns — router

The cross-topic synthesis. Four content files group the recurring mistakes by where they bite. Each file is self-contained — load one based on the user's intent, do not pre-load the rest. Every entry is a real ForgePlan finding, named → why it bites → the fix.

## Intent to file

| User asks about | Load |
|---|---|
| "CLAUDE.md mistakes", "memory: project", "force-enable past denylist", "rules without rationale" | `claude-md.md` |
| "agent design traps", "denylist holes", "grading own homework", "generator==verifier", "unverified gate" | `agents-and-tools.md` |
| "prose-only enforcement", "the @filepath body trap", "exit 127 hook", "fail-open gate" | `hooks-and-mcp.md` |
| "git add -A", "--no-verify", "force-push", "methodology cocktail", "over-reporting", "vacuous green", "catalog not bumped" | `process.md` |

## Cross-references

- This is the synthesis section — most entries point back to the per-topic section that owns the deep treatment (`../hooks/fail-closed.md`, `../mcp/gotchas.md`, `../plugins/versioning.md`).
- `claude-md/antipatterns.md` is the CLAUDE.md-*file* anti-pattern list (wall of text, stale TODOs). This section's `claude-md.md` covers the *behavioural* traps that span topics. Load both for a full CLAUDE.md audit.
- `agents-and-tools.md` and `hooks-and-mcp.md` share one spine — fail-closed enforcement. The agent side is "who verifies"; the hook side is "the gate that re-checks".

## When in doubt

Default to `process.md` — it holds the highest-frequency footguns (`git add -A`, vacuous green, the catalog bump). Default to `agents-and-tools.md` for "I'm designing an agent and want to know what NOT to do".
