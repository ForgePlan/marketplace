---
name: enrich
description: |
  Turns knowledge the team already has — design records (ADRs, RFCs, notes, problem and evidence
  records), decision ledgers, review threads, chat threads — into short, self-contained memory items
  (a decision and why, a rejected option and why, a lesson, a pitfall, a rule) that link back to the
  artifact. This skill writes local JSONL and produces a read-only dry-run plan; it never applies
  the plan or writes to a bank. Memory is not a document store: this skill distils, it never copies.
  EN: Enrich a memory bank from existing sources. Use when asked to fill memory with past decisions,
  pull decisions out of design records, or load lessons from reviews and threads. NOT for fixing a
  wrong fact (/fpl-hsmem:correct-memory), seeding a brand-new bank's mission and pages
  (/fpl-hsmem:bootstrap), storing a whole document, or capturing raw session transcripts.
  RU: Обогатить банк памяти из существующих источников. Когда просят залить в память прошлые
  решения, вытащить решения из ADR/RFC, загрузить уроки из ревью и тредов. НЕ для исправления
  неверного факта (/fpl-hsmem:correct-memory), не для первичной настройки нового банка
  (/fpl-hsmem:bootstrap), не для хранения документа целиком и не для сырых транскриптов сессий.
  Triggers: "enrich memory", "enrich hindsight", "fill memory from the ADRs", "load our decisions
  into memory", "extract decisions from forgeplan", "remember what we decided in this repo",
  "залей знания в память", "обогати hindsight", "обогати память", "вытащи решения из forgeplan",
  "занеси решения в память", "наполни банк знаниями", "перенеси решения из ADR в память"
hindsight-tools: [memory_retain_batch, memory_get_current_bank, memory_recall, memory_operations, document_list]
extra-tools: [Read, Glob, Grep, Write]
allowed-tools: mcp__hindsight__memory_retain_batch, mcp__plugin_fpl-hsmem_hindsight__memory_retain_batch, mcp__hindsight__memory_get_current_bank, mcp__plugin_fpl-hsmem_hindsight__memory_get_current_bank, mcp__hindsight__memory_recall, mcp__plugin_fpl-hsmem_hindsight__memory_recall, mcp__hindsight__memory_operations, mcp__plugin_fpl-hsmem_hindsight__memory_operations, mcp__hindsight__document_list, mcp__plugin_fpl-hsmem_hindsight__document_list, Read, Glob, Grep, Write
---

# Enrich memory from sources

A bank that only learns from what happens to be said in a session never learns what the team
already decided. This skill closes that gap — deliberately, in reviewed batches.

**Memory, not a document store.** A memory item is one short, self-contained statement that a
future reader can act on without opening anything: *what was decided, about which system, and
why*; or *what was tried and rejected, and why*; or *what went wrong and how to avoid it*. The
document it came from stays where it is, and the item links to it. Copying a document into the
bank buries the one sentence that matters under a page that does not, and every recall pays for it.

**Docs outrank memory.** When an item and its source disagree, the source wins — the item is a
pointer with a summary, not a second source of truth. That is why every item carries a link and a
timestamp, and why superseded decisions are recorded *as* superseded rather than left to look
current.

## Model tier

**This skill asks for tier B for distillation and C for local JSONL and dry-run planning.**

Deciding what in an ADR is non-obvious, and stating the *why* in two sentences, is judgement: a
vague or wrong item is recalled into every future session that brushes the topic. Local file
generation and the read-only planner are mechanical. Applying a plan is not part of this skill.

`model:` values like `opus` / `sonnet` / `haiku` are Claude Code names, not the requirement. On
another runtime substitute whatever serves this tier there, and when you cannot tell, miss
**upward**.

## Before you start

```
memory_get_current_bank
```

It lists the allowed banks. Every item goes to exactly one bank — either named on the item or
routed by repository through the project's `routing` map (see CONFIGURATION.md). If the right bank
for this source is not in the list, stop and say so: this plugin never creates a bank.

Then check what is already there, so you do not re-distil what a teammate already loaded:

```
document_list  q=decision:<repo>      # stable ids make this exact
memory_recall  query="what did we decide about <area> in <repo>"
```

## The procedure

1. **Pick one source and its scope** — one repository's design records, one ledger, one review
   thread. A file per source keeps a refusal or a revert local.
