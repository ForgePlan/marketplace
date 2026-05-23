# claude-md — router

Six content files. Each is self-contained — load one based on the user's intent, do not pre-load the rest.

## Intent to file

| User asks about | Load |
|---|---|
| "what is CLAUDE.md", "where does it live", "lifecycle" | `basics.md` |
| "global vs project", "user-private", "load order", "conflict resolution" | `hierarchy.md` |
| "file anatomy", "section ordering", "conventions", "language rules" | `structure.md` |
| "good patterns", "what to copy", "production-ready examples" | `patterns.md` |
| "common mistakes", "what NOT to do", "anti-patterns" | `antipatterns.md` |
| "show me real examples", "annotated production CLAUDE.md" | `examples.md` |

## Cross-references

- Anti-patterns reference patterns ("the right way") and structure ("which section breaks").
- Examples illustrate basics + structure + patterns together — load `examples.md` for big-picture mental model.
- Hierarchy explains why the same word in `~/.claude/CLAUDE.md` and `<repo>/CLAUDE.md` can mean different things.

## When the user's question spans multiple files

Pick the file with the most direct answer first. Cite the others by relative path (`see patterns.md`) — do not concatenate them into one response.

## When in doubt

Default to `basics.md` for first-touch questions. Default to `examples.md` for "show me what good looks like".
