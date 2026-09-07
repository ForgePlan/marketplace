# Rendering — documents, descriptions and what text becomes

Every chat entity has a description built from blocks, and `read_document` / `edit_document` work on
any of them — task, project, channel, group, or a document proper. There is no `description`
parameter on `update_entity`; this is the path.

## Reading

| Mode | Returns | Use when |
|---|---|---|
| `markdown` | plain markdown text | you only need to read — cheapest |
| `full` / `blocks` | blocks with ids | you intend to edit next |
| `outline` | headings only | navigating a long document |
| `search` | matching blocks (needs `searchText`) | finding a passage |

Every response carries `revision` and `updatedAt`.

## Editing

Batch form is preferred: `operations: [{operation, blockId?, content?, position?, targetBlockId?}]`
applies many block ops in one transaction — and if any block id is missing, the **whole batch** is
rejected. Single-op form takes a top-level `operation`, and is required for `replace_all` and
`title`, which are document-level.

Always `read_document` with `mode:"blocks"` immediately before editing: block ids change when
someone else edits. `replace_all` destroys everything that was there.

## The round-trip is lossy — do not diff text to detect change

Markdown written in does not come back out identical. Measured on a live server:

| Written | Read back |
|---|---|
| `- item` | `* item` |
| `_em_` | `*em*` |
| `_a **nested** one._` | `*a&#x20;****nested****&#x20;one.*` |
| (nothing) | the entity name prepended as an `# H1` |

The text is re-serialised from blocks on every read, so emphasis markers, list bullets and escapes
are normalised. **Comparing the markdown you wrote against the markdown you read is therefore never
a valid idempotency check** — it will report a change that did not happen, every time.

Use `revision` and `updatedAt` instead, or keep a fingerprint of your own source. The tool's own
description says the same thing.

## Message text

Message content is also always parsed as markdown — headings, lists, tables, links, code blocks and
quotes all render. Two consequences worth remembering:

- Text that merely *looks* like markdown will render as markdown. Escape with a backslash (`\*`,
  `\#`) when you mean the character.
- A bare `09:00` becomes a time chip with a timezone shift. Escape it or rephrase.

Checklist names and item text are the exception: **plain text only**, no markdown, no mentions —
see `entities.md`.
