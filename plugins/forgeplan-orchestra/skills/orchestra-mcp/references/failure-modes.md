# Failure modes and limits

Everything here was confirmed by reading the Orchestra source, then re-verified live — most recently
on **2026-09-06 against build `0.141.0-beta.20260906211602`**, the one that closed the bulk of the
earlier list. Rows kept below are the ones still reproducing. They fail **silently**: they return
success, or an empty result, and nothing indicates the call did not do what it appeared to.

## Which server you are on

An Orchestra desktop app can expose **more than one MCP endpoint**, and their capabilities differ.
Resolve yours with `scripts/orch-verify.sh` before trusting a row — it prints `serverName`,
`serverVersion` and `endpointVariant`.

| | App endpoint | Agent (token) endpoint |
|---|---|---|
| Auth | none | `Authorization: Bearer <token>` |
| `serverInfo.name` | `orchestra-mcp-server` | deployment-flavoured (`orchestra-beta-claude-code`, `orchestra-gogocat`, …) |
| Acts as | the signed-in human | **the deployed agent** — a bot member with its own uid |
| Only here | `navigate_to`, `get_ui_context` | `add_relation`, `remove_relation`, `approve_action`, `switch_workspace`, `list_workspaces`, `add_members`, `remove_members`, `get_agent_prompt` |

Rows marked **[app]** / **[agent]** hold on one variant only; unmarked rows hold on both. Where a row
says "fixed in 0.141-beta-0906", an older agent build still has it.

**The agent endpoint is not the human.** `get_current_context` returns the *bot's* uid, not yours, and
`get_agent_prompt` returns instructions the bot's owner deployed. Pin the identity you expect
(`userUid` in `orchestra.json`) — a server swapped underneath you is otherwise invisible.

**Field writes and chat writes are governed separately.** A bot can update a task's fields and tick
its checklist while `send_message` into that same task returns `7 PERMISSION_DENIED` — measured
2026-09-08, both calls seconds apart on one task. The gate is **membership**, not the endpoint: the
bot was not a member of that chat. `add_members` with the bot's uid returned `added: true` and the
identical message then posted, `senderUid` the bot.

So a refused report is repairable — but repairing it is a **team-visible act**: `add_members`
notifies everyone already on the task. Ask the owner first; never add the bot to be helpful. Where
the report still cannot be posted, produce it and hand it to the human — the requirement is that the
report exists, not that the board carries it.

## Silent failures

