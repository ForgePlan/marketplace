# Custom Fields Reference

## Critical Rule

Custom fields are created at the **workspace level** in Orchestra. This means:
- They are available in ANY project within the workspace.
- They survive any project restructuring (migration A -> B -> C).
- They are created once and never need to be recreated.

## The 6 Custom Fields

| Field | Type | Values | Description | Required? |
|-------|------|--------|-------------|-----------|
| **Artifact** | `text` | `PRD-021`, `RFC-003`, `PROB-021` | Forgeplan artifact ID | Required for artifact-linked tasks |
| **Type** | `option` | PRD / RFC / ADR / Epic / Spec / Problem / Evidence / Note | Artifact type | Required if Artifact is set |
| **Depth** | `option` | Tactical / Standard / Deep / Critical | Depth from `forgeplan route` | Optional |
| **Phase** | `option` | Shape / Validate / Code / Evidence / Done | Current Forge pipeline phase | Recommended |
| **Sprint** | `text` | `Sprint 9`, `Sprint 10` | Sprint assignment | Only where the project runs sprints |
| **Branch** | `text` | `fix/adi-quality-prob021` | Git branch name | Only where work is branch-scoped |

## Who writes each field, and when

A field with no defined moment of writing stays empty forever. That is not a discipline
problem — it is a design problem, and it shows up in measurements.

Measured on a live 32-task board: `Phase` 27/32, `Depth` 22/32, `Artifact` and `Type`
12/32 each, `Sprint` and `Branch` 0/32. The leaders are exactly the fields written *at
creation, in the same call*. Anything requiring someone to come back and add it later
does not get added.

| Field | Written by / when | Read for | An empty value means |
|---|---|---|---|
| `Artifact` | Agent, at task creation; or operator via confirmed backfill | The link itself — every sync operation | Tactical work, not artifact-linked |
| `Type` | Agent, same call as `Artifact` | Filtering by kind without querying forgeplan | Set only alongside `Artifact` |
| `Phase` | Agent, at creation and at each phase transition | Status↔Phase sync | Not yet started in the pipeline |
| `Depth` | Agent, at creation, from routing | Capacity judgement | Depth not assessed |
| `Sprint` | Operator or agent, only where sprints exist | Time grouping | **Correct** — this project has no sprints |
| `Branch` | Agent, on entering the Code phase, only where work is branch-scoped | Finding code for a task | **Correct** — work is not branch-scoped |

`Sprint` and `Branch` stay declared. Populate them where the project genuinely has sprints
and named branches; otherwise leave them empty. An empty value in those two is never
reported as drift, never triggers a proposal, and never blocks a gate.

**Never rename these fields.** Integrations resolve them by name.

**Never set an assignee automatically** — it sends a push to a person.

### Do not assume which fields are "system"

`list_fields` returns `type` and `isSystem` per field. **Read them; do not hardcode the
split.** It differs between workspaces, and this document previously got it wrong.

Measured on a live workspace:

| Field | `type` | `isSystem` |
|---|---|---|
| `Artifact`, `Type`, `Depth`, `Phase`, `Sprint`, `Branch` | custom | `false` |
| **`Status`, `Priority`, `Tags`** | **custom** | **`false`** |
| `Project`, `Parent`, `Assignee`, `Members`, `Due date`, `Owner`, counters, timestamps | system | `true` |

Nine custom fields there, not six. `Status`, `Priority` and `Tags` look like platform
built-ins and behave like them in the UI, but on that server they are ordinary custom
fields — writable, renameable, deletable like any other.

Another workspace may genuinely have them as system fields. Both are possible, which is
exactly why the rule is *resolve at runtime*: treat `isSystem` from `list_fields` as the
answer, and never act on a belief about which side a field falls on.

What is reliably system, and must not be written by a sync: `Assignee`, `Members`,
`Due date`, `Owner`, and every read-only counter or timestamp (`messages_count`,
`completed_at`, `last_activity`, `created_at`).

