# Entities, checklists and messages

The object model, and the mechanics that bite when you write to it.

## Kinds

Most entities are also **chats** — they carry a message thread: `task`, `project`, `document`,
`channel`, `group`. Non-chat kinds: `member`, `message`, `checklist`, `field`, `view`.

Nesting: a project holds tasks and sub-projects; a task holds subtasks. Three relationship fields
describe where something sits — `contextUid` (direct parent, used on write), `project_uid` (the root
project, persists through a subtask chain) and `parent_uid` (parent of the same kind).

## Creating

`create_entity` takes an **array**, and each item carries its own `contextUid` and `fields`:

```js
create_entity({ entities:[{ type:"task", name:"…", contextUid:"<parent uid>",
  fields:[{ fieldUid:"<uid>", value:"<option uid>" }] }] })
```

`contextUid` lives **inside** the `entities[]` item — never at the top level. Point it at a project
to file a task there, at a task to make a subtask, at the workspace to file at root. `prevUid` /
`nextUid` / `toStart` place the new entity among its siblings, so a whole batch can be filed in
reading order in one call.

Read `failedFields` **inside `created[i]`** — `create_entity` reports per entity, `update_entity`
reports top-level, and the batch form of `update_entity` carries both a per-entity `failedFields`
and a top-level `failed`.

## Updating

`update_entity` takes either a single `entityUid` **or** an `entities[]` batch (up to 50) — the two
are exclusive. In the batch each entity is attempted independently: successes land in `entities`,
the ones nothing was written to land in `failed` with a reason.

The response distinguishes three outcomes, and the distinction is the point: `updatedFields` (took
effect), `unchangedFields` (already held that value — not an error), `failedFields` (rejected, with
a reason). A same-value write returning `unchanged` is how you tell "nothing to do" from "denied".

Two things it does **not** take: the **description** (use `edit_document` with the entity uid) and
the **assignee** (a field — pass the assignee field uid inside `fields`).

## Checklists

A task can hold several checklists. Two tools, split by level: `manage_checklist` for the list
(`create` / `rename` / `delete`) and `manage_checklist_item` for items (`add` / `update` / `delete` /
`link` / `unlink`).

- **`checklistUid` is required on every item action, including `update`.** The item uid alone is
  rejected by the schema.
- **Item text and checklist names are plain text.** Markdown is not rendered and mention syntax
  appears literally, backticks and all. To reference another entity from an item, use `link`, or
  anchor the item to a source message with `fromMessageChatUid`/`fromMessageUid`.
- **Order is creation order, permanently.** No reorder parameter exists.
- **Verify the attach.** A create issued immediately after entity creation has been observed to
  return success and leave zero checklists — call `get_checklists` and retry once on an empty result.

`link` shares one item across several checklists: completion lives on the item, so it is ticked once
and ticked everywhere. Useful when one fact is a gate for several pieces of work.

## Messages

Every chat entity has a thread. `send_message` takes `chatUid` + `content`; `chatUid` accepts an
entity uid, or `personal-{memberUid}` for a direct message.

- Messages are **visible to everyone in the chat and push a notification**. Never send one that a
  human did not ask for.
- Content is **always parsed as markdown** — escape `*`, `#` and friends if you mean them literally.
- Mentions use `<!type@uid[Display Name]>` with types `task`, `project`, `member`, `channel`,
  `group`, `document`. An `@`-mention notifies a person; treat it as a deliberate act.
- Reading is safe and notifies nobody. Page it: `read_messages` returns `hasMore` and
  `oldestTimestamp`, and a single unpaged read silently truncates a long chat.
- **Threads are writable and unreadable.** `send_message` accepts `threadUid`, but a reply inside a
  thread does not come back from `read_messages`, from `aroundMessageUid`, or from
  `search_messages`. The root message reports `threadStats.messagesCount`, so you can see that a
  thread exists — treat a non-zero count as a signal to ask a human what is in it.

## Deleting

`delete_entity` moves an entity to trash and cascades to children. It is not archiving — archiving
is not reachable from MCP at all.

Two cautions. It is destructive and team-visible, so confirm with a human first. And on at least one
build it **hangs to transport timeout with no error, globally** once it starts failing — see
`failure-modes.md`. Never report a deletion or a cleanup as done without re-reading;
`search_entities` on the name is the cheap check.