| Do not | What actually happens |
|---|---|
| Trust `get_relations` for dependencies | Relations and custom-field values are two disjoint stores. A task holding four references in a chat-dataType field returns `[]` from `get_relations`. `add_relation`/`remove_relation` **[agent]** do work and write both sides in one call — but relations still cannot be queried via `fieldFilters`, so a chat-dataType field remains the only queryable way to model a dependency. |
| Call `read_messages` once | Default limit is 50. The chat *overrides* the description, so an unpaged read loses the override. Page with `beforeTimestamp = oldestTimestamp` while `hasMore`. |
| Expect to read a thread | `send_message` accepts `threadUid`; `read_messages` still has no thread parameter. Re-verified 2026-09-06 three ways: the root message reports `threadStats.messagesCount`, but the reply is absent from `read_messages`, absent from `aroundMessageUid` given the reply's own uid, and absent from `search_messages` on text unique to it. The agent *sees that a thread exists* and cannot read it. Treat `threadStats.messagesCount > 0` as a signal to ask a human. |
| Use `search_messages` to find an old decision | Requires `chatUid`, one chat only, plain substring match, no cross-chat scope or ranking. It also does not see thread replies (row above). Star decisions when made instead. |
| Pass two fields to `groupBy` | The MCP serializer walks only the top level and skips `isGroup` children. Every group returns `count: 0`. One field only — to group by two dimensions, run one grouped query per value of the outer field. |
| Trust `limit` when grouped | It applies **per group**. `limit:50` over 5 groups returns up to 250 entities. Trust the group `count`, not the payload length. |
| Report a number from `repoType:"project"` | It silently inherits that project's saved default-view filters as the baseline. For any number that will be reported, use `folder` + `all` with an explicit `project_uid` filter. |
| Assume a bad UID in a `chat` field errors **[app]** | A chat reference passes through unvalidated and persists as a dangling reference, never appearing in `failedFields`. Re-query and confirm each entry resolved to a `displayValue`. (**[agent]** validates: a bogus UID lands in `failedFields` with "Value references an entity that doesn't exist or isn't accessible".) |
| Query "no due date" | DATE filters require a non-null bound in both include and exclude mode. Passing a DATE or NUMBER field to `fieldFilters` is a hard error — use `dateFilters` / `numericFilters`. Diff `counts` instead. |
| Read `failedFields` the same way everywhere | `create_entity` reports it **per entity** inside `created[i]`; `update_entity` reports it top-level, and in the batch form each entity carries its own alongside a top-level `failed`. |
| Treat `Missing or insufficient permissions` as an error **[app]** | In `failedFields` it usually means the field already holds that value. Verify with a query. (**[agent]** fixed: a same-value write returns `unchangedFields`; a real denial is a real error.) |
| Assign someone who is not a project member | Documented by the server itself: the write is dropped because adding them to the project needs a confirmation there is nobody to give — **and it is reported as though it succeeded**. Assign an existing member, add the person first, or set `assigneeUid` at `create_entity` time (which does work). Read the value back if it matters. |
| Assume `delete_entity` reports its own failure | See "Deletion stops working" below — it hangs to transport timeout with no error, and once it starts, it affects everything. |
| Read silence plus a reaction as approval | Reactions exist in the product but no MCP tool exposes them and the message serializer omits them. A human's 👍 is invisible. |

## Deletion stops working, and says nothing

Observed live 2026-09-06 on `0.141.0-beta.20260906211602`. In one session: four deletions succeeded,
then **seven consecutive timeouts** on unrelated objects — including a pristine empty project created
seconds earlier, and a plain task.

What it is **not** (each ruled out by a control that succeeded): not the entity's content — an empty
project deleted fine minutes before an identical one hung; not relations — an entity carrying a
dangling relation to an already-deleted partner deleted instantly; not the entity type — both
projects and tasks hang once it starts.

What holds:

- **It is global, not per-object.** After the first hang, every subsequent delete hangs. Concluding
  "this object is special, skip it" is the wrong inference and the easy one to make.
- **Only deletion breaks.** `create_entity`, `update_entity`, `add_relation` and every read stay
  instant on the very object that refuses to delete — a rename on it returns `updated:["name"]` in
  milliseconds. So "the entity is locked" is also wrong.
- **The only signal is your own client timeout.** No error, no "busy", no "retry later" — even though
  the server demonstrably *can* refuse politely (see the loading row below).

Practical consequence for a runbook: an automation that creates and cleans up becomes a
one-way ratchet — it keeps adding and stops removing, while half its calls report success. Never
report a cleanup as done without re-reading; `search_entities` on the name is the cheap check.

Suspected trigger, unconfirmed: the first hangs followed operations combining a cascade delete with an
external relation. If a restart of the Orchestra app restores deletion, that supports a
stuck-queue explanation.

## The daemon can refuse everything, and not recover

Also 2026-09-06. Every tool on the endpoint — including `get_current_context` — returned:

> The Orchestra daemon is still loading this workspace's data, so any answer now would be incomplete.
> Retry in a moment.

It held for **more than ten minutes** across fresh connections and cleared only after a human opened
that workspace in the app. Sibling endpoints served the same data throughout.

Two things follow. First, this is the **good** failure shape — an honest refusal beats the silent
partial answer it replaced (an earlier build returned 128 of 147 tasks with no indication). Second,
"retry in a moment" understates it: budget for it not clearing on its own, and surface it to the
human rather than looping.

## Not reachable from MCP

Do not design around these.

- **Saved views** — no create/list/edit tool, and `create_entity` has no `view` type. Views are also
  *personal* (filtered on `observers_uuid array-contains <session user>`), so a view the owner builds
  is invisible to the agent. A human must build the cross-project board once, in the app.