## Why These 6 and Not More

### Artifact
The key link between Forgeplan and Orchestra. Without it, there is no mapping. This is like a foreign key — it references the artifact ID in Forgeplan.

### Type
Enables filtering "show all PRDs" or "show all Problems" in Orchestra without querying Forgeplan. Quick visibility into what kind of work a task represents.

### Depth
PM or tech lead can see complexity at a glance without reading the artifact. Informs sprint capacity planning.

### Phase
AI agent understands where in the methodology pipeline a task is without additional queries. Enables automated Status-Phase sync.

### Sprint
Time-based grouping. Works in any configuration (A, B, C). In Config C, sub-projects replace Sprint field for sprint tracking, but the field can still be used for cross-reference.

### Branch
Links task to git. AI can find code related to a task. Useful for PR creation and code review context.

## What NOT to Add

| Field | Why NOT |
|-------|---------|
| **R_eff** (score) | Computed value that stales instantly. Always query live via `forgeplan score`. |
| **Priority** | Orchestra already has a standard Priority field. Do not duplicate. |
| **Tags** | Orchestra already has a standard Tags field. Do not duplicate. |
| **Description/Body** | This is artifact content — it lives in Forgeplan markdown files. Orchestra is not a document store. |
| **Validation status** | Dynamic — changes with each `forgeplan validate`. Query live. |
| **Evidence links** | Part of the Forgeplan link graph. Query via `forgeplan show`. |

The rule: if the data is computed, dynamic, or content-heavy, it belongs in Forgeplan. Only stable reference data goes into Orchestra fields.

## Status <-> Phase Mapping

Two fields reflect different aspects of the same work:
- **Status** — the board's own field, visible to everyone, about "task state". Resolve it
  through `list_fields` like any other; do not assume it is a platform built-in (see above).
- **Phase** — Forge pipeline field, about "where in the methodology cycle"

| Orchestra Status | Forge Phase | What is Happening | Who Updates |
|------------------|-------------|-------------------|-------------|
| **Backlog** | Shape | Artifact created, sections being filled | Task creator |
| **To Do** | Validate | Artifact validated (PASS), ready to work | AI after `forgeplan validate` |
| **Doing** | Code | Code being written, sprint in progress | Developer or AI |
| **Review** | Evidence | Audit complete, evidence being created | AI after `/audit` |
| **Done** | Done | Artifact activated in Forgeplan | AI after `forgeplan activate` |
| **Blocked** | **unchanged** | Work stopped waiting on something external | Whoever hits the blocker |

## Blocked

`Blocked` is an option on the **`Status`** field. It is **not** a phase, and no `Phase`
option named `Blocked` exists or should be created.

**A blocked task keeps the phase it was already in.** Writing a phase alongside a `Blocked`
status rolls the task back to `Shape` and destroys the record of how far it got.

The five happy-path statuses have nowhere to put stopped work, so it settles in `To Do` —
where it reads as "nobody picked this up" rather than "stuck on X". Someone then picks it
up and hits the same blocker again.

A blocked task states both halves in its description:

```
BLOCKED: what is being waited on
TRIGGER: what must become true for it to move
```

"Later" is not a trigger. "After the migration merges" is a trigger. Only one half present
means the task will sit there with nobody able to tell when it should wake up.

Adding the option to a workspace that lacks it:

```
manage_field_option(action: "create", fieldUid: "<Status uid>",
                               optionName: "Blocked", optionColor: "red")
```

## Sync Rule

If one is updated, the other must be updated too. The AI agent updates both Phase and Status whenever either changes.

**Conflict resolution**: When Phase and Status disagree, **Status wins**. Orchestra is the source of truth for execution state.

## Creating Fields via MCP

To create all 6 fields in a new workspace:

