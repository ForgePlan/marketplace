---
name: orchestra-mcp
description: >-
  Field guide to the Orchestra MCP server — what its tools actually do, and how they fail
  when they fail silently. Use when a call returned success but nothing changed, a query
  returned an empty or wrong count, `failedFields` appeared, a delete or a read hung, a
  field write did not stick, or you need to know which Orchestra server and whose identity
  you are holding before writing. Russian triggers too — «поле не записалось», «запрос
  вернул пусто», «почему счёт не сходится», «какой сервер Orchestra», «зависло удаление»,
  «что значит failedFields». Platform behaviour only: it never decides which task to take,
  when a task is done, or how work should be organised — the `orchestra-task-cycle` skill
  owns that.
---

# Orchestra MCP — field guide

What the Orchestra MCP tools do, what they quietly do not do, and how to tell which server you are
talking to. Everything here was measured against a running server, not read from documentation.

This skill is deliberately **methodology-free**. It answers "why did this call behave that way";
it never answers "what should I work on".

## Read this first: which server, and whose identity

Tool names here are bare (`query_entities`). The runtime name is `mcp__<server>__<tool>`, and the
server name is **per-project, per-runtime data**: it differs between projects, between runtimes
(Claude Code writes two underscores between server and tool, OMP one), and one project may run
several Orchestra servers at once — different workspaces, different identities, different rights.

So the server is never guessed from a name. Resolve it, then verify:

```
scripts/orch-verify.sh [role] [--runtime <rt>] [--json]
```

The script sits next to this SKILL.md; in a full plugin clone the same file is at
`skills/orchestra-mcp/scripts/orch-verify.sh`. It finds the project's pin file, resolves the role
to a server, performs the MCP handshake, and compares live `get_current_context` against the pinned
workspace and user.

**Exit 0 means safe to write. Every other exit means stop:**

| Exit | Verdict | What it means |
|---:|---|---|
| 0 | MATCH | resolved server, workspace and identity all agree with the pin |
| 65 | MISMATCH | the server answers as a different workspace or user — never retarget silently |
| 66 | no pin file | exactly one connected server with the Orchestra tool signature may be used; several ⇒ ask a human |
| 69 | UNREACHABLE | handshake failed |
| 75 | NOT_READY | the server is up but its workspace data is still loading and **every** tool refuses |
| 78 | config invalid | broken pin file, unknown role, or the token env var is empty |

It also prints **whose identity you hold**. On an agent endpoint that is a deployed bot with its own
uid — every write lands under the bot's name, not the human's. Pin the identity you expect; a server
swapped underneath you is otherwise invisible.

### The pin file

`orchestra.json`, looked up walking upwards: `.agents/orchestra.json` first (runtime-neutral, shared
with every runtime), then `.claude/orchestra.json`. Schema v2, per role:

```json
{
  "version": 2,
  "servers": {
    "default": {
      "url": "http://127.0.0.1:28176/mcp",
      "endpointVariant": "agent",
      "auth": "bearer",
      "tokenEnv": "ORCHESTRA_TOKEN",
      "names": { "claude-code": "orchestra-beta" },
      "spaceUid": "…", "spaceName": "…", "userUid": "…",
      "identity": "bot"
    }
  },
  "chatWriting": false
}
```

`url` is the server's identity — the truth. `names` maps runtime → registered server name. The token
never enters the file; `tokenEnv` names the environment variable holding it. Where the script cannot
run, follow the same order by hand.

## Two server variants

An Orchestra desktop app can expose more than one MCP endpoint, and their capabilities differ:

| | App endpoint | Agent (token) endpoint |
|---|---|---|
| Auth | none | `Authorization: Bearer <token>` |
| Acts as | the signed-in human | a **deployed bot** with its own uid |
| Only here | `navigate_to`, `get_ui_context` | `add_relation`, `remove_relation`, `approve_action`, `switch_workspace`, `list_workspaces`, `add_members`, `remove_members`, `get_agent_prompt` |

`references/failure-modes.md` marks rows **[app]** / **[agent]** where behaviour differs.

## Never hardcode a field or option UID

Fields are **per-workspace**. The same field name has a different uid in another workspace, and an
option name is not an option uid. Sending an option *name* where a uid is required fails silently
into `failedFields` for custom fields, and succeeds by coincidence for the platform's built-ins —
which makes a name-based implementation look half-working rather than broken.

Resolve every session:

```
scripts/field-map.sh <workspace-uid> [task|project] [--json]
```

(also next to this SKILL.md; `skills/orchestra-mcp/scripts/field-map.sh` in a full clone), or call
`list_fields({ contextUid, targetType:"task" })` and build two maps: field name → uid, and per
option field, option name → option uid. Do not read `isSystem` from a name either — read it from
the response.

## Where to look

| Question | File |
|---|---|
| A call reported success but nothing happened | `references/failure-modes.md` |
| A query returned an empty or implausible count | `references/failure-modes.md`, then `references/query-cookbook.md` |
| How do I filter, sort, group, or count cheaply | `references/query-cookbook.md` |
| What shapes do field values take on read and write | `references/fields.md` |
| What are the entity kinds, and how do they nest | `references/entities.md` |
| Why did my markdown come back different | `references/rendering.md` |

## The three habits that prevent most of it

1. **Read `failedFields` before reporting a field as set.** It arrives inside a *successful*
   response. `create_entity` reports it per entity inside `created[i]`; `update_entity` reports it
   top-level, and in the batch form each entity carries its own alongside a top-level `failed`.
2. **Re-read after a write that matters.** Several writes are documented by the server itself to
   report success while dropping the change, and deletion has been observed to hang with no error
   at all. `search_entities` on the name is the cheap re-read.
3. **Cross-check any number you are about to report.** `query_entities` counts and
   `get_workspace_overview` counts have disagreed by a whole project on one build.