- **`add_relation`** **[app]** — absent from the app endpoint; present and working **[agent]**.
- **Agent triggers and automations** — the only automation engine (`message_in_chat`,
  `task_in_project`, `schedule`, and three more). Built in-app. MCP-created tasks *do* trip them.
- **Field `config` read-back** — `manage_field` takes `config` (NUMBER only: `children_sum` — the
  product's only rollup — plus `format`, `precision`, `auto_increment*`) and the create succeeds, but
  `list_fields` never returns `config`: write-only, unverifiable. Individual keys may also be
  refused — a create can come back with "config key(s) could not be applied: precision" and the field
  still made. Read the warning. `chat_type` (CHAT) and `show_guests` (MEMBER) stay rejected by
  Firestore rules.
- **Chat settings** — `primary_status_field`, `auto_archive_statuses`, `kanban_default_grouping`.
- **Fields on non-task entities** — `createField` hardcodes `target_type: [TASK]`. Structured
  metadata cannot be put on project entities; a human must create such a field, after which MCP can
  read and set it.
- **Field values on checklist items** — only `assigneeUid` is settable. Per-item due dates and
  reordering exist on the SDK but not in the MCP input.
- **Webhooks** — a complete schema with no API, UI or MCP path.
- **Archiving**, **file upload**, **interactive message buttons**.

## Does not exist in Orchestra at all

Recurring tasks. Task or project templates. Checklist templates or clone. Time tracking, estimates,
story points. Typed dependencies (no blocks/duplicates enum anywhere). Formulas, computed or rollup
fields beyond `children_sum`. Task import/export. Workspace-wide message search. Auto-numbering.
Option reordering. Table, Gantt and Calendar layouts (commented out — only list and kanban ship).

## Two shapes for the same field values

`query_entities` returns `fields` as a **dict keyed by field uid**; `get_entity` returns it as an
**array of objects**. The value shapes inside now agree, so only the container differs — but code
that reads `fields[uid].value` in one and the same expression in the other is wrong in one of them,
silently. Normalise at the boundary.

## Project descriptions

`update_entity` takes no `description` parameter and projects expose no description field in
`list_fields` — but **`edit_document` works on a project entity**, verified on both variants.

The markdown round-trip is lossy: `- ` lists come back as `* `, `_em_` as `*em*`, nested emphasis
gains escaped spaces and doubled markers, and the entity name is prepended as an H1. **Do not diff
the rendered text to detect change** — `read_document` returns `revision` and `updatedAt`, and the
tool's own description says to compare those instead.

## Fixed in build 0.141-beta-0906 — kept as a version marker

If you are on an older agent build, these still bite. All were re-verified as fixed on 2026-09-06;
none needs a workaround any more.

| Was | Now |
|---|---|
| `folder:"all"` silently omitted a whole project (128 of 147) | matches `get_workspace_overview`; per-project filters return full counts |
| `null` in `fieldFilters` matched nothing on any field type | matches "unset or empty" — an empty multi-value chat field included |
| `viewUid` accepted and silently ignored | still not implemented, but now returns an explicit warning saying the result is NOT view-scoped |
| `update_entity` strictly single-entity | `entities[]` batch up to 50, per-entity results plus a top-level `failed` |
| `read_messages` / `search_messages` hung forever **[agent]** | both instant |
| `create_entity` denied even to a workspace owner **[agent]** | creation works; a real rename works and a no-op rename returns `unchanged:["name"]` |
| `move_entity` errored with `Cannot use method 'canMove'` **[agent]** | returns `moved:true` with `parentUid`/`projectUid` |
| document layer unimplemented **[agent]** | `read_document` / `edit_document` work |
| `repoType:"project"` returned the subtree flat | `depth` and `hasChildren` are correct |
| a checklist created right after a task could return zero, and item order was reversed | created, visible and ordered |
| `approve_action` / `switch_workspace` / `list_workspaces` undocumented in `instructions` | described in a "Tools On This Server" section |
