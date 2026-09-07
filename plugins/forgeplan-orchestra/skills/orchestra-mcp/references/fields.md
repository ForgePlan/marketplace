# Fields — shapes, traps and what not to create

Fields define what an entity carries beyond its name. They are **workspace-scoped**, so the same
field name has a different uid in another workspace.

## Resolve at runtime, always

Never hardcode a field or option uid. Never send an option **name** where a uid is required: for
custom fields it fails silently into `failedFields`, and for the platform's built-ins it sometimes
succeeds by coincidence — which makes a name-based implementation look half-working rather than
broken.

**Do not assume which fields are system fields.** Read `isSystem` from `list_fields` rather than
inferring it from a familiar name like `Status` or `Priority` — on a measured workspace those were
`type: "custom"`. `scripts/field-map.sh` groups by the live value for exactly that reason.

## Value shapes

What you send on write, and what comes back on read:

| dataType | Write | Read |
|---|---|---|
| `status`, `option` | the **option uid** (multi-value: array of uids) | `{ value, displayValue }` |
| `member` | the member uid (multi: array) | `{ value, displayValue }` |
| `chat` | an entity uid (multi: array) | `{ value, displayValue }`; a bare uid without `displayValue` is a dangling reference |
| `date` | a single ISO 8601 string sets the due date; `{ start_at, end_at }` only for a real range | ISO string, or `{ start_at, end_at }` |
| `text`, `number` | the bare value | the bare value |
| `link` | a URL string, an array of them, or `{ url, text? }` | the wrapped `{url, text}` array |

Clear a field with `null` or `[]`.

**Two containers for the same data.** `query_entities` returns `fields` as a **dict keyed by field
uid**; `get_entity` returns it as an **array of objects**. The value shapes inside agree; only the
container differs. Code that reads `fields[uid].value` in one and the same expression in the other
is silently wrong in one of them — normalise at the boundary.

## Why an entity reference belongs in a chat-dataType field

`chat` holds entity references, like the system `Project` and `Parent` fields. Unlike native
relations, a chat field **can be queried by `fieldFilters`** — so a dependency, a link to a parent
document or a cross-reference modelled as a chat field is answerable by a query, while the same
thing modelled as a relation is not. That asymmetry is the single most useful thing to know when
designing a board.

## Two field types never to create

- **A second `status`-dataType field.** Setting the workspace's primary status field to an
  auto-archive status stamps `completed_at`, and `autoArchiveStatuses` defaults to the **last
  option**. A lifecycle field modelled as `status` would therefore silently complete entities when
  it reaches its final option. Model any secondary lifecycle as `option`.
- **`checklist`-dataType.** MCP accepts it, but the web client excludes it from the creatable list
  and its editor binds only to a ChecklistItem. The result is an invisible field inherited by every
  task.

## Option sets are append-only

No reorder parameter exists on `manage_field` or `manage_field_option`, and `order_rank` drives
board group order. Create option sets **complete and in display order**. An omitted colour is
assigned randomly.

Flipping `isMulti` on a populated field is effectively one-way: true→false keeps element `[0]` and
drops the rest, and reads self-heal a mismatch rather than erroring.

## `config` is write-only

`manage_field` accepts a `config` object — NUMBER fields only: `children_sum` (the product's only
rollup), `format`, `precision`, `auto_increment*`. The create succeeds, but `list_fields` never
returns `config`, so what was set cannot be read back or verified. Individual keys may also be
refused while the field is still created — the response carries a warning naming them. Read it.
