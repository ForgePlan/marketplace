---
name: team
description: Foundational skill for launching multi-agent teams — TeamCreate vs parallel Task() (sub-agents), team-lead vs teammate roles, file ownership, dynamically spawning new agents for additional work, cleanup. Used as the base layer by other multi-agent skills (research, audit, sprint, wave) or directly when the user asks to parallelize a task. Triggers (EN/RU) — "create agent team", "run agents in parallel", "team up", "split work across agents", "распараллель", "запусти команду агентов", "team up", "/team-up".
---

# Agent Team Orchestration

The base layer for running multi-agent teams in Claude Code. Defines the iron
rules for coordination, mode selection (Agent Teams vs sub-agents), file
ownership, and recipes for typical tasks. Other multi-agent skills
([`research`](../research/SKILL.md), [`audit`](../audit/SKILL.md),
[`sprint`](../sprint/SKILL.md)) reference this skill — the shared rules live here.

---

## When to Use

- The task is naturally parallel (research across multiple sources, review of
  multiple packages).
- A single task's context is too big for one agent — split it by domain.
- The user says "распараллель", "запусти команду", "team up".
- Used as a dependency by other skills (audit, research, sprint).

## When Not to Use

- The task is linear and fits in one context — single-thread is faster.
- A change in one file / one function — coordination costs more than the work.
- No independent blocks of work — every step depends on the previous one.

---

## Iron Rules (breaking any = failure)

1. **`TeamCreate` is the only spawn path** when available. A direct `Task()` is
   for fallback only (Mode B).
2. **Team-lead = coordination ONLY.** Doesn't write code, doesn't edit files,
   doesn't run tests. Its job is spawn → monitor → verify → report → next wave.
3. **Teammates do all the work.** Each in its own process, with its own context.
4. **Additional work → a NEW teammate.** Never load it onto an existing one —
   focus and context are lost.
5. **Before `TeamCreate` — check existing teams.** Ask the user before
   `TeamDelete`.
6. **One file = one agent per wave.** Otherwise — conflicts and lost code.

---

## Mode Selection (mandatory first step)

Before spawning, check which mode is available:

### Mode A: Agent Teams (preferred)

**Signal**: `TeamCreate` / `TeamDelete` / `SendMessage` are available (verify via
`ToolSearch({query: "select:TeamCreate"})`).

```
1. TeamCreate(team_name="research-{topic}")
2. Agent(prompt="...", team_name="research-{topic}", name="team-lead")
3. team-lead spawns teammates: Agent(team_name=..., name=...)
4. Coordination via SendMessage(to="...", content="...")
5. After work: shutdown teammates → TeamDelete()
```

Advantages: shared context, addressable agents, team-lead oversight.

### Mode B: Sub-Agents fallback

**Signal**: `TeamCreate` not found or returned an error.

```
Agent(prompt="...", name="agent-a", run_in_background=true)
Agent(prompt="...", name="agent-b", run_in_background=true)
# Wait for completion notifications, synthesize in main context.
```

No team-lead, no shared context — each agent gets the full context in its own prompt.

**Rule**: if `TeamCreate` is available, Mode B is forbidden.

---

## Workflow (5 Steps)

### Step 1: RECALL & STUDY

Gather context before creating the team:

#### 1a. Memory (if available)

Hindsight MCP (`memory_recall`), notes/, decisions/, ADR-*.md, or files
referenced by CLAUDE.md.

#### 1b. TODO / Task tracker

Find tracking files: `TODO.md`, `**/docs/TODO.md`, `KNOWN-ISSUES.md`. Large
TODOs (>1000 lines) — read with `offset`+`limit` or delegate to a sub-task with
`subagent_type: "Explore"`.

#### 1c. Source Code — ULTIMATE TRUTH

If TODO/memory contradicts code — **trust the code**. TODO goes stale, memory
can be stale.

Triangulation:

```
1. TODO claims [x] feature X done
2. memory_recall("X") confirms
3. grep "X" src/ — VERIFY it actually exists
   → no code = TODO is wrong, fix the TODO
```

### Step 2: CLASSIFY — pick a recipe

