---
name: do
description: Meta-orchestrator — takes a natural-language task, classifies it (research / docs / feature / review / bug / refactor / status), builds a pipeline from other skills (research → write-doc → wave-sprint → audit), shows the plan, and executes with approval checkpoints. Use when the user wants "do X" without naming a specific skill. Triggers (EN/RU) — "do X", "implement and document", "research and write RFC", "сделай", "разберись и реализуй", "проведи ревью ветки", "/do".
---

# Task Orchestrator

A "meta-command": takes any task phrasing and assembles a pipeline from other
skills. Doesn't do the work itself — delegates. Goal: remove the mental overhead
of "which skill do I call?"; the user says *what*, the orchestrator decides *how*.

---

## Project context (read first)

`/do` is an orchestrator. It needs every available config source:

- `@docs/agents/paths.md` — where RFCs, TODOs, sources live
- `@docs/agents/build-config.md` — build/test/lint commands
- `@docs/agents/issue-tracker.md` — which tracker
- `@CONTEXT.md` — domain glossary

Check with `test -d docs/agents`. If present — sub-skills (`research`, `sprint`,
`audit`, `briefing`, ...) pick up the specifics automatically through their own
`@imports`; you just pass them the task. If `docs/agents/` is missing — sub-skills
auto-detect through project files (glob, `package.json`, etc.).

---

## When to use

- User described a task in one sentence and didn't name a specific skill.
- The task obviously needs multiple steps (research + RFC, research + sprint + audit, etc.).
- User said: "сделай", "разберись", "проведи ревью", "реализуй и задокументируй".

## When NOT to use

- A specific skill clearly fits and the user named it — call it directly.
- Trivial task (read file, fix typo) — don't orchestrate, just do it.
- Single-shot research / single-shot audit — call the skill directly.

---

## Workflow

### Phase 1: UNDERSTAND — classification

Parse `$ARGUMENTS` into one or more categories:

| Category | Signals | Pipeline |
|---|---|---|
| **research** | "разберись", "изучи", "что есть", "какой статус", "сравни" | research → report |
| **documentation** | "напиши RFC", "сделай guide", "доку", "report", "ADR" | research → write-doc |
| **feature** | "добавь", "реализуй", "implement", "создай фичу" | research → plan → wave-sprint → tests → docs |
| **review** | "ревью", "review", "проверь код", "аудит" | audit (review squad) → report |
| **bug** | "баг", "не работает", "сломалось", "investigate" | research → bug-hunt team → fix |
| **refactor** | "рефакторинг", "refactor", "переделай", "migrate" | research → plan → wave-sprint (refactor) → tests |
| **analysis** | "анализ", "analyze", "gap analysis", "state of" | research → write-doc (report) |
| **status** | "статус", "что сделано", "прогресс" | lightweight research (3 explore) → report |

**Multiple categories are fine**:

- "design webhooks v2 and write an RFC" = research + documentation
- "add SCIM and document it" = feature + documentation

### Phase 2: RECALL

If memory is available — quick check:

```
memory_recall("$TOPIC")
memory_recall("$TOPIC architecture decisions")
```

Often research was already done — can be skipped.

### Phase 3: PLAN — build the pipeline

Pick a template (see below) based on classification. Show the pipeline to the user
**before** execution:

```markdown
## Task: $ARGUMENTS

Classified as: [{categories}]

### Proposed Pipeline:

Step 1: RESEARCH — multi-agent research (5 agents in parallel: code, docs, status, reference, knowledge)
   → Output: Research Report

Step 2: WRITE-DOC (RFC) — RFC based on research findings
   → Output: RFC-XXX-WEBHOOKS-V2.md

Step 3: SAVE — File + Memory + RFC-INDEX update

Estimated agents: 7 (5 research + 2 doc)
Approval checkpoints: after research, after draft

Proceed? (yes / adjust pipeline / skip steps)
```

Wait for the answer. The user can:

- **"yes" / "давай" / "1"** → execute all
- **"skip research"** → jump to step 2
- **"only research"** → stop after step 1
- Adjust any step

### Phase 4: EXECUTE — step by step

Run steps sequentially. Output of one step → input of the next (pass as a brief
summary, not raw data — otherwise context overflows).

---

## Pipeline Templates

### Template A: RESEARCH → REPORT (pure research)

**For**: "разберись", "изучи", "what's the status", "сравни"

```
Step 1: RESEARCH
  → [`research`](../research/SKILL.md), 5 agents
  → Output: 5 reports

Step 2: SYNTHESIZE
  → Cross-reference, identify gaps, conflicts

Step 3: DELIVER
  → Present report
  → memory_retain (if memory exists)

Step 4: CLEANUP
```

### Template B: RESEARCH → WRITE-DOC (research + docs)

