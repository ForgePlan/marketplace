# Annotated agents — two real examples

Two production agents from the marketplace, dissected. `coder` is a Profile C-coder (the source writer); `guardian` is a Profile B gate (the last reviewer before activation). Between them they show both shapes of the denylist and both body structures.

## Example 1 — `coder` (Profile C-coder, the source writer)

`plugins/agents-core/agents/coder.md`. The only agent allowed to write source files.

```yaml
model: sonnet                        # mechanical work, not judgement
color: "#00897B"
disallowedTools: mcp__forgeplan__forgeplan_new, ...update, ...link, ...activate, ...
isolation: worktree                  # isolated git worktree — parallel-safe
maxTurns: 50                         # longest budget; it writes code
```

The denylist is **inverted** from a creator's: `Write`/`Edit`/`Bash` are NOT denied (coder writes real files), only the artifact-store mutations are. That inversion is how you recognise C-coder.

The body is a 6-step procedure, each step one tool call: claim the parent RFC → read the contract → implement → verify locally (`tsc`/`cargo build`/`go build` — compile/lint only, **not** the full test suite) → hand off to a reviewer → release the claim. The discipline that makes it composable:

- It claims the **RFC**, not the source files. Two coder dispatches can't race on the same spec; source changes are tracked through git, not a file claim.
- It **hands off** rather than self-reviews. "Here is the change-set, here is who should review it next (`code-reviewer` / `tester` / `security-expert`)." It physically cannot record the EVIDENCE — `forgeplan_new` is denied.
- On RFC ambiguity it **stops and hands back** to `architect`. It never silently expands scope to "make it work" — that hides a bad design behind extra code.

## Example 2 — `guardian` (Profile B, the activation gate)

`plugins/agents-pro/agents/guardian.md`. The last reviewer before the orchestrator activates anything.

```yaml
model: opus                          # judges trade-offs across an evidence chain
color: "#455A64"
disallowedTools: Write, Edit, NotebookEdit, mcp__forgeplan__forgeplan_reason,
                 mcp__forgeplan__forgeplan_claims, mcp__plugin_fpl-hsmem_hindsight__memory_retain
maxTurns: 20
```

Standard Profile B denylist: no file writes (EVIDENCE goes through MCP), no `reason` (the ADI cycle is a creator's tool, not a reviewer's), no `claims` exploration, no `memory_retain` (the EVID *is* the audit record). Note `forgeplan_activate` is absent from the agent's reach by the same canon — guardian **recommends**, the orchestrator **activates**.

The body is an 8-step procedure ending in a binary verdict: claim the artifact → read it **plus the full evidence chain** → recall prior gate failures → run validation → reason (explicitly *mental* reasoning, NOT `forgeplan_reason`) → create the EVID → fill the verdict at the top of the body → link/validate/release. The load-bearing rules:

- **Read the whole chain, not just the latest reviewer.** The worst gate failure is a BLOCKER buried in an older EVID that guardian skipped.
- **The verdict (PASS/CONCERNS/BLOCKER) lives at the top of the EVID body**, not only in the handoff — the body is the audit record; the handoff is a courtesy summary.
- **Never fake-pass a missing check.** A skipped validator under time pressure is CONCERNS with the reason recorded, never a silent PASS. Honest negative coverage is the entire point of the gate.

## The shared anatomy

Both bodies share the canonical skeleton — and any new agent should match it:

```
Header (one line: "You are X, you do Y")
## Identity & audit          — the identity tag for every claim/release
## When to invoke            — triggers + an explicit "do NOT invoke for" list
## <Procedure>               — numbered steps, one tool call each (most of the body)
## HARD RULES                — invariants the denylist can't enforce (plain **Never**/**Always**)
## Output to orchestrator     — a dense, machine-parseable handoff
## Common failures           — a failure → avoidance table
```

## Trap — HARD RULES as a style dump

HARD RULES are for invariants the denylist *cannot* express — a required call shape ("`claim` must carry the identity tag"), a required sequence, a forbidden combination. They are not a place for "use clear names" or "write good comments". Put each rule in plain bold (`**Never** …`, `**Always** …`); reserve severity icons for inline body callouts, never as bullet prefixes for the rule list. A HARD RULES section full of style advice is noise that hides the two or three load-bearing invariants.

## Related

- `profiles.md` — why `coder` and `guardian` sit in different profiles
- `tools-and-denylist.md` — the denylist shapes shown here, explained
- `frontmatter.md` — the fields in both frontmatter blocks
- `when-to-use.md` — why guardian (verifier) must be a separate agent from coder (generator)