| Recipe | When | Teammates | Cost |
| --- | --- | --- | --- |
| **Review Squad** | PR review, code audit | 3 (security + perf + tests) | Medium |
| **Feature Build** | New feature by layer | 2–4 (backend + frontend + tests) | High |
| **Bug Hunt** | Competing hypotheses | 3–5 (each tests a theory) | Medium |
| **Research** | Architecture analysis | 2–3 (each — its own angle) | Low |
| **Full-Stack Sprint** | E2E feature (DB → API → UI) | 3 (schema + API + frontend) | High |
| **Refactor Wave** | Large refactor | 2–4 (each — its own package) | High |

### Step 3: RESEARCH — collect context for teammates

Sources in priority order:

1. **TODO files** — what's done, what's left, what gaps exist.
2. **RFC/design docs** — conventions, requirements. See [`rfc`](../rfc/SKILL.md).
3. **Reference implementations** — `sources/`, `vendor/`, `node_modules/` of key libs.
4. **Internal packages** — `packages/*/README.md`, `src/index.ts`. Don't reimplement
   what already exists.
5. **Library docs** — Context7 MCP instead of web browsing.
6. **Memory** — past decisions, known bugs.

### Step 4: SPAWN

#### Mode A:

```typescript
// 1. Create team
TeamCreate({ team_name: "feature-auth" });

// 2. Spawn team-lead (COORDINATOR, NOT a coder)
Agent({
  prompt: TEAM_LEAD_PROMPT,
  team_name: "feature-auth",
  name: "team-lead",
  mode: "plan", // requires plan approval
});

// 3. team-lead spawns teammates from within its own context:
Agent({
  prompt: BACKEND_DEV_PROMPT,
  team_name: "feature-auth",
  name: "backend-dev",
  mode: "bypassPermissions",
});

// 4. Coordinate via messages:
SendMessage({ to: "backend-dev", content: "Status?" });

// 5. After work:
// shutdown each teammate, then:
TeamDelete();
```

#### Mode B:

```typescript
Agent({ prompt: PROMPT_A, name: "agent-a", run_in_background: true });
Agent({ prompt: PROMPT_B, name: "agent-b", run_in_background: true });
// Wait for notifications, synthesize.
```

---

## Teammate Prompt Template

Every teammate gets the same template, filled in with specifics:

```
You are {role} on team "{team-name}".

=== CONTEXT SOURCES (study BEFORE implementing) ===

1. CLAUDE.md (project root) — project rules, conventions, build commands.
2. Memory (if available): recall("{your topic}") for past decisions.
3. TODO files (large — read with offset/limit or via Task subagent): {paths}
   - [x] = done items (learn patterns), [ ] = remaining (your tasks).
4. RFCs / design docs: {relevant RFC paths or "ask user"}.
5. Reference implementations: {paths in sources/ or vendor/}.
6. Internal packages: {packages to study before implementing}.
7. Library docs: prefer Context7 MCP over web search.
8. Known issues: {KNOWN-ISSUES.md path}.

=== YOUR FILES (strict ownership) ===

NEW:
- {path1} (~{LOC})
- {path2} (~{LOC})

MODIFY:
- {path3} (~{LOC} delta)

READ-ONLY (study, don't edit):
- {path4} (depends on it)

=== YOUR TASKS ===

{task list — 5-6 concrete items, not one giant task}

=== PROJECT RULES ===

Follow CLAUDE.md. Plus, specifically for this work:
- {rule 1 — extracted from project's CLAUDE.md or RFC}
- {rule 2}
- {rule 3}

=== AFTER COMPLETION ===

Report back with:
- Files created / modified (paths + LOC)
- Tests written
- Any blockers / issues / discovered tech debt
- Whether type-check / build / tests pass

Update relevant TODO files with [x] for completed items, add [ ] for discovered gaps.
Save key learnings to memory if memory system is configured.
```

---

## Step 5: SYNTHESIZE → RETAIN → CLEANUP

Once all teammates have finished:

1. **Synthesize** — collect reports, cross-validate (consensus = high confidence;
   unique = verify).
2. **Retain** — save key decisions and patterns to memory.
3. **Update docs** — TODO files (add `[x]` + `Files Modified`), KNOWN-ISSUES.md,
   the relevant RFC.