**For**: "write RFC", "make a guide", "report"

```
Step 1: RESEARCH (like Template A) → research report

Step 2: WRITE-DOC
  → Determine doc type (RFC / guide / report / ADR)
  → Determine path and next number (see [`rfc`](../rfc/SKILL.md))
  → Write the doc, using research as input
  → Follow the format from [`rfc`](../rfc/SKILL.md)

Step 3: APPROVAL CHECKPOINT
  → Show draft to user
  → Wait: approve / edit / reject

Step 4: SAVE (only after approval)
  → Write file
  → memory_retain summary
  → Update RFC-INDEX (if RFC)
  → Update TODO (if applicable)

Step 5: CLEANUP
```

### Template C: RESEARCH → PLAN → WAVE-SPRINT (feature implementation)

**For**: "add", "implement", "реализуй"

```
Step 1: RESEARCH (like Template A, focused on implementation context)
  → What exists, what's needed, reference patterns

Step 2: PLAN
  → Plan from research → via [`sprint`](../sprint/SKILL.md) Step 2
  → File ownership map
  → Task breakdown (5-6 per teammate)
  → Dependencies

Step 3: APPROVAL CHECKPOINT
  → Show plan
  → Wait approval

Step 4: WAVE-SPRINT execute
  → [`sprint`](../sprint/SKILL.md) Step 4 — wave-by-wave
  → Backend, frontend, tests teammates with research context

Step 5: VERIFY
  → typecheck, build, tests (project-specific commands)

Step 6: DOC (optional, if the task included docs)
  → Update TODO with [x]
  → memory_retain decisions
  → Update RFC (Implementation Log + Insights)

Step 7: CLEANUP
```

### Template D: AUDIT (code review)

**For**: "ревью", "review", "аудит"

```
Step 1: SCOPE
  → Determine review target (branch diff, files, PR)
  → git diff main...HEAD for branch

Step 2: AUDIT
  → [`audit`](../audit/SKILL.md), 4-6 agents

Step 3: SYNTHESIZE
  → Cross-validate, prioritize Critical > High > Medium > Low

Step 4: DELIVER
  → Present audit report
  → memory_retain key issues

Step 5: CLEANUP
```

### Template E: RESEARCH → BUG HUNT (bug investigation)

**For**: "bug", "doesn't work", "investigate"

```
Step 1: RESEARCH (focused on the bug area)
  → memory_recall known issues
  → Read KNOWN-ISSUES.md
  → Understand architecture around the bug

Step 2: BUG HUNT TEAM
  → Spawn 3-5 teammates, each with its own hypothesis:
    · hypothesis-input: validation, parsing
    · hypothesis-state: race condition, mutation
    · hypothesis-config: env mismatch
    · hypothesis-timing: async, ordering
  → See [`team`](../team/SKILL.md), Recipe 3.

Step 3: SYNTHESIZE
  → Which hypothesis is confirmed? Root cause?

Step 4: FIX (if simple)
  → Apply fix, add test, verify

Step 5: DOCUMENT
  → Update KNOWN-ISSUES.md
  → memory_retain root cause + fix

Step 6: CLEANUP
```

### Template F: LIGHTWEIGHT STATUS CHECK

**For**: "status", "what's done", "progress"

**No team** — parallel sub-agents:

```
Step 1: PARALLEL SEARCH (3 sub-agents without TeamCreate):
  → Task(Explore): TODO files for topic
  → Task(Explore): codebase for topic
  → Task(Explore): memory_recall for topic (if memory exists)

Step 2: SYNTHESIZE → status report

Step 3: DELIVER
```

---

## Decision Logic (template selection)

```
1. Parse $ARGUMENTS for signals (Phase 1).

2. Multiple categories?
   - research signals only → A
   - research + doc → B
   - feature → C
   - review → D
   - bug → E
   - status → F
   - feature + doc → C, then add doc step from B
   - research + feature → A, then C with research as input

3. If unclear — ask:
   "I see you want {X}. Should I:
    a) only research and report?
    b) research, then write a doc?
    c) research, plan, and implement?
    d) something else?"
```

---

## Approval Checkpoints

The orchestrator runs autonomously, but **must** pause at:

| Checkpoint | When | What we show |
|---|---|---|
| **Pipeline approval** | After Phase 3 | Proposed pipeline + estimated agents |
| **Research review** | After research | Summary findings, proceed? |
| **Draft review** | After doc/RFC | Full document, approve/edit/reject? |
| **Implementation plan** | Before spawning dev team | File ownership, task breakdown |
| **Final review** | After implementation | Diff summary, tests passing? |

At each one the user can:

- **"давай" / "yes"** → continue
- **"стоп"** → abort
- **"пропусти"** → skip step
- **"измени X"** → adjust + retry

