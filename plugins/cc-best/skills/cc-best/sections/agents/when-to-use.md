# When to use a subagent (and when not)

A subagent is not free. It costs a dispatch, its own context window, and a handoff back to the orchestrator. Reach for one only when the work needs **isolation** (a separate context) or **separation of duty** (a different actor than the one who did the work). Otherwise, do the work directly in the main conversation.

## Rule — dispatch a subagent for isolation or separation of duty

Dispatch when:

- **The context would pollute the main thread.** A deep research sweep, a large codebase scan, a multi-file audit — each generates noise the orchestrator does not need to keep. The subagent returns a synthesis; the raw exploration stays in its context.
- **A different actor must verify the work** (see the generator ≠ verifier rule below). The agent that wrote the code is structurally unfit to review it.
- **Parallelism helps.** Five independent reviewers (security, tests, architecture, code, docs) run concurrently, each in its own context, and the orchestrator merges the verdicts.

Do NOT dispatch when:

- The task is a single tool call or a short edit — just do it.
- The agent would need a side effect on the world (deploy, push, send a message). That is an approval gate in the orchestrating skill, never a subagent — a subagent cannot be the thing that pushes to main.
- You only need a recommendation, not a multi-step plan — a skill or a direct answer is lighter than an agent.

## The generator ≠ verifier principle

The single most important reason to use a separate reviewer agent: **the entity that produced an outcome must never be the entity that verifies it.** If the same process writes the code and signs off on it, the verification inherits the writer's blind spots — it will confirm exactly the things the writer already believed.

So a Profile C-coder writes the change and hands off; a Profile B reviewer reads the *frozen result* and records the verdict. The reviewer does not trust the coder's "done" — it checks the claim against ground truth it reads itself.

## Example — the "vacuous green" trap that proves the rule

A reviewer's dispatch prompt carries a *claim*: "coder reported done, tests pass." That sentence is generated text, not proof. The classic failure it hides:

```bash
# A green test suite says nothing if nothing changed.
git diff --quiet base..head && echo "DELTA=EMPTY"   # <- the trap
```

A test suite stays green when the diff is empty — so "tests pass" on an empty diff is a **null result, not a pass**. The reviewer must read the real diff in a clean shell, confirm the claimed change actually landed, and only then consider PASS. An empty diff on a claimed change is a BLOCKER even when every test is green and every scanner is clean.

This is why the reviewer is a separate agent: a self-reviewing coder would report the green suite as success and never look at the diff.

## Trap — building a subagent because "agents are the pattern"

A subagent is sometimes reached for as a default — "this is an agentic system, so everything is an agent." The result is over-decomposition: a chain of one-step agents passing handoffs, each paying dispatch + context cost for work the orchestrator could have done inline. The test is mechanical: if the work needs neither a separate context nor a separate actor, it does not need a subagent. Keep the orchestration in a skill and the judgement in the main thread; spend subagents on isolation and separation of duty, nothing else.

## Related

- `profiles.md` — the profile a subagent gets once you've decided to dispatch one
- `examples.md` — `guardian` showing a verifier that reads the whole evidence chain
- `tools-and-denylist.md` — why a verifier agent denies the writer's tools
- `../plugins/structure.md` — where agents vs commands vs skills live in a plugin