```
manage_field: create "Artifact" type=text
manage_field: create "Type" type=option values=["PRD","RFC","ADR","Epic","Spec","Problem","Evidence","Note"]
manage_field: create "Depth" type=option values=["Tactical","Standard","Deep","Critical"]
manage_field: create "Phase" type=option values=["Shape","Validate","Code","Evidence","Done"]
manage_field: create "Sprint" type=text
manage_field: create "Branch" type=text
```

## Setting Fields on a Task

There is no `set_fields` tool. Field values go through `update_entity`, or
through the `fields` array inside `create_entity` at creation time.

Two things trip up every first implementation:

1. **Fields are keyed by UID, not by name** — each element is `{fieldUid, value}`.
2. **For `option` and `status` fields the value is the OPTION UID**, not the option name.

UIDs are per-workspace and must never be hardcoded. Resolve them first.

### Step 1 — resolve names to UIDs

```
list_fields(contextUid: "<workspace_uid>", targetType: "task")
```

Build two maps from the response:

- field name -> field `uid` — e.g. `"Artifact"` -> `da7lfvu97fn68j6gftvg`
- per option field, option name -> option `uid` — e.g. `Phase` `"Shape"` -> `da7lg0e97fn68j6ghu7g`

### Step 2 — write the values

```
update_entity(
  entityUid: "<task_uid>",
  fields: [
    { fieldUid: "<Artifact uid>", value: "PRD-021" },              // text  -> bare string
    { fieldUid: "<Type uid>",     value: "<PRD option uid>" },     // option -> OPTION UID
    { fieldUid: "<Depth uid>",    value: "<Standard option uid>" },
    { fieldUid: "<Phase uid>",    value: "<Code option uid>" },
    { fieldUid: "<Sprint uid>",   value: "Sprint 9" },             // text
    { fieldUid: "<Branch uid>",   value: "feat/adi-quality-prd021" }
  ]
)
```

When creating a task, pass the same array inline in `create_entity` instead — one call
instead of two. See "Scenario 1" in the playbook section.

### Always read `failedFields`

Both tools return success even when individual values did not apply. Per-field errors
live in `failedFields` — at the top level on `update_entity`, inside `created[i]` on
`create_entity`. Read it and surface it; never report a field as set without checking.

Two reasons you will see there:

| Reason | What it actually means |
|---|---|
| `Invalid option UID "Shape" for field "Phase" (…)` | A name was sent where an option UID was required. Real error — fix the resolution step. |
| `Missing or insufficient permissions.` | Usually **not** a permissions problem — it is returned when the field already holds that exact value. Send only changed fields, or this appears on every idempotent run. |

### Why the mistake is easy to miss

Some option UIDs happen to equal their own lowercased name: `Status` (`backlog`, `todo`,
`doing`, `review`, `done`), `Priority` (`low`, `medium`, `high`), `Tags` (`feature`,
`bug`, `docs`). Sending a name there succeeds by coincidence. The custom fields `Type`,
`Phase` and `Depth` have generated UIDs and fail into `failedFields` instead — so a
name-based implementation looks half-working rather than broken. Never rely on the
coincidence; always resolve through `list_fields`.

## Checklists — acceptance criteria on the card

Fields carry metadata. Checklists carry the thing that decides whether the work is done.

Forgeplan already holds exactly what maps onto them one-to-one:

| Parent kind | Source section | One item per |
|---|---|---|
| PRD / SPEC | Acceptance criteria | Criterion |
| RFC | `## Implementation Phases` | Phase step |

```
manage_checklist(action: "create", chatUid: "<task_uid>",
                            name: "Acceptance criteria",
                            items: [{text: "…"}, {text: "…"}])
```

Acceptance criteria stop being dead text inside an artifact nobody opens during the work,
and become something visible on the card that cannot be closed without passing.

### The gate

A task in `Done` whose checklist still has open items is reported by `/sync` under its own
category, naming the open items. The gate **reports**; it does not forbid closing.

