---
name: task-cycle
description: >-
  This skill should be used when the user asks "what should I do next", "take this task",
  "start on X", "close the task", "update the status", "move it to done", "what is blocked",
  "what is ready", "file a task", "add a checklist", "report on the task", or mentions a
  task board, issue, ticket, status or checklist. Russian equivalents trigger it too —
  "что дальше", "возьми задачу", "закрой задачу", "обнови статус", "заведи задачу",
  "что заблокировано", "чеклист", "доска", "задача". Provides the seven-stage gated runbook
  for working one task end to end, whatever the tracker is — Orchestra, Jira, Linear, GitHub
  Issues — reading the concrete tracker from the project's own configuration. It does not
  explain how any particular tracker's tools behave: when the question is why a call returned
  empty, why a field did not stick, or which server you are on, that tracker's own driver
  skill owns it (for Orchestra, `orchestra-mcp`).
---

# Task cycle

Work a task the way a human works a ticket: orient, read, claim, work, prove, report, close.
Seven stages, each with a gate.

**A gate is not a formality.** Being unable to answer it means the previous stage is not finished.
Every expensive failure in this workflow comes from starting stage N+1 on an unfinished stage N.

Where a project carries its own rules, those rules take priority over this runbook. Rules state
what is allowed; this states what to do and in what order. Neither restates the other, and where
they disagree the project's rules win.

## Which tracker — resolve before Stage 0

This runbook is tracker-agnostic **by construction**: it names *operations*, never a product's
tool names. The mapping from operation to concrete call is the project's, not this skill's.

1. **Read `docs/agents/issue-tracker.md`.** If present, it names the tracker, how to list and
   create issues, and — crucially — how this project's labels map onto the canonical roles below.
   Use it and do not probe further.
2. **No such file?** Ask the user once whether to write it (`/setup` is the wizard that does).
   Recording the answer once beats re-deriving it every session.
3. **User declines or does not answer?** Detect and proceed — match on the **bare tool name**,
   never on an `mcp__…__` prefix, which differs per runtime and per project:

   | Tracker | Signature |
   |---|---|
   | Orchestra | `query_entities` + `get_current_context` |
   | Linear | `list_my_issues` / `list_assigned_issues` |
   | Jira | `search_issues` / `get_my_issues` |
   | GitHub Issues | `gh` on PATH |
   | Local markdown | `TODO.md`, `docs/TODO.md` |

   Several candidates and no config — **stop and ask**. Guessing writes into the wrong system.

**Tracker-specific behaviour lives in that tracker's driver skill**, which is the authority on how
its tools fail. For Orchestra that is `orchestra-mcp`: run its verifier before the first write, and
treat any non-zero exit as a stop.

```
${CLAUDE_PLUGIN_ROOT}/skills/orchestra-mcp/scripts/orch-verify.sh [role] [--json]
```

## Canonical operations

The stages below use these words. Your project's configuration says what each one is:

| Operation | Means |
|---|---|
| **list startable** | open, unblocked, not done |
| **read one** | its description, its discussion, its checklist |
| **claim** | mark in-progress and name who is doing it |
| **tick** | record one step as done, with its proof |
| **report** | post or hand back a completion summary |
| **close** | mark done, or mark blocked with a stated trigger |

And these field *roles*. Every tracker has them under some name; the names below are roles, not
labels. What this project calls each one is in `references/project-fields.md`.

| Role | Holds | Written |
|---|---|---|
| **status** | open / doing / blocked / done | at claim and at close |
| **stage marker** | how far through the work it got | alongside status — never on its own |
| **who** | which runtime is executing it | at pickup, not at filing |
| **which model** | which model that runtime is running | at pickup, not at filing |
| **blocked-by** | the tasks that must land first | at filing, whenever a dependency exists |

---

## Stage 0 — ORIENT

**Resolve identifiers at runtime, every session.** Field ids, option ids, label ids and status ids
are per-project in every tracker worth using — never hardcode them, and never send a *name* where an
id is required.

Then **list startable** work. Rank by whatever the project's ordering is (an area, a component, a
priority); if it has none, take dependency order.

**Cross-check the count before reporting it.** Ask the tracker for a total by a second route and
reconcile — a filter that silently returns a subset looks exactly like a quiet board. This is not
paranoia: on one measured Orchestra build the board query returned 128 of 147 tasks with no error.

Recipes for this project's board are in `references/query-recipes.md`; the traps of the Orchestra
driver are in `orchestra-mcp/references/failure-modes.md`.

