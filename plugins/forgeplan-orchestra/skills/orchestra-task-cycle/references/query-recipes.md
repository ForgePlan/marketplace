# Query recipes

The two questions a dependency-ordered board exists to answer, plus the sweeps worth running at
session start. Resolve every UID at runtime first.

`fieldFilters` accepts **CHAT-dataType fields**, which is what makes `Blocked by` pay off. Matching
is OR-within-field, AND-across-fields. `null` matches genuinely-unset — see the warning below
for why that is not the same as "empty".

## What can start right now

⚠ **`null` does not work here.** Tested 2026-09-03 on a live board: a multi-value chat field with no
references stores `[]`, not unset, and `fieldFilters: { "<BlockedBy>": null }` returns **zero** rows
while the same board has seven unblocked tasks. `null` matches genuinely-unset only.

Fetch the field and filter client-side — on a board of tens of tasks this is one cheap call:

```js
query_entities({ repoType:"folder", repoUid:"all",
  fieldFilters:{ "<Area uid>": ["<System>","<Hub>","<Runtime>"] },
  excludeFilters:{ "status": "<Done option uid>" },
  includeFields:["<BlockedBy uid>","<Area uid>","<Role uid>"] })
// then keep entities whose BlockedBy value is [] or absent
```

The `Area` filter alone returns the full board correctly — the defect is specific to `null` against a
populated-but-empty multi-value chat field.

## What unblocks when a task lands

```js
query_entities({ repoType:"folder", repoUid:"all",
  fieldFilters:{ "<BlockedBy uid>": "<the task uid>" }, output:"uids" })
```

The reverse dependency lookup — the impact set of finishing something.

## Session-start sweeps

```js
// overdue across every project
query_entities({ repoType:"folder", repoUid:"expired" })

// what closed recently
query_entities({ repoType:"folder", repoUid:"recently_completed" })

// the whole board by phase, counts precomputed
query_entities({ repoType:"folder", repoUid:"all",
  groupBy:["<Phase uid>"], includeFields:["<Area uid>","<Artifact uid>"] })

// stale: filed, untouched for 14 days
query_entities({ repoType:"folder", repoUid:"all",
  dateFilters:{ last_activity:{ to:"<iso timestamp>" } },
  sort:[{ fieldUid:"last_activity", direction:"asc" }], output:"uids" })
```

Undocumented but implemented and unit-tested folder ids: `all`, `archived`, `expired`, `today`,
`recently_completed`, `favorite`, `assigned_to_me`. (`assigned_to_me` resolves against the MCP
session user, which is useless where `Assignee` is never set.)

`repoUid: "checklists"` exists in the SDK but the MCP serializer returns `null` for anything that is
not a Chat — assume a board-wide checklist query does **not** work until someone probes it.

## Protocol compliance audits

```js
// Done tasks that never got a completion report
query_entities({ repoType:"folder", repoUid:"all",
  numericFilters:{ messages_count:{ eq:0 } }, output:"uids" })
```

`messages_count` is the only mechanical way to audit the report-on-completion rule. A non-zero count
on a task also means the chat has content that must be read before starting.

```js
// tasks whose chat has content — read before touching any of these
query_entities({ repoType:"folder", repoUid:"all",
  numericFilters:{ messages_count:{ gt:0 } }, output:"uids" })
```

## Cost control

- `output:"counts"` returns `totalCount` + `filteredCount` with no entity walk — the cheapest
  possible question.
- `output:"uids"` returns only IDs.
- `includeFields:[...]` allowlists the per-entity field map; `[]` omits field values entirely.
- Omitting `includeFields` returns every field on every entity — expensive on a full board.

## Filterable system fields

The repo is built with `includeHidden: true` specifically so agents can filter and sort read-only
system fields: `last_activity`, `messages_count`, `last_message_time`, `due_date`, `created_at`,
`completed_at`, `parent_uid`, `project_uid`.

## Integrity check after writing dependencies

Chat-dataType values are not validated. After any `Blocked by` write, read the field back and
confirm each entry resolved:

```js
query_entities({ repoType:"folder", repoUid:"all",
  includeFields:["<BlockedBy uid>"] })
// every entry must show a displayValue naming a real task.
// a bare UID with no displayValue is a dangling reference.
```
