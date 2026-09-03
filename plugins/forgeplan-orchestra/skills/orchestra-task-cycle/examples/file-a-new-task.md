# Worked example — file a new task

Filing is one call per object, with everything set inline. A field that requires coming back later
does not get filled — measured 0 out of 32 for exactly those fields on a live board.

## Check for a duplicate first

```js
search_entities({ query: "semantic compiler", types:["task"] })
```

Duplicates are noise nobody cleans up, and `search_entities` is cheap.

## Create with every field inline

```js
create_entity({ entities: [{
  type: "task",
  name: "H3 — Semantic compiler to the MVS artifact set",
  contextUid: "<Hub project uid>",
  description: "<markdown, see assets/task-description.md>",
  fields: [
    { fieldUid:"<Area>",      value:"<Hub option uid>" },
    { fieldUid:"<Role>",      value:"<Implementer option uid>" },
    { fieldUid:"<Depth>",     value:"<Critical option uid>" },
    { fieldUid:"<Phase>",     value:"<Shape option uid>" },
    { fieldUid:"<Priority>",  value:"high" },
  ],
}]})
```

Notes on this call:

- `Status` is omitted — `backlog` is the default, and setting it explicitly comes back in
  `failedFields` as already-held. Omitting it avoids the false alarm.
- `Artifact` and `Type` are omitted because no Hub-local RFC exists yet. `Type` is set **only**
  alongside `Artifact`.
- `Executor` and `Model` are omitted by design — they are pickup-time fields.
- Read `failedFields` **inside `created[0]`**, not at top level. `update_entity` puts it top-level;
  `create_entity` puts it per entity.

## Add the dependency

```js
update_entity({ entityUid:"<H3 uid>", fields:[
  { fieldUid:"<BlockedBy>", value:["<H2 uid>","<S2 uid>"] },
]})
```

Chat-dataType values are **not validated**. A wrong UID persists as a dangling reference and never
appears in `failedFields`. Read it back:

```js
query_entities({ repoType:"folder", repoUid:"all",
  fieldFilters:{ "<BlockedBy>": "<H2 uid>" }, includeFields:["<BlockedBy>"] })
```

Each entry must show a `displayValue` naming a real task. A bare UID is a dangling reference.

## Create the gate checklist in the same turn

```js
manage_checklist({ action:"create", chatUid:"<H3 uid>", name:"Steps (gate)", items:[
  { text:"Emits manifest.json, ontology.nt.zst and runtime-schema.json.zst" },
  { text:"manifest.json validates against the schema frozen in S2" },
  { text:"Every artifact has its sha256 recorded in the manifest" },
  { text:"Same package lock in produces an identical snapshot checksum out" },
]})
```

Create `Steps (gate)` first, in the filing turn. If the turn is cut short, keeping the definition of
done and losing a to-do beats the reverse.

Item text is **plain text only** — markdown and mentions land literally, backticks and all. Strip
backticks from artifact IDs. Item order is creation order and permanently so; the MCP input exposes
no reorder parameter.

## Verify the attach

```js
get_checklists({ chatUid:"<H3 uid>" })
```

A create issued immediately after task creation has been observed to return success and leave zero
checklists. On an empty result, retry once and report the outcome either way.

## Filing a whole wave

`create_entity` takes an array, and `prevUid` / `nextUid` / `toStart` place each task among its
siblings. Filing a wave in one call keeps the board reading top-to-bottom as the dependency order.

## A step that is really a subtask

A checklist item tracks a step of one piece of work. Something with its own status, its own
executor and its own gate is a **subtask**:

```js
create_entity({ entities:[{ type:"task", name:"H3.1 — runtime-schema compiler",
  contextUid:"<H3 task uid>", description:"…", fields:[ … ] }]})
```

`contextUid` pointing at a *task* rather than a project is what makes it a subtask.
