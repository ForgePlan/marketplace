# Failure modes and limits

Everything here was confirmed by reading the Orchestra source. These fail **silently** — they return
success, or an empty result, and nothing indicates the call did not do what it appeared to.

## Silent failures

| Do not | What actually happens |
|---|---|
| Trust `get_relations` for dependencies | Relations live in `related`/`relateds_uid` on the chat document; custom-field values live in `custom`. Two disjoint stores. A task with four `Blocked by` references returns `[]`. Always, forever. |
| Call `read_messages` once | Default limit is 50 (the server's own instructions string says 20 and is wrong). The chat *overrides* the description, so an unpaged read loses the override. Page with `beforeTimestamp = oldestTimestamp` while `hasMore`. |
| Expect to read a thread | `send_message` accepts `threadUid`; `read_messages` has no thread parameter. A clarification left inside a thread is invisible. Treat `threadStats.messagesCount > 0` as a signal to ask. |
| Use `search_messages` to find an old decision | Requires `chatUid`, loads only the last page of that one chat, plain substring match. No pagination, no cross-chat scope, no ranking. Star decisions when made instead. |
| Pass two fields to `groupBy` | The SDK nests recursively; the MCP serializer walks only the top level and skips `isGroup` children. Every group returns `count: 0`. One field only — for Area×Phase, run one grouped query per Area. |
| Trust `limit` when grouped | It applies **per group**. `limit:50` over 5 groups returns up to 250 entities. Trust the group `count`, not the payload length. |
| Report a number from `repoType:"project"` | It silently inherits that project's saved default-view filters as the baseline. For any number that will be reported, use `folder` + `all` with an explicit `project_uid` filter. |
| Pass `viewUid` | Declared in the input, never destructured in the implementation. Accepted, ignored, does not error — a query that looks scoped and is not. Use `repoType:"view"` + `repoUid:<view chat uid>`. |
| Assume a bad UID in a `chat` field errors | `processFieldValue` has branches for option, status and date only. A chat reference passes straight through unvalidated. A wrong task UID persists as a dangling reference and never appears in `failedFields`. Re-query and confirm each entry resolved to a `displayValue`. |
| Filter a multi-value chat field with `null` to mean "no references" | An empty multi-value field stores `[]`, which `null` does not match — `null` matches genuinely-unset only. Tested: returns 0 rows on a board with 7 unblocked tasks. Fetch the field with `includeFields` and filter client-side. |
| Query "no due date" | DATE filters require a non-null bound in both include and exclude mode. Passing a DATE or NUMBER field to `fieldFilters` is a hard error — use `dateFilters` / `numericFilters`. Diff `counts` instead. |
| Read `failedFields` the same way everywhere | `create_entity` reports it **per entity** inside `created[i]`; `update_entity` reports it top-level. |
| Treat `Missing or insufficient permissions` as an error | In `failedFields` it usually means the field already holds that value. Setting `Status=backlog` on a new task reports as failed because `backlog` is the default. Verify with a query. |
| Read silence plus a reaction as approval | Message reactions exist in the product and are available to Orchestra's in-app agent, but no MCP tool exposes them and the message serializer omits them entirely. A human's 👍 is invisible. |

## Not reachable from MCP

Do not design around these.

- **Saved views** — no create/list/edit tool, and `create_entity` has no `view` type. Worse, views
  are *personal*: the query filters on `observers_uuid array-contains <session user>`, so a view the
  owner builds is invisible to the agent. A human must build the cross-project board once, in the app.
- **`add_relation`** — implemented, permission-checked and exported, but registered only for
  Orchestra's in-app AI-SDK, not for MCP.
- **Agent triggers and automations** — the only automation engine (`message_in_chat`,
  `task_in_project`, `schedule`, and three more). Built in-app. MCP-created tasks *do* trip them.
- **Field `config`** — `manage_field` has no config parameter, so the NUMBER `children_sum` rollup
  (the only aggregation in the entire product), format, precision and CHAT type restriction are
  web-client-only.
- **Chat settings** — `primary_status_field`, `auto_archive_statuses`, `kanban_default_grouping`.
- **Fields on non-task entities** — `createField` hardcodes `target_type: [TASK]`. Structured
  metadata cannot be put on project entities; a human must create such a field, after which MCP can
  read and set it.
- **Field values on checklist items** — only `assigneeUid` is settable. Per-item due dates and
  reordering exist on the SDK but not in the MCP input.
- **Webhooks** — a complete schema with no API, UI or MCP path.
- **Bulk update** (`update_entity` is strictly single-entity), **archiving**, **file upload**,
  **structured human-in-the-loop approval**, **interactive message buttons**.

## Does not exist in Orchestra at all

Recurring tasks. Task or project templates. Checklist templates or clone. Time tracking, estimates,
story points. Typed dependencies (no blocks/duplicates enum anywhere). Formulas, computed or rollup
fields beyond `children_sum`. Task import/export. Workspace-wide message search. Auto-numbering.
Option reordering. Table, Gantt and Calendar layouts (commented out — only list and kanban ship).

## Project descriptions

**Cannot be set over MCP.** `update_entity` takes no `description` parameter and projects expose no
description field. They must be pasted by hand.