Closing with open items is sometimes right — work genuinely deferred. The point is that it
stops reading identically to "we did everything". On one live board this check immediately
found four tasks closed without walking their items; one of them had been closed with the
note "deferred", meaning not because it was done.

### Naming — one axis, `Steps (<stage>)`

Name every checklist `Steps (<stage>)` — `Steps (gate)`, `Steps (build)`, `Steps (review)`.

**The task type never appears in a checklist name.** Type is already the `Tags` field, and
checklist names are not queryable, so encoding it there buys nothing and costs a taxonomy.
Type changes the *items*, not the name — a bug's `Steps (build)` and a feature's
`Steps (build)` hold different work under the same heading, which is correct.

Without a convention every card invents its own list names, and a reader cannot tell from
the board which stage a task is in. `Phase` says it, and nothing cross-checks.

### Create the lists in the filing turn, gate first

Two lists at creation: **`Steps (gate)` with its items first**, then the first stage list.

Gate first because if the turn is cut short you keep the definition of done and lose a
to-do, rather than the reverse.

This is the same gradient the field measurements show: `Phase` 27/32 and `Depth` 22/32 are
populated because they are written *at creation, in the same call*; `Sprint` and `Branch`
are 0/32 because they require coming back. **A list nobody creates in the filing turn is a
list nobody creates.**

### Item shape — `<imperative action> — <observable proof>`

```
Run the migration on a copy — row counts match the source
Probe /quota/overview — returns 200 with 5 rows
```

Plain text, roughly 80 characters, one action per item.

**The falsifiability test:** *could a competent agent doing this work honestly leave this
item unticked?* If not, the item is decoration — delete it.

`write the code`, `make sure tests pass`, `verify it works` all fail that test: there is no
state of the world in which someone doing the work would leave them open. So they get
ticked regardless of what happened, and the checklist becomes a formality that reports
success by construction.

Words that are never criteria on their own: **works**, **verified**, **correct**,
**as expected**, **done properly**. Each needs the observable that would prove it.

This is the expensive failure, not the taxonomy one. A checklist of unfalsifiable items
produced 2633 green tests on a repo whose two HTTP probes were both returning 404 — every
item honestly ticked, nothing actually checked.

### Roles live on the list, not on every item

The list name carries the owner. Add a `role: ` prefix on an individual item **only** when
that item's owner differs from the list's — so the prefix's presence is itself the signal
that a handoff happens here.

### Description skeleton — `Done when`

The description is block-based rich text and renders markdown. Nothing was telling agents
to use it, so what landed was a sentence restating the title.

```markdown
## Why
One or two sentences: what this unblocks, or what breaks without it.

## Done when
- <observable>
- <observable>

## Notes
Links, constraints, anything a reader needs that the artifact does not carry.
```

`Done when` is the half that matters: it is where the acceptance criteria are readable
without opening forgeplan, and it is what the checklist items are derived from.

### Two traps

**Item text is plain text only.** Neither markdown nor mentions render — they land in the
item literally, backticks and all. Strip backticks from artifact IDs before writing.

**Reconcile additively, matching on item text.** A human may have ticked items. Rebuilding
the list from scratch erases that. Add what is missing; delete nothing; untick nothing.

### Verify the attach

```
get_checklists(chatUid: "<task_uid>")
```

A create issued immediately after task creation has been observed to return success and
leave zero checklists. On an empty result, retry once and report the outcome either way.
A silent retry that also fails is the same trap one level down.

## Tactical Tasks (No Artifact)

Not every task needs an artifact. Tactical tasks from `forgeplan route` (quick fixes, small changes) can exist in Orchestra without the Artifact field. They follow a simpler lifecycle:

```
Status: To Do -> Doing -> Done
Phase: (not set)
Artifact: (not set)
Type: (not set)
```

These tasks do not need validation, evidence, or activation — just execution.