> **Gate 0** — name the task and why it is the right one to take.

---

## Stage 1 — READ

Four reads, in order. **Never act on a task name.**

1. **The project's own description** — project-scoped rules override anything general.
2. **The task** — description *and* fields. Ask for field metadata in the same call where the
   tracker offers it; resolving option names afterwards is a round-trip you already paid for.
3. **The discussion** — read it **to the end**. Trackers return a page, not a thread, and the
   default page is short. The discussion **overrides the description**, so an unpaged read does not
   save a call — it loses the override, which is a correctness failure, not a saving.
4. **The checklist** — someone may have ticked items already.

Where a tracker carries replies that are writable but not readable back, and the tool only tells you
such a reply exists, **ask the human** instead of assuming it is empty. (Orchestra threads behave
exactly like this — `orchestra-mcp/references/entities.md` § Messages.)

> **Gate 1** — state the `Done when` criteria without re-reading, and know whether the discussion
> changed them. Where discussion and description disagree, the discussion wins.

---

## Stage 2 — CLAIM

Announce the work before doing it. One write sets **status**, the **stage marker**, **who** and
**which model**. Move status and stage marker together — apart, they contradict each other, and a
reader believes whichever they looked at first.

Fill **who** and **which model** here rather than at filing: they are unknown until pickup, and a
guessed runtime is worse than an empty field. The task's role, by contrast, follows from the task
itself and should already be set.

**Read the response, not its success flag.** Trackers routinely answer a write with overall success
and a per-field rejection list inside it, so a claim nobody can see reports as done. Where a
rejection reads as a permission problem, check whether the field already holds that value before
retrying — a same-value write is commonly reported as a failure rather than as a no-op.

Which fields this project uses, and which are written at filing versus at pickup:
`references/project-fields.md`. Orchestra's call shape and its three-way response
(`updatedFields` / `unchangedFields` / `failedFields`): `orchestra-mcp/references/entities.md`.

> **Gate 2** — the board shows the task as taken and names the runtime. Anyone looking knows not to
> pick it up.

---

## Stage 3 — WORK

Every step lives in the checklist. Not in the reply prose, not in a private list, not in the
artifact.

**Tick each item the moment its proof exists**, never in a batch at the end. A list ticked all at
once records that the work finished and nothing about how it went.

**Reconcile additively**: match on item text, add what is missing, never untick, never delete. The
board is a shared record — someone else's tick is not yours to remove.

**Promote a step to its own task** when it has its own status, its own owner and its own gate. A
checklist item tracks a step of one piece of work; a task *is* a piece of work. File it under the
current task so the tree still reads top-down.

**One fact that gates several tasks belongs to one shared item**, where the tracker supports sharing.
"Contract test green" ticked separately in three places drifts into three different answers.
Orchestra shares an item with `manage_checklist_item({ action:"link", … })`; completion lives on the
item, so it is ticked once and ticked everywhere.

> **Gate 3** — every item is ticked or carries a stated reason it is not. A ticked item whose proof
> cannot be shown is a falsehood the board repeats to everyone who reads it.

---

## Stage 4 — EVIDENCE

Each gate item names an observable. Produce it.

Where the task carries a `needs-evidence` tag, it does not close without an evidence artifact.
Create artifacts through the `forgeplan` CLI or MCP — never by writing under `.forgeplan/`, which a
fail-closed hook blocks by design.

> **Gate 4** — every `Done when` line has something a sceptic could open and check.

---

## Stage 5 — REPORT