4. **Cleanup** —
   - Mode A: shutdown each teammate (`SendMessage(type="shutdown_request")`),
     then `TeamDelete()`.
   - Mode B: wait for completion, no extra steps.

---

## File Ownership (iron rule)

> **One file = one agent per wave.** Otherwise — race condition in the repo.

### Rules

1. **One file = one agent** — two agents NEVER edit the same file in parallel.
2. **Dependencies via waves** — if B depends on A's file, B goes in the **next**
   wave.
3. **Shared types** (index.ts, types.ts) — one agent creates, others only read;
   barrel exports get added by the last agent in the wave.
4. **On conflict** — stop and ask the user: merge manually, revert one side, or
   redo. **Never** revert silently.

### Ownership Table (mandatory in the plan)

```
| Agent      | Files (NEW/MODIFY)              | Read-only deps |
| ---------- | ------------------------------- | --------------- |
| agent-1    | shared/types.ts (NEW)           | —               |
| agent-2    | features/users/store.ts (NEW)   | shared/types.ts |
| agent-3    | features/users/page.tsx (NEW)   | features/users/store.ts |
```

If two agents in the same wave share a file in the `Files` column — stop, replan.

---

## Recipes (details)

### Recipe 1: Review Squad (3 agents)

Used by [`audit`](../audit/SKILL.md) — see there for details.

Minimum: security-reviewer + perf-reviewer + test-reviewer. Each studies its own
angle, then cross-validates.

### Recipe 2: Feature Build (3 agents)

backend-dev + frontend-dev + test-writer. Backend and tests can run in parallel
(if the contract is fixed); frontend goes after backend types.

### Recipe 3: Bug Hunt (4 agents)

Each agent **tests its hypothesis** and actively tries to **falsify** the
others. Hypotheses — auth / data / config / timing (race condition).
Convergence = root cause confirmed.

### Recipe 4: Research (3 agents)

Codebase-analyst + reference-analyst + architect (synthesizer). Details in
[`research`](../research/SKILL.md).

### Recipe 5: Refactor Wave

One agent per package/module. Plus an integration-tester that runs typecheck +
tests after each milestone.

---

## Anti-Patterns (avoid!)

| Anti-Pattern | Why it's bad | Do this instead |
|---|---|---|
| Two teammates editing one file | Conflicts, lost code | Strict file ownership, separate waves |
| `Task()` directly in Mode A | No coordination, no shared context | `TeamCreate` whenever available |
| Team-lead writing code | Role mixing | Team-lead = coordination only |
| Extra work to existing teammate | Context overload | New teammate per new task |
| Skip memory_recall (when memory exists) | Re-doing past decisions | Recall as the first step |
| Read full TODO (>1000 lines) | Context overflow | offset/limit or sub-task |
| Web browsing for library docs | Slow, noisy | Context7 MCP |
| >5 teammates | Token explosion | 2-4 — sweet spot |
| Skip saving learnings | Knowledge loss | memory_retain afterwards |
| One giant task per teammate | No checkpoints | 5-6 small tasks |
| Not cross-checking TODO vs code | TODO can lie | Triangulate (TODO + memory + grep) |

---

## Cleanup Checklist

Once the team finishes:

- [ ] Each teammate saved its learnings (memory, if configured).
- [ ] All teammates marked completed.
- [ ] Shutdown requests sent to all.
- [ ] All shutdowns confirmed.
- [ ] `TeamDelete()` called (Mode A).
- [ ] TODO files updated (`[x]` + `Files Modified`).
- [ ] KNOWN-ISSUES.md updated if bugs were found.
- [ ] Relevant RFC updated (Implementation Log + Phase Progress) — see
      [`rfc`](../rfc/SKILL.md).
- [ ] Changes ready for review (diff inspected).

---

## Related Skills

- [`research`](../research/SKILL.md) — research recipe (5 agents).
- [`audit`](../audit/SKILL.md) — review squad (4-6 experts).
- [`sprint`](../sprint/SKILL.md) — wave-based execution on this foundation.
- [`do`](../do/SKILL.md) — meta-orchestrator, picks among these skills.
- [`rfc`](../rfc/SKILL.md) — update RFC after the team finishes.
