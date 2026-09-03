# Worked example — take a task, work it, close it

A full pass through the seven stages on one real task. Field UIDs are shown as placeholders because
they are per-workspace and must be resolved at runtime.

## 0 — ORIENT

```js
list_fields({ contextUid: "<workspace uid>", targetType: "task" })
```

Build two maps from the response: field name → `uid`, and per option field, option name → option
`uid`. Everything below uses them.

```js
query_entities({ repoType:"folder", repoUid:"all",
  fieldFilters:{ "<Area>": ["<System>","<Hub>","<Runtime>"] },
  excludeFilters:{ "status": "<Done>" },
  includeFields:["<BlockedBy>","<Area>","<Role>","<Artifact>"] })
// keep the entities whose BlockedBy is [] or absent — `null` as a filter returns zero rows here
```

→ `S1 — Approve R1–R7, freeze and activate RFC-001` is unblocked, Area System, Role Guardian.

**Gate 0 passed:** S1 is the right task — nothing blocks it and every Hub and Runtime wave waits on it.

## 1 — READ

```js
get_entity({ entityUid:"<S1 uid>", includeFieldsMetadata:true })
```

→ `Done when`: owner has read R1–R7 and accepted or corrected; corrections applied *before*
activation; `forgeplan activate RFC-001` run and status reads active.

```js
read_messages({ chatUid:"<S1 uid>" })
```

→ `{ messages: [...], hasMore: false }`. Nothing to page. Had `hasMore` been true, repeat with
`beforeTimestamp: oldestTimestamp` until false.

Check every message for `threadStats.messagesCount > 0` — a thread cannot be read and must be asked
about.

```js
get_checklists({ chatUid:"<S1 uid>" })
```

→ `Steps (gate)`, three items, none ticked.

**Gate 1 passed:** the acceptance criteria are known and the chat did not change them.

## 2 — CLAIM

```js
update_entity({ entityUid:"<S1 uid>", fields:[
  { fieldUid:"<Status>",   value:"doing" },
  { fieldUid:"<Phase>",    value:"<Code>" },
  { fieldUid:"<Executor>", value:"<CC>" },
  { fieldUid:"<Model>",    value:"<Opus>" },
]})
```

Response carries `updatedFields`. Read `failedFields` — empty here. Had `Status` appeared there with
`Missing or insufficient permissions`, that would mean the field already held `doing`, not a real
error; confirm with a query rather than retrying.

**Gate 2 passed:** the board shows Doing, and names the runtime and model.

## 3 — WORK

Do the work. Tick each item the moment its proof exists, not at the end.

```js
manage_checklist_item({ action:"update", itemUid:"<item 1>", isChecked:true })
```

If a step emerges that nobody anticipated, add it — never rewrite the list, never untick.

```js
manage_checklist_item({ action:"add", checklistUid:"<Steps (gate)>",
  text:"R3 trust-store rotation reviewed - overlap window stated in the RFC" })
```

**Gate 3 passed:** every item is ticked, or has a stated reason it is not.

## 4 — EVIDENCE

```bash
forgeplan activate RFC-001
forgeplan get RFC-001        # status reads active — the observable named in item 3
```

Artifacts go through the forgeplan CLI or MCP. Writing under `.forgeplan/` is blocked by a
fail-closed hook, by design.

**Gate 4 passed:** each `Done when` line has something openable behind it.

## 5 — REPORT

```js
send_message({ chatUid:"<S1 uid>", content:
`## Что сделано
R1–R7 приняты без правок. \`forgeplan activate RFC-001\` выполнен — статус active, R_eff 1.00.

## Что не сделано
Схемы (S2) и фикстуры (S3) не тронуты — это отдельные задачи, теперь разблокированы.

## На что смотреть
H1 и R4 стали startable. R4 обязан определить миграцию локальной истории \`ontologyVersion\`
(RFC-001 R7) — если это пропустить, у Runtime останутся две семантические идентичности.` })
```

Task chats are pre-authorised. Channels, groups and DMs are not.

**Gate 5 passed:** the report names what was not done.

## 6 — CLOSE

```js
update_entity({ entityUid:"<S1 uid>", fields:[
  { fieldUid:"<Status>", value:"done" },
  { fieldUid:"<Phase>",  value:"<Done>" },
]})
```

No `Branch` — this task was not branch-scoped.

```js
get_checklists({ chatUid:"<S1 uid>" })   // all items ticked
```

**Gate 6 passed:** status, phase and checklist agree with reality.

## Blocked instead

Had the owner been unavailable:

```js
update_entity({ entityUid:"<S1 uid>", fields:[
  { fieldUid:"<Status>", value:"<Blocked>" },
]})
```

`Phase` is **not** written — a blocked task keeps the phase it had. Writing one alongside `Blocked`
rolls it back to `Shape` and destroys the record of how far it got.

The description then states both halves:

```
BLOCKED: waiting on owner review of R1–R7
TRIGGER: owner accepts or supplies corrections in the task chat
```

"Later" is not a trigger.
