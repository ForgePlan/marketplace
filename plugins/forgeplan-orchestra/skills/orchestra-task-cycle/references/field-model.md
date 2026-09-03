# Field model

Eleven custom fields, all workspace-scoped, so they survive project restructuring — plus `Status`,
`Priority` and `Tags`, which a board normally already has. **Do not assume which of those three are
system fields**: read `isSystem` from `list_fields`. This plugin's own field documentation was wrong
about that once (marketplace#214), and `scripts/field-map.sh` groups by the live value for exactly
that reason.

## Five of the eleven are not created by the plugin's setup

`skills/unified-workflow/sections/03-fields/custom-fields.md` creates six — `Artifact`, `Type`,
`Depth`, `Phase`, `Sprint`, `Branch`. This runbook additionally needs:

| Field | Type | Used at | What happens without it |
|---|---|---|---|
| `Area` | option — System / Hub / Runtime / Shared | Stage 0 filter, Stage 6 filing | Stage 0 has nothing to filter on and returns the whole board |
| `Role` | option — Auditor / Architect / Implementer / Reviewer / Guardian | Stage 6 filing | tasks file without an owner-shape |
| `Blocked by` | chat, multi-value | Stage 0 | "what can start" cannot be answered |
| `Executor` | option | Stage 2 claim | the claim lands in `failedFields` — **silently, inside a successful response** |
| `Model` | option | Stage 2 claim | same |

Create them the same way the plugin creates the other six (`custom-fields.md` → «Creating Fields via
MCP»), then re-run `scripts/field-map.sh` so the UID map includes them.

Until they exist, Stage 0 filters on a field that is not there and Stage 2 reports a claim it did not
make. Both fail quietly, which is the whole subject of `failure-modes.md`.

**Resolve every field and option UID at runtime.** Never hardcode. Never send an option *name* where
a UID is required — it fails silently into `failedFields` for custom fields, and succeeds by
coincidence for `Status`/`Priority`/`Tags`, which makes a name-based implementation look
half-working. Use `scripts/field-map.sh` or `list_fields`.

## Written at creation

The task cannot be filed without these.

| Field | Type | Values | Rule |
|---|---|---|---|
| `Area` | option | System / Hub / Runtime / Shared | Always. This is what makes a cross-project board possible. |
| `Role` | option | Auditor / Architect / Implementer / Reviewer / Guardian | Always. Derivable from the task, so deferring it has no excuse. |
| `Depth` | option | Tactical / Standard / Deep / Critical | From `forgeplan route`. |
| `Phase` | option | Shape / Validate / Code / Evidence / Done | And at every transition. |
| `Artifact` | text | `RFC-001`, `EVID-001` | Only when the task acts *on* that artifact. |
| `Type` | option | PRD / RFC / ADR / Epic / Spec / Problem / Evidence / Note | Only alongside `Artifact`. |
| `Blocked by` | chat, multi | references to other tasks | Whenever a dependency exists. |

## Written at pickup

Deliberately empty until someone takes the task.

| Field | Type | Values | Rule |
|---|---|---|---|
| `Executor` | option | CC / CDX / OC / OMP / Human | Set by whoever takes the task, when they take it. |
| `Model` | option | Opus / Sonnet / Haiku / GLM / MiniMax / Gemini / GPT | Set at pickup, alongside `Executor`. |
| `Branch` | text | `feat/h3-compiler` | On entering the Code phase. |
| `Sprint` | text | `Sprint 9` | Only where sprints exist. |

`Executor` + `Model` + `Role` together name *which runtime, on which model, in which role* — enough
to spawn the right subagent or workflow without reading the description. They are the deliberate
exception to write-at-creation: the executor is unknown until pickup, and guessing is worse than
empty. `Role` is **not** an exception; it follows from the task itself.

## Why `Blocked by` is a `chat` field

`chat`-dataType holds entity references, like the system `Project` and `Parent` fields. This makes a
dependency a real reference the board renders and — critically — that `fieldFilters` can query.
Native Orchestra relations are **not** queryable, so this field is strictly better than the
mechanism it replaces.

## Tags — the only multi-value axis

Every other field holds one value. `Tags` holds several, so it is for facts true of many tasks at
once that cut *across* the other axes.

**The test:** a fact that fits `Area`, `Phase`, `Type`, `Role`, `Depth` or `Status` goes there —
never in `Tags`. Tags is for the intersections nothing else expresses.

| Tag | Means | The query it serves |
|---|---|---|
| `Feature` `Update` `Bug` `Docs` | work kind for tactical tasks with no artifact | `Type` is only for artifact-linked work |
| `security` | touches tenancy, ACL, signing, keys | one security sweep across every area and phase |
| `human-decision` | cannot be delegated to an agent | an agent skips these without reading them |
| `parallel-safe` | not blocked by the critical path | "what can start right now" in one filter |
| `unverified-claim` | description carries an unverified inherited claim | marks where that risk still lives |
| `needs-evidence` | must produce an EVID before closing | activation without evidence is a blind spot |

Before adding a tag, name the query it serves. A tag nobody filters on is clutter.

`blind-spot` and `stale` were considered and **rejected**: forgeplan computes both live
(`forgeplan blindspots`, `forgeplan stale`), so a hand-maintained copy would only ever be wrong.

## Two field types never to create

- **A second `status`-dataType field.** Setting the workspace's primary status field to an
  auto-archive status stamps `completed_at`, and `autoArchiveStatuses` defaults to the **last
  option**. A `Phase` modelled as `status` would silently complete tasks on "Done". Model it as
  `option`.
- **`checklist`-dataType.** MCP accepts it, but the web client excludes it from the creatable list
  and its editor binds only to a ChecklistItem. The result is an invisible field inherited by every
  task.

## Option sets are append-only

No reorder parameter exists on `manage_field` or `manage_field_option`, and `order_rank` drives
board group order. Create option sets complete and in display order. An omitted colour is assigned
randomly.

Flipping `isMulti` on a populated field is effectively one-way: true→false keeps element `[0]` and
drops the rest, and reads self-heal a mismatch rather than erroring.