2. **Read it from the right place** — see the recipes below. Never from a stale working tree.
3. **Distil** into items (rules below). Fewer, sharper items beat many: quality over count.
4. **Write the JSONL file** inside the project, in a scratch location that is not committed.
5. **Dry run** — nothing is written:

   ```
   memory_retain_batch  file=<path>.jsonl
   ```

   It validates every line, resolves each item's bank (explicit, else `routing` by
   `metadata.repo`), refuses lines carrying secrets or personal data, and reports counts per bank
   and kind, refused lines with line numbers, which `document_id`s already exist (apply replaces
   them), and a couple of samples, plus a `digest` of the file and the plan. A `document_id` that
   already exists but was not written by enrich (a transcript, an ingested document) refuses its
   line: pick another id — replacing it would delete its memories.
6. **Show the human** the summary, refused lines and 3–5 representative items per bank — verbatim,
   not paraphrased. Fix a refused line by rewording or removing sensitive material, never by
   weakening the scan. Re-run until the report is accurate. Review is useful input, but neither the
   review nor its digest grants ownership, authorization, or permission to write.
7. **Stop and hand off the local artifacts.** This skill ends with the JSONL path, dry-run report,
   and digest. It MUST NOT run an apply command or write to a bank. Applying is exclusively a
   separately authorized operator CLI workflow:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/enrich.mjs" <path>.jsonl --apply --confirm <digest>
   ```

   The operator CLI recomputes the digest and refuses if file or plan changed. The digest is only
   an anti-TOCTOU freshness proof. `--allow-replace-foreign` is a further operator choice and
   changes the digest; it is never a way to clear a collision casually. Post-apply checks belong to
   that operator workflow; this skill does not infer success from a reviewed plan.

**Rollback.** Every write replaces by `document_id`, so re-applying a corrected file fixes the
items in place. To withdraw an item entirely, `document_delete` its `document_id` (it removes only
that item's memories and asks for confirmation), or retire a single wrong fact with
/fpl-hsmem:correct-memory. Dropping an item from the file does **not** delete it from the bank.

## Item shape — one JSON object per line

```json
{"kind": "decision", "content": "<system>: <what was decided>. Why: <the reason>.",
 "context": "<source type> <ARTIFACT-ID> in <repo>: <title>", "timestamp": "2026-05-06",
 "document_id": "decision:<repo>:<ARTIFACT-ID>:<slug>",
 "tags": ["source:<type>", "repo:<repo>", "kind:decision", "artifact:<ARTIFACT-ID>", "status:active"],
 "metadata": {"link": "<repo>:<path>@<short-commit>", "artifact": "<ARTIFACT-ID>", "repo": "<repo>"}}
