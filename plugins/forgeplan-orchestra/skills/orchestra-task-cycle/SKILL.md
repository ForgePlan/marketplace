---
name: orchestra-task-cycle
description: This skill should be used when the user asks to "what should I do next", "take this task", "start on X", "close the task", "update the status", "move it to done", "what is blocked", "what is ready", "file a task", "add a checklist", "report on the task", or mentions an Orchestra board, task, status, phase or checklist. Russian equivalents trigger it too — "что дальше", "возьми задачу", "закрой задачу", "обнови статус", "заведи задачу", "что заблокировано", "чеклист", "доска", "задача". Provides the seven-stage runbook for working an Orchestra task end to end, the field model, query recipes, and the failure modes that fail silently.
---

# Orchestra task cycle

Work an Orchestra task the way a human works a ticket: orient, read, claim, work, prove, report,
close. Seven stages, each with a gate.

**A gate is not a formality.** Being unable to answer it means the previous stage is not finished.
Every expensive failure in this workflow comes from starting stage N+1 on an unfinished stage N.

Where a project carries its own rules for Orchestra work, those rules take priority over this
runbook. Rules state what is allowed; this states what to do and in what order. Neither restates
the other, and where they disagree the project's rules win.

---

## Stage 0 — ORIENT

Resolve field and option UIDs first, every session. They are per-workspace and must never be
hardcoded.

```
${CLAUDE_PLUGIN_ROOT}/skills/orchestra-task-cycle/scripts/field-map.sh <workspace-uid> task
```

Or call `list_fields({ contextUid, targetType:"task" })` and build two maps: field name → uid, and
per option field, option name → option uid.

Find what is startable:

```js
query_entities({ repoType:"folder", repoUid:"all",
  fieldFilters:{ "<Area uid>": ["<System>","<Hub>","<Runtime>"] },
  excludeFilters:{ "status": "<Done option uid>" },
  includeFields:["<BlockedBy uid>","<Area uid>","<Role uid>"] })
// then keep entities whose BlockedBy value is [] or absent
```

**Filter client-side, do not ask the server for unblocked.** `fieldFilters:{ "<BlockedBy>": null }`
returns **zero** rows on a board that has unblocked tasks: a multi-value chat field with no
references stores `[]`, and `null` matches genuinely-unset only. Tested on a live board — seven
startable tasks, zero returned. It is the first silent refusal in `references/failure-modes.md`, and
a runbook whose opening step hits it reports "nothing to take" on a full board.

More sweeps — overdue, recently closed, grouped by phase, stale — in `references/query-recipes.md`.

> **Gate 0** — name the task and why it is the right one to take.

---

## Stage 1 — READ

Four reads, in order. Never act on a task name.

1. **Project description** — project-scoped rules that override anything general.
2. **Task description** — `get_entity({ entityUid, includeFieldsMetadata:true })`. The metadata flag
   returns `optionName` per value and saves a `list_fields` round-trip.
3. **Task chat** — `read_messages`, **paginated**. Default limit is 50. While `hasMore` is true, call
   again with `beforeTimestamp = oldestTimestamp`. The chat **overrides the description**, so an
   unpaged read loses the override — a correctness failure, not a saving.
4. **Checklists** — `get_checklists({ chatUid })`. A human may have ticked items already.

Treat `threadStats.messagesCount > 0` on any message as a signal to **ask the human**: threads can be
written but not read, so a clarification inside one is invisible.

> **Gate 1** — state the `Done when` criteria without re-reading, and know whether the chat changed
> them. Where chat and description disagree, the chat wins.

---

## Stage 2 — CLAIM

Announce the work before doing it.

```js
update_entity({ entityUid: task, fields:[
  { fieldUid:"<Status>",   value:"doing" },
  { fieldUid:"<Phase>",    value:"<Code uid>" },
  { fieldUid:"<Executor>", value:"<CC|CDX|OC|OMP|Human uid>" },
  { fieldUid:"<Model>",    value:"<Opus|Sonnet|GLM|… uid>" },
]})
```

Move `Status` and `Phase` together. Fill `Executor` and `Model` here — they are unknown until pickup,
which is why they stay empty at creation. `Role` is already set; it follows from the task.

Read `failedFields`. `Missing or insufficient permissions` there usually means the field already
holds that value — verify with a query rather than retrying.

> **Gate 2** — the board shows `Doing` and names the runtime. Anyone looking knows the task is taken.

---

## Stage 3 — WORK

Every step lives in the checklist. Not in the reply prose, not in a private list, not in the
artifact.

```js
manage_checklist_item({ action:"update", itemUid:"<item>", isChecked:true })
```

Tick each item the moment its proof exists, not in a batch at the end — a list ticked all at once
records nothing about what happened.

Reconcile **additively**: match on item text, add what is missing, never untick, never delete.

Promote a step to a **subtask** when it has its own status, executor and gate:
`create_entity({ contextUid:"<parent task uid>", … })`. A checklist item tracks a step of one piece
of work; a subtask is a piece of work.

