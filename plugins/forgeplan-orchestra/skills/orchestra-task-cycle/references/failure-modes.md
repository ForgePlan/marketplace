# Failure modes and limits

Everything here was confirmed by reading the Orchestra source, then re-verified live on
2026-09-06 against **both** server variants Orchestra ships. These fail **silently** — they return
success, or an empty result, and nothing indicates the call did not do what it appeared to.

## Two servers, not one

The Orchestra desktop app can expose **two different MCP endpoints** with different tool sets and
different behaviour. Identify which one you are on before trusting any row below:

| | App endpoint | Agent (token) endpoint |
|---|---|---|
| Auth | none | `Authorization: Bearer <token>` |
| `serverInfo.name` | `orchestra-mcp-server` | workspace-flavoured (e.g. `orchestra-gogocat`) |
| Only here | `navigate_to`, `get_ui_context` | `add_relation`, `remove_relation`, `approve_action`, `switch_workspace`, `list_workspaces` |

Rows below marked **[app]** / **[agent]** hold on one endpoint only; unmarked rows hold on both.

## Silent failures

| Do not | What actually happens |
|---|---|
| Trust `get_relations` for dependencies | Relations live in `related`/`relateds_uid` on the chat document; custom-field values live in `custom`. Two disjoint stores. A task with four `Blocked by` references returns `[]`. Always, forever. (`add_relation`/`remove_relation` now exist **[agent]** and write both sides in one call — but relations still cannot be queried via `fieldFilters`, so `Blocked by` remains the dependency mechanism.) |
| Call `read_messages` once | Default limit is 50 (the server's own instructions string says 20 and is wrong). The chat *overrides* the description, so an unpaged read loses the override. Page with `beforeTimestamp = oldestTimestamp` while `hasMore`. |
| Expect to read a thread | `send_message` accepts `threadUid`; `read_messages` has no thread parameter. A clarification left inside a thread is invisible. Treat `threadStats.messagesCount > 0` as a signal to ask. |
| Use `search_messages` to find an old decision | Requires `chatUid`, loads only the last page of that one chat, plain substring match. No pagination, no cross-chat scope, no ranking. Star decisions when made instead. |
| Pass two fields to `groupBy` | The SDK nests recursively; the MCP serializer walks only the top level and skips `isGroup` children. Every group returns `count: 0`. One field only — for Area×Phase, run one grouped query per Area. |
| Trust `limit` when grouped | It applies **per group**. `limit:50` over 5 groups returns up to 250 entities. Trust the group `count`, not the payload length. |
| Report a number from `repoType:"project"` | It silently inherits that project's saved default-view filters as the baseline. For any number that will be reported, use `folder` + `all` with an explicit `project_uid` filter. |
| Pass `viewUid` | Declared in the input, never destructured in the implementation. Accepted, ignored, does not error — a query that looks scoped and is not. Use `repoType:"view"` + `repoUid:<view chat uid>`. |
| Assume a bad UID in a `chat` field errors **[app]** | `processFieldValue` has branches for option, status and date only. A chat reference passes straight through unvalidated. A wrong task UID persists as a dangling reference and never appears in `failedFields`. Re-query and confirm each entry resolved to a `displayValue`. (**[agent]** validates now: a bogus UID lands in `failedFields` as "Value references an entity that doesn't exist or isn't accessible".) |
| Filter **any** field with `null` to mean "not set" | Verified live 2026-09-06, both endpoints: `fieldFilters:{ <uid>: null }` returns `filteredCount: 0` for **every** field type tested — multi-value chat (119 of 147 empty → 0), single option (111 empty → 0), text (141 empty → 0), member (147 empty → 0) — while the positive-control filter on the same field works. The server's own instructions still advertise `null` for "unassigned". Fetch the field with `includeFields` and filter client-side. |
| Query "no due date" | DATE filters require a non-null bound in both include and exclude mode. Passing a DATE or NUMBER field to `fieldFilters` is a hard error — use `dateFilters` / `numericFilters`. Diff `counts` instead. |
| Read `failedFields` the same way everywhere | `create_entity` reports it **per entity** inside `created[i]`; `update_entity` reports it top-level. |
| Treat `Missing or insufficient permissions` as an error **[app]** | In `failedFields` it usually means the field already holds that value. Setting `Status=backlog` on a new task reports as failed because `backlog` is the default. Verify with a query. (**[agent]** fixed: a same-value write returns `unchangedFields`, and a real denial is a real error.) |
| Trust `folder:"all"` as the whole board **[agent]** | Observed live: `query_entities(folder:"all")` returned 128 tasks while `get_workspace_overview` counted 147 — one entire project (19 tasks) silently absent from the folder query, though reachable via `get_entity`, `search_entities` and its own project query. Stable across fresh sessions. For any number that will be reported, cross-check `filteredCount` against `get_workspace_overview` totals and reconcile per-project. |
| Call `read_messages` / `search_messages` **[agent]** | Both hang until transport timeout (60s+), on every chat tested, while the sibling tools answer instantly. Message reading currently works only on the app endpoint. |
| Call `get_mentions` / `get_unread_chats` / `get_starred_messages` / `get_reminders` **[agent]** | Honest, instant error: "only available in Electron/web-app context". Not silent — listed so a runbook degrades gracefully instead of retrying. |
| Call `read_document` / `edit_document` / `move_entity` / `create_entity` **[agent]** | Document layer unimplemented ("Not implemented", `service2.getBlocks is not a function`); `move_entity` errors (`Cannot use method 'canMove'`); `create_entity` returns PERMISSION_DENIED even for a workspace owner while `update_entity` field-writes and `manage_field` succeed. Do creation, moves and document edits via the app endpoint. |
| Read silence plus a reaction as approval | Message reactions exist in the product and are available to Orchestra's in-app agent, but no MCP tool exposes them and the message serializer omits them entirely. A human's 👍 is invisible. |

## Not reachable from MCP

Do not design around these.

- **Saved views** — no create/list/edit tool, and `create_entity` has no `view` type. Worse, views
  are *personal*: the query filters on `observers_uuid array-contains <session user>`, so a view the
  owner builds is invisible to the agent. A human must build the cross-project board once, in the app.
- **`add_relation`** **[app]** — still absent from the app endpoint. On the agent endpoint it IS
  registered now (`add_relation` + `remove_relation`), writes both sides in one call, and the link
  shows from either entity. Relations still cannot participate in `fieldFilters`, so `Blocked by`
  (a queryable chat field) remains the working dependency mechanism.
- **Agent triggers and automations** — the only automation engine (`message_in_chat`,
  `task_in_project`, `schedule`, and three more). Built in-app. MCP-created tasks *do* trip them.
- **Field `config` read-back** — `manage_field` now takes `config` (NUMBER only: `children_sum` —
  the product's only rollup — plus `format`, `precision`, `auto_increment*`), and the create
  succeeds. But `list_fields` never returns `config`, so what was set cannot be read back or
  verified — write-only. `chat_type` (CHAT) and `show_guests` (MEMBER) are still rejected by
  Firestore rules and stay web-client-only.
- **Chat settings** — `primary_status_field`, `auto_archive_statuses`, `kanban_default_grouping`.
- **Fields on non-task entities** — `createField` hardcodes `target_type: [TASK]`. Structured
  metadata cannot be put on project entities; a human must create such a field, after which MCP can
  read and set it.
- **Field values on checklist items** — only `assigneeUid` is settable. Per-item due dates and
  reordering exist on the SDK but not in the MCP input.
- **Webhooks** — a complete schema with no API, UI or MCP path.
- **Bulk update** (`update_entity` is strictly single-entity — an `entities[]` array is rejected by
  typia), **archiving**, **file upload**, **interactive message buttons**. Structured approval now
  exists on the agent endpoint as `approve_action` (retry a refused call with the id from its
  error), though the server's own instructions do not document it.

## Does not exist in Orchestra at all

Recurring tasks. Task or project templates. Checklist templates or clone. Time tracking, estimates,
story points. Typed dependencies (no blocks/duplicates enum anywhere). Formulas, computed or rollup
fields beyond `children_sum`. Task import/export. Workspace-wide message search. Auto-numbering.
Option reordering. Table, Gantt and Calendar layouts (commented out — only list and kanban ship).

## Project descriptions

`update_entity` takes no `description` parameter and projects expose no description field in
`list_fields` — but **`edit_document` works on a project entity** (verified live on the app
endpoint: `replace_all` + `read_document` round-trip). Two caveats: the agent endpoint cannot do
this (document layer unimplemented there), and the markdown round-trip is lossy — `- ` lists come
back as `* `, `_em_` as `*em*`, nested emphasis gains escaped spaces and doubled markers, and the
entity name is prepended as an H1. Never diff the rendered text for idempotency; keep a source
fingerprint instead.