---

## Context passing between steps

Output of one step → input of the next. Rules:

- Pass **summary**, not raw data — otherwise context overflows.
- Each step compresses its output for the next.
- For long pipelines — save intermediate artifacts to files (`research/reports/X.md`)
  and reference them instead of inlining into the prompt.

```
RESEARCH output (5 reports → summary)
    ↓
WRITE-DOC (uses summary for content)
    ↓
WAVE-SPRINT (teammates get research summary + doc as requirements)
    ↓
MEMORY (retain synthesis)
```

---

## Error handling

| Situation | Action |
|---|---|
| Team agent fails | Retry once. If it fails again — partial report, ask user |
| Research empty | "Nothing found", ask to widen keywords |
| Doc draft rejected | Get specific feedback, rewrite |
| Implementation fails tests | Report failures, attempt fix; if blocked — ask user |
| Pipeline drags on | Report progress between steps; user can abort |
| Memory save failed | Report error, continue pipeline |

---

## Integration with related skills

The orchestrator doesn't implement logic itself — it delegates:

| Step | Delegates to | How |
|---|---|---|
| RESEARCH | [`research`](../research/SKILL.md) | 5-agent team, same recipe |
| WRITE-DOC | [`rfc`](../rfc/SKILL.md) | RFC format, index, log |
| PLAN+EXECUTE | [`sprint`](../sprint/SKILL.md) | Wave-by-wave |
| BUILD from existing plan | [`build`](../build/SKILL.md) | IMPLEMENTATION-PLAN-driven |
| REVIEW / AUDIT | [`audit`](../audit/SKILL.md) | 4-6 reviewers |
| TEAM ops (foundation) | [`team`](../team/SKILL.md) | Mode A/B, cleanup |
| BRIEFING / RECALL | [`briefing`](../briefing/SKILL.md) / [`restore`](../restore/SKILL.md) | Before/during pipeline |

---

## Examples

### "design webhooks v2 and write an RFC"

```
Categories: research + documentation
Template: B (research → write-doc)
Pipeline:
  1. research → webhook patterns, our code, references (n8n, trigger.dev)
  2. rfc → RFC-XXX-WEBHOOKS-V2.md
  3. SAVE → file + memory + RFC-INDEX
Checkpoints: after research, after draft
```

### "what's the status on SSO SAML?"

```
Categories: status
Template: F (lightweight)
Pipeline:
  1. 3 parallel Explore sub-agents → TODO + code + memory
  2. SYNTHESIZE → status report
No team. Fast.
```

### "add SCIM provisioning — full cycle"

```
Categories: feature + documentation
Template: C + B hybrid
Pipeline:
  1. research → SCIM standards, our IAM, references
  2. sprint Step 2 → plan
  3. sprint Step 4 → backend-dev + test-writer
  4. rfc → SCIM-INTEGRATION guide
  5. SAVE → files + memory + TODO
Checkpoints: research, plan, implementation, doc
```

### "security review of the current branch"

```
Categories: review
Template: D
Pipeline:
  1. SCOPE: git diff main...HEAD
  2. audit → security + perf + tests focus
  3. SYNTHESIZE → prioritized findings
  4. SAVE → memory + KNOWN-ISSUES if bugs found
```

---

## Tips

1. **Be specific in the task** — "design webhooks for real-time event delivery with retry and DLQ" beats "do webhooks".
2. **Say what you want at the end** — "and write an RFC" tells the orchestrator to add a doc step.
3. **You can interrupt** — at any checkpoint adjust the pipeline.
4. **Pipeline is always visible** — user sees the plan before execution.
5. **Memory accumulates** — every next call on a related topic is faster.
6. **Lightweight by default** — status checks don't spawn full teams.

---

## Related skills

- [`research`](../research/SKILL.md) — research step.
- [`rfc`](../rfc/SKILL.md) — write-doc step.
- [`sprint`](../sprint/SKILL.md) — implementation step.
- [`build`](../build/SKILL.md) — when research is done and an IMPLEMENTATION-PLAN exists.
- [`audit`](../audit/SKILL.md) — review step.
- [`team`](../team/SKILL.md) — foundation for all team ops.
- [`restore`](../restore/SKILL.md) — recall before a complex pipeline.
- [`briefing`](../briefing/SKILL.md) — task-tracker briefing outside the code.

## Anti-patterns

- **Don't run a pipeline without approval** — the user must see the plan.
- **Don't pass raw output between steps** — compress to summary.
- **Don't orchestrate trivial tasks** — if one skill is enough, call it directly.
- **Don't skip RECALL** — research is often already done.
- **Don't forget cleanup** — every step must close cleanly (TeamDelete, memory_retain).