For a gate that is one fact seen from several sides — "contract test green", "producer PR merged" —
share a single item across tasks with `manage_checklist_item({ action:"link", checklistUid, itemUid })`.
Completion lives on the item, so it is ticked once and ticked everywhere.

> **Gate 3** — every item is ticked or has a stated reason it is not. A ticked item whose proof
> cannot be shown is a falsehood the board will repeat.

---

## Stage 4 — EVIDENCE

Each gate item names an observable. Produce it.

Where the task carries a `needs-evidence` tag, it does not close without an evidence artifact.
Create artifacts through the `forgeplan` CLI or MCP — never by writing under `.forgeplan/`, which a
fail-closed hook blocks by design.

> **Gate 4** — every `Done when` line has something a sceptic could open and check.

---

## Stage 5 — REPORT

**Check first whether this workspace allows the plugin to write into chats.** The plugin's rule is
`NEVER send_message unless chat writing is explicitly enabled for the workspace` (README «Safety
Rules»; `unified-workflow` says the same). This runbook does not override it.

- **Not enabled** — the default. Produce the report and give it to the user in the session. The gate
  below is satisfied by the report existing, not by it having been posted.
- **Enabled** — post it into the task's own chat, and only there:

```js
send_message({ chatUid: task, content: "<markdown>" })
```

Never a channel, a group or a DM. Never an `@`-mention: it pushes a notification to a person, and
the plugin forbids it outright — including the mention syntax shown in
`assets/completion-report.md`, which documents the format without licensing its use here.

Use `assets/completion-report.md` as the shape: what was done, **what was not**, what to watch, how
to roll back.

Markdown renders.

State what was not done as plainly as what was. A report listing only successes is the failure this
stage exists to prevent.

> **Gate 5** — the message names what was skipped and what to watch.

---

## Stage 6 — CLOSE

```js
update_entity({ entityUid: task, fields:[
  { fieldUid:"<Status>", value:"done" },
  { fieldUid:"<Phase>",  value:"<Done uid>" },
  { fieldUid:"<Branch>", value:"feat/…" },      // only if branch-scoped
]})
```

Blocked rather than done: set `Status` to `Blocked` and **leave `Phase` untouched**. Writing a phase
alongside `Blocked` rolls the task back to `Shape` and destroys the record of how far it got. State
both halves in the description:

```
BLOCKED: what is being waited on
TRIGGER: what must become true for it to move
```

"Later" is not a trigger. "After the migration merges" is a trigger.

> **Gate 6** — status, phase and checklist agree with each other and with reality.

---

## Filing a task

Search first, then create with every field inline, then attach the gate checklist — all in the same
turn. A field that requires coming back later does not get filled.

```js
search_entities({ query:"<the thing>" })
create_entity({ entities:[{ type:"task", name:"H3 — Semantic compiler → MVS artifact set",
  contextUid:"<project uid>", description:"<see assets/task-description.md>",
  fields:[ /* Area, Role, Depth, Phase, Artifact+Type, Blocked by */ ] }]})
manage_checklist({ action:"create", chatUid:"<new task>", name:"Steps (gate)", items:[…] })
```

Name tasks `<RoadmapID> — <short imperative>`. Put the artifact in the `Artifact` field, not the name.

Write checklist items as `<imperative action> — <observable proof>`, plain text, no backticks.
Apply the **falsifiability test**: could a competent agent doing this work honestly leave this item
unticked? If not, it is decoration — delete it. `works`, `verified`, `correct` are never criteria on
their own.

Verify the attach with `get_checklists` — a create issued right after task creation has been observed
to return success and leave zero checklists.

---

## Never

- `delete_entity` on a task — it destroys history. Use `Status=Done`; archiving is not reachable
  from MCP (`references/failure-modes.md`), so Done is the close.
- Set `Assignee` or `Members` automatically — it notifies a real person.
- Put artifact bodies, scores or validation results in Orchestra — they stale instantly.
- Copy roadmaps into Orchestra documents — two sources of truth.
- Create a task without `search_entities` first.

---

## Additional resources

### References

- **`references/field-model.md`** — the eleven fields, which are written at creation versus at
  pickup, the tags doctrine, and the two field types never to create here.
- **`references/query-recipes.md`** — reverse dependency lookup, session-start sweeps, protocol
  compliance audits, cost control, and the integrity check after writing dependencies.
- **`references/failure-modes.md`** — every way Orchestra fails silently, what is unreachable from
  MCP, and what does not exist in the product at all. Consult before designing any workflow around
  a feature.

### Examples

- **`examples/take-and-close-a-task.md`** — a full pass through all seven stages on one real task,
  including the blocked variant.
- **`examples/file-a-new-task.md`** — filing with fields inline, the dangling-reference check, and
  when a step is really a subtask.

### Assets

- **`assets/task-description.md`** — the `Why / Done when / Notes` skeleton.
- **`assets/completion-report.md`** — the report shape for stage 5.

### Scripts

- **`scripts/field-map.sh`** — dumps the field and option UID map from a running Orchestra.
  `./field-map.sh <workspace-uid> [task|project] [--json]`
