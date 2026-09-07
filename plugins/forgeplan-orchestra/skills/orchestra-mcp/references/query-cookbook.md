# Query cookbook

How to ask Orchestra a question cheaply and get an answer you can report. Resolve every field and
option UID at runtime first — see `fields.md`.

`fieldFilters` accepts **chat-dataType fields**, not just options and members, which is what makes an
entity reference queryable. Matching is OR-within-field, AND-across-fields. `null` matches
"unset or empty" — including a multi-value field holding `[]`.

## Cheapest question first

- `output:"counts"` returns `totalCount` + `filteredCount` with no entity walk.
- `output:"uids"` returns only IDs.
- `includeFields:[...]` allowlists the per-entity field map; `[]` omits field values entirely.
- **Omitting `includeFields` returns every field on every entity** — expensive on a full board.

## Filtering by "not set"

```js
query_entities({ repoType:"folder", repoUid:"all",
  fieldFilters:{ "<chat field uid>": null },
  includeFields:["<chat field uid>"] })
```

Verify the arithmetic once per board: a `null` filter plus `excludeFilters` on the **same** field
must add up to the unfiltered total (measured on a live board: 119 + 28 = 147). If it does not, you
are on a build where `null` is broken — before `0.141-beta-0906` it matched **nothing at all**, on
every field type, so a query like this returned "nothing" on a full board. Workaround there: drop
the `null` filter and keep the entities whose value is `[]` or absent client-side.

## Reverse lookup: what references this entity

```js
query_entities({ repoType:"folder", repoUid:"all",
  fieldFilters:{ "<chat field uid>": "<the entity uid>" }, output:"uids" })
```

The impact set of finishing something — only possible because chat-dataType fields are filterable
and native relations are not.

## Sweeps

```js
// overdue across every project
query_entities({ repoType:"folder", repoUid:"expired" })

// what closed recently
query_entities({ repoType:"folder", repoUid:"recently_completed" })

// the whole board grouped, counts precomputed
query_entities({ repoType:"folder", repoUid:"all",
  groupBy:["<option field uid>"], includeFields:["<option field uid>"] })

// stale: untouched since a timestamp
query_entities({ repoType:"folder", repoUid:"all",
  dateFilters:{ last_activity:{ to:"<iso timestamp>" } },
  sort:[{ fieldUid:"last_activity", direction:"asc" }], output:"uids" })
```

Folder ids that exist: `all`, `archived`, `expired`, `today`, `recently_completed`, `favorite`,
`assigned_to_me`. Those seven are the whole list — an unrecognised name is rejected, not silently
treated as `all`. (`assigned_to_me` resolves against the MCP session user, which is useless on a
board where the assignee is never set.) `repoUid: "checklists"` exists in the SDK but the MCP
serializer returns `null` for anything that is not a Chat — read checklists with `get_checklists`.

## Auditing by message volume

```js
// entities whose chat is empty
query_entities({ repoType:"folder", repoUid:"all",
  numericFilters:{ messages_count:{ eq:0 } }, output:"uids" })

// entities whose chat has content — read it before acting on any of them
query_entities({ repoType:"folder", repoUid:"all",
  numericFilters:{ messages_count:{ gt:0 } }, output:"uids" })
```

`messages_count` is the only mechanical way to ask "was anything ever said here".

## Filterable system fields

The repo is queried with `includeHidden: true`, so read-only system fields can be filtered and
sorted: `last_activity`, `messages_count`, `last_message_time`, `due_date`, `created_at`,
`completed_at`, `parent_uid`, `project_uid`.

## Integrity check after writing an entity reference

Chat-dataType values are not validated on every build. After writing one, read the field back and
confirm each entry resolved:

```js
query_entities({ repoType:"folder", repoUid:"all",
  includeFields:["<chat field uid>"] })
// every entry must show a displayValue naming a real entity.
// a bare UID with no displayValue is a dangling reference.
```

## Numbers you are about to report

Cross-check `filteredCount` against `get_workspace_overview`. On one measured build
`query_entities(folder:"all")` returned 128 while the overview counted 147 — a whole project absent
from the folder query, with no error. See `failure-modes.md`.