```

| Field | Rule |
|---|---|
| `kind` | `decision` · `rejected` · `lesson` · `pitfall` · `rule` · `finding` |
| `content` | ≤ 900 characters (the project may set `enrichMaxChars`). Self-contained, names the system, states the why. |
| `context` | Where it came from, readable: source type, artifact id, repository, title. |
| `timestamp` | When it was **decided** or observed — from the artifact, never the day you ran this. ISO date or datetime. |
| `document_id` | Stable: `<kind>:<repo-or-scope>:<ARTIFACT-ID>[:<slug>]`. Derived from the artifact and the point, never from a counter or a run date — so a re-run replaces instead of duplicating. Letters, digits, `. _ ~ : -`; unique within the file. |
| `tags` | `source:`, `repo:`, `kind:`, `artifact:`, `status:` — structured filters for later correction. |
| `metadata` | String values only. `link` to the artifact (path at a commit, or a URL), `artifact`, `repo` (used for routing). |
| `bank` | Optional. Omit it when the project routes by repository; name it when this item belongs elsewhere. |

### Item rules

- **Self-contained.** It must make sense recalled alone, months later, by someone who never saw
  the source. Name the system and the component; no "this", "the above", "as discussed".
- **States why.** A decision without its reason gets reversed at the first edge case.
- **One point per item.** Two decisions → two items, two `document_id`s.
- **≤ 900 characters, prose.** No tables, no code blocks, no lists of files. If it does not fit,
  it is two items or it is not distilled yet.
- **Links back.** `metadata.link` points at the artifact at a specific commit or permalink.
- **Timestamp = when decided.** A 2024 decision loaded today must not look like news.
- **One bank per item.** Team-wide conventions and one system's internals belong in different
  banks; pick by who needs to recall it.
- **No secrets, no personal data.** No tokens, passwords, connection strings, internal hostnames,
  emails, phone numbers, or people's names — say "the reviewer", "the on-call engineer". The tool
  refuses the shapes it can see; names and hostnames are your job.
- **Quality over count.** Skip the obvious ("we use TypeScript"), the transient (a sprint plan),
  and anything the code itself already says plainly.

## Recipes by source

### Design records (ADR, RFC, NOTE, PROBLEM, EVIDENCE — forgeplan or similar)

Read from the **remote base branch**, not the working tree, which may be stale or carry someone's
unfinished draft:

```bash
git fetch origin
git ls-tree -r --name-only origin/<base> -- <records-dir>/
git show origin/<base>:<records-dir>/<file>.md
git log -1 --format=%h origin/<base> -- <records-dir>/<file>.md   # the commit for metadata.link
```

| Record | Distil into | Skip |
|---|---|---|
| ADR, active | one `decision` (what + why), and one `rejected` per considered alternative that had a stated reason | the context section's background prose |
| ADR, superseded | a `decision` tagged `status:superseded` whose content says what replaced it and why — history, not current guidance | — |
| RFC | only the decisions a newcomer would not guess, each with its why; rejected options with their reason | the plan, the timeline, the task breakdown |
| NOTE | `rule` or `decision` when it states one | notes that are a to-do or a scratchpad |
| PROBLEM | `lesson`: what broke, the root cause, the fix or guard that prevents a repeat | symptom-only reports with no cause |
| EVIDENCE | only verdicts of CONCERNS or BLOCKER that carry a reusable lesson | passing evidence; numbers with no lesson |

Always skip drafts, PRDs, plans, epics and specs still in progress — they record intentions, and
memory should hold what was decided.

### Decision ledgers and mission files

Each recorded decision with a reason becomes a `decision`; each "tried X, abandoned because Y" a
`rejected` or `lesson`. Link to the ledger file at a commit. Skip status updates and assignments.

### Merge / pull request review threads

The valuable part is the **rejected approach and why** — the reviewer's reason that changed the
code. Each becomes a `rejected` or `pitfall` naming the system and the reason. Link the MR/PR URL.
Skip style nits, approvals, and anything resolved as "will do later". Refer to people by role.

### Chat threads

Only decisions **reached** in conversation — something was agreed and why — not opinions or
brainstorming. Only **with the consent of the channel**: ask the channel owner or participants
first; direct messages and private channels are out unless everyone in them agrees. No personal
data: no names, handles or emails; no quotes. Link the permalink; the timestamp is the message
where the decision landed.

### Agent session transcripts — optional second stage only

Only after the artifacts above are done, and only:

- your **own** sessions, and only those run in this project's paths;
- **distilled** into items by the rules above — a transcript is never retained raw, never passed to
  `memory_retain` or `document_ingest`, never attached;
- with anything personal, credential-shaped or unrelated to the project left out.

A transcript is mostly noise around a few decisions; the decisions usually also exist in a commit
message or a record, which is the better link.

## Operator CLI boundary

The planner CLI reads the same `.hindsight.json` and is safe for the pilot. This skill MAY invoke
the dry run below to produce its local plan. It MUST NOT invoke `--apply`; that command is shown
only as the separately authorized operator workflow:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/enrich.mjs" <file>.jsonl            # skill: dry-run plan only
node "${CLAUDE_PLUGIN_ROOT}/dist/enrich.mjs" <file>.jsonl --apply --confirm <digest>    # operator only
#   --allow-replace-foreign   --max-chars N   --batch-size N   --samples N   --json
```

Exit codes: `0` all accepted, `3` some lines refused (the rest planned or written), `1` config,
file, server or batch failure, `2` usage.

## Anti-patterns

- **Ingesting the ADR file itself** with `document_ingest_file` "to be thorough". The bank then
  recalls page-long chunks of background prose, and the one decision in it ranks below them.
- **`content` that needs its source to make sense** — "Decided to go with option C." Option C of
  what, in which system, and why?
- **A `document_id` with a date or a counter in it** (`decision-2026-10-07-3`). The next run cannot
  replace it, so every re-run duplicates the whole set.
- **`timestamp` set to today** for a decision taken last year. Recall's recency weighting then
  presents old reasoning as the latest word.
- **Reading records from the local working tree** when the remote base has moved — loading a
  draft that was never accepted, or missing the supersession that landed yesterday.
- **Treating report review or a matching digest as write authorization.** The digest proves only
  that file and plan are fresh; authorization is a separate operator gate.
- **Reaching for `--allow-replace-foreign` to clear a collision** with a transcript or ingested
  document instead of choosing another `document_id`.
- **Silencing a refusal** by mangling the text until the scanner stops matching, instead of
  removing the secret or the personal data.
- **Retaining a chat thread or a session transcript raw** — the exact store-of-conversation this
  plugin turned off by default.
- **Treating a successful apply as done.** The write is queued; a failed extraction shows up only
  in `memory_operations`.