**Check first whether this project lets an agent write into the tracker's discussions at all.** For
Orchestra the plugin's rule is `NEVER send_message unless chat writing is explicitly enabled for the
workspace` (README «Safety Rules»; `unified-workflow` says the same). This runbook does not override
that, and the equivalent question is worth asking of any tracker: a comment is visible to the whole
team and usually pushes a notification.

- **Not enabled** — the default. Produce the report and give it to the user in the session. The gate
  below is satisfied by the report existing, not by it having been posted.
- **Enabled** — post it into **the task's own discussion**, and only there. Never a channel, a group
  or a direct message.

**Never mention a person.** A mention pushes a notification to a human who did not ask for it —
including the mention syntax shown in `assets/completion-report.md`, which documents the format
without licensing its use here.

Use `assets/completion-report.md` as the shape: what was done, **what was not**, what to watch, how
to roll back.

State what was not done as plainly as what was. A report listing only successes is the failure this
stage exists to prevent.

> **Gate 5** — the report names what was skipped and what to watch.

---

## Stage 6 — CLOSE

Done: set **status** to done, move the **stage marker** to its final value, and record the branch
where the work is branch-scoped.

**Blocked rather than done**: set status to blocked and **leave the stage marker untouched**. Writing
a stage alongside blocked rolls the task back to the beginning and destroys the record of how far it
actually got. State both halves where the tracker keeps its description:

```
BLOCKED: what is being waited on
TRIGGER: what must become true for it to move
```

"Later" is not a trigger. "After the migration merges" is a trigger.

> **Gate 6** — status, stage marker and checklist agree with each other and with reality.

---

## Filing a task

**Search first** — a duplicate costs more than the search. Then create with **every field inline**,
and attach the gate checklist **in the same turn**. A field that requires coming back later does not
get filled.

Name tasks `<RoadmapID> — <short imperative>`. Put the artifact id in its own field, not in the name.

Write checklist items as `<imperative action> — <observable proof>`, plain text, no markdown — most
trackers render checklist items literally, backticks and all. Apply the **falsifiability test**:
could a competent agent doing this work honestly leave this item unticked? If not, it is decoration —
delete it. `works`, `verified`, `correct` are never criteria on their own.

**Verify the attach.** A checklist created in the same breath as the task has been observed to return
success and leave zero checklists behind. Read it back before moving on.

Orchestra's exact call shapes — the `entities[]` form, where `contextUid` lives, the required
`checklistUid` — are in `orchestra-mcp/references/entities.md`; a worked filing is in
`examples/file-a-new-task.md`.

---

## Never

- **Delete a task.** It destroys history. Close it instead. (In Orchestra archiving is not reachable
  from MCP at all, so Done *is* the close — `orchestra-mcp/references/failure-modes.md`.)
- **Assign a person, or add members, on your own initiative.** It notifies a real human. Such a write
  can also be dropped silently while reporting success — read it back.
- **Report a cleanup, a deletion or a batch as done without re-reading it.** Search on the name is
  the cheap re-read. Orchestra's deletion has been observed to hang to timeout with no error, and
  once that starts it affects **every** subsequent delete, not only the object you were on.
- **Put artifact bodies, scores or validation results in the tracker.** They stale the moment the
  artifact moves.
- **Copy a roadmap into the tracker.** Two sources of truth is none.
- **Create a task without searching first.**
- **Assume the server acts as you.** On an agent endpoint every write is attributed to the deployed
  bot, not to the human — `orchestra-mcp/scripts/orch-verify.sh` prints whose identity you hold.

---

## Additional resources

### References — this project's board

- **`references/project-fields.md`** — the fields this project uses, which are written at creation
  versus at pickup, the tags doctrine, and the two field types never to create.
- **`references/query-recipes.md`** — the two board questions that field model exists to answer.

### References — the platform (in the `orchestra-mcp` skill)

Installed alongside this one. It is the authority on tool behaviour; where the two disagree, it wins.

- **`orchestra-mcp/references/failure-modes.md`** — every way Orchestra fails silently, what is
  unreachable from MCP, what does not exist in the product. Consult before designing any workflow
  around a feature.
- **`orchestra-mcp/references/query-cookbook.md`** — filtering, sweeps, cost control, and how to
  cross-check a count before reporting it.
- **`orchestra-mcp/references/fields.md`** — value shapes on read and write, the two containers
  trap, field types never to create.
- **`orchestra-mcp/references/entities.md`** — creating, updating, checklists, messages, deleting.
- **`orchestra-mcp/references/rendering.md`** — why written markdown never reads back identical.

### Examples

Both are worked in Orchestra, because that is the tracker this project runs. The stages they walk
are the same seven for any tracker; only the call syntax is Orchestra's.

- **`examples/take-and-close-a-task.md`** — a full pass through all seven stages on one real task,
  including the blocked variant.
- **`examples/file-a-new-task.md`** — filing with fields inline, the dangling-reference check, and
  when a step is really a subtask.

### Assets

- **`assets/task-description.md`** — the `Why / Done when / Notes` skeleton.
- **`assets/completion-report.md`** — the report shape for stage 5.

### Scripts (both in the `orchestra-mcp` skill)

- **`orchestra-mcp/scripts/orch-verify.sh`** — deterministic server resolution + write handshake
  against the project's `orchestra.json` pin file. Exit 0 = safe to write, anything else = stop.
- **`orchestra-mcp/scripts/field-map.sh`** — dumps the field and option UID map from a running
  Orchestra. `field-map.sh <workspace-uid> [task|project] [--json]`
