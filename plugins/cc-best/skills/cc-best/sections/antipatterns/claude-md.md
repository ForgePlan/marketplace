# CLAUDE.md anti-patterns — the behavioural traps

The CLAUDE.md *file* anti-patterns (wall of text, stale TODOs, no date) live in `../claude-md/antipatterns.md`. This file covers the ones that span topics — where a CLAUDE.md rule quietly fails because it leaks into agent config, omits a rationale, or describes state instead of a rule.

## A1 — `memory: project` to "give the agent memory"

**The trap**: adding `memory: project` to an agent's frontmatter so it can recall across sessions.

**Why it bites**: Anthropic's docs confirm `memory: project` **force-enables `Read`/`Write`/`Edit`, overriding the `disallowedTools` denylist**. A Profile A/B/D agent whose whole contract is "no direct file writes — go through MCP" silently regains `Write`, breaking the B2 paradigm and the LR-8 lint invariant. The regression is invisible: the agent still looks correct on paper. In Sprint Q a sub-agent *reported* applying it to 5 agents; the Sprint R audit found 0 on disk — the over-report accidentally spared us a contract-breaking change.

**The fix**: never use `memory: project` on a denylist agent. Cross-session memory is Hindsight's job (per-project bank), which does not touch the tool surface. The field is **REJECTED by design** in this marketplace. Reference: repo CLAUDE.md "Anomaly #21"; `../agents/_index.md` (and `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` for the canon).

## A2 — rules without rationale for non-obvious constraints

**The trap**: `Never use git add -A` or `Always run the validation script` with no WHY.

**Why it bites**: an assistant follows a rule it understands and silently overrides one it does not when a situation "seems like an exception". A bare prohibition is the weakest possible boundary — the first plausible edge case defeats it.

**The fix**: one-phrase rationale inline (`git add -A — stage specific files only (avoids committing .env, generated artifacts, large binaries)`). Full treatment in `../claude-md/antipatterns.md` Antipattern 10.

## A3 — transient state masquerading as a durable rule

**The trap**: "Currently working on the auth refactor", "Sprint X in progress — don't touch src/auth/".

**Why it bites**: CLAUDE.md loads in full every session and cannot be diffed between sessions. Transient state goes stale the moment it changes — usually before the next session — and the assistant then operates on false context. This is the same root cause as the "no mid-session reload" rule for MCP (`../mcp/gotchas.md` Gotcha 3): the file is a frozen snapshot, so put only durable facts in it.

**The fix**: durable rules in CLAUDE.md; transient state in a GitHub issue, a forgeplan NOTE, or the live conversation. If "don't touch this module" must persist, write it as a rule with a reason and a pointer, not a status line. See `../claude-md/antipatterns.md` Antipattern 6.

## A4 — a "defer" with no tracker row

**The trap**: deciding to postpone something ("file an upstream issue then wait", "skip this non-goal") and recording it only in prose in an EVID or a chat reply.

**Why it bites**: a defer that lives only in prose is indistinguishable from a defer that was **forgotten**. Nobody re-checks it; the upstream issue closes and no one notices; the date passes silently. The decay tooling cannot scan prose.

**The fix**: every defer lands as a row in the deferred-items tracker (NOTE-013 here) in the same sprint — `- [ ] **Kind**: issue|metric|date|event — description — source — last_checked`. The `/decay-watch` skill and the SessionStart hook then surface it when the trigger fires. Reference: repo CLAUDE.md "Defer discipline (Sprint Z5 — PRD-056)".

## Related

- `../claude-md/antipatterns.md` — the file-level CLAUDE.md anti-patterns (wall of text, stale TODOs, no date)
- `agents-and-tools.md` — why A1 breaks the denylist contract specifically
- `process.md` — A2's `git add -A` as a forbidden-list entry
