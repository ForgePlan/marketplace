# fpl-hsmem — relay expansion specification, v2

**Supersedes** `hsmem-expansion-spec.md` (v1, 2026-09-08).
**Status**: design. **Target version**: 3.0.0.
**Written**: 2026-09-08. Design-only session — nothing under `plugins/fpl-hsmem` was
modified, nothing committed, no mutating call was made against the live bank.

**What changed from v1 in one paragraph.** v1 proposed 15 new tools behind a
`dry_run`/`confirm_token` two-step. Review established that the two-step is not a control,
that v1's own path-parameter rule reconstructed the endpoints v1 refuses, and that two live
defects in *shipped* code are worse than anything v1 proposed to add. v2 therefore: moves
five fixes into a blocking Phase 0 against shipped code; replaces the token with an
out-of-band confirmation over MCP `elicitation/create`, fail-closed; **drops `memory_update`
entirely**; splits `bank_config_set` by consequence and refuses the LLM control plane; adds
an output redactor; and ships 14 new tools instead of 15.

Every REST path is relative to the bank base `/v1/default/banks/{bankId}`
(`src/lib/client.ts:69-71`) unless written absolute. Every API claim cites the live
`/openapi.json` (fetched 2026-09-08, `info.version 0.9.1`) or a read-only probe.

---

## 0. Verified ground truth

Everything in this section I measured myself in this session. Nothing here is inherited.

### 0.1 The bank stores unmasked text and keeps no audit trail

`GET /v1/default/banks/gerts_hub/config` → 200:

```
memory_defense            = null      ← secret masking OFF
store_document_text       = true      ← full source text persisted
audit_log_enabled         = false     ← the server records no actor for any write
enable_observations       = true
mcp_enabled_tools         = null
retain_extraction_mode    = "concise"
recall_max_tokens         = 2048
overrides                 = {}        ← no bank-specific override has ever been written
```

`memory_defense` is a real key: `components.schemas.BankTemplateConfig.properties.memory_defense`,
`"Memory Defense policy for this bank (validated against the DefensePolicy schema on write)"`,
typed `{additionalProperties: true} | null`. `'DefensePolicy' in components.schemas` → **false**.
Shape still UNVERIFIED; resolution procedure unchanged (§4.4).

`overrides: {}` is new information and it matters: **`memory_set_mission` has never
successfully written to this bank.** The bootstrap skill's headline step has been a no-op
here, or was reset by a `DELETE /config`. Worth checking before blaming the new tools.

### 0.2 `GET /stats` — the blast radius numbers this spec uses

```
total_nodes 7011 · total_links 57964 · total_documents 26
nodes_by_fact_type: world 1134 · experience 549 · observation 5328
operations: completed 192 · failed 10 · pending 0
```

`GET /documents?limit=100` → 26 items, keys `id, bank_id, content_hash, created_at,
updated_at, text_length, memory_unit_count, retain_params, document_metadata, tags`.
Sum of `memory_unit_count` = **1683** = 1134 world + 549 experience, exactly. **The 26
documents hold 100 % of the non-derived layer.** Largest three: `6b1127be…` 765 units,
`c52f003b…` 414 (this session's own transcript), `6af3b09e…` 319.

### 0.3 Observations cannot be curated (v1 §0.2 — re-confirmed, unchanged)

`PATCH /memories/{memory_id}` = `update_memory`, description: *"Edit a memory's text and/or
change its curation state (invalidate / revert). Invalidated memories are excluded from
recall, consolidation, and graph maintenance but kept for audit (reversible). Only w…"*
(truncated in the spec; the full sentence continues *"…orld/experience facts can be
curated; observations are derived."*).

`UpdateMemoryRequest.state`: *"'invalidated' to soft-retire the memory (excluded from
recall/consolidation, links and derived observations pruned, moved to the archive) or
'valid' to revert. **Reversible.**"*

Consequence unchanged: a browse returns mostly observations (5328 of 7011), and the fact you
actually need to correct is one of the 1134 world facts underneath.

### 0.4 `q` on `/memories/list` is a literal substring — measured

`?type=world&q=Oxigraph` → `total: 3`. `?type=world&q=runtime%20cache` → `total: 0`.
The same is documented for documents but **not** for memories: `GET /documents` declares
`q` as *"Case-insensitive substring filter on document ID (e.g. 'report' matches
'report-2024')"*; `GET /memories/list` declares `q` with **no description at all**. That
asymmetry is why the trap is invisible, and it is why `memory_list`'s own description must
carry it (§3, Finding 6).

### 0.5 Response sizes — measured, not estimated

| call | bytes |
|---|---|
| `GET /memories/list?limit=25` | 28,767 |
| `GET /memories/list?limit=10` | 11,301 |
| one item, 20 fields | 1,033 |

### 0.6 The shipped bundle, measured over stdio

`printf initialize + tools/list | node dist/index.mjs`:

```
serverInfo {"name":"hindsight-mcp","version":"2.0.0"}   capabilities {"tools":{}}
13 tools · 4,073 bytes total · avg entry 313 · avg description 84 · avg schema 168
annotations: undefined on all 13
```

The manifest claims 2.2.0 (`.claude-plugin/plugin.json`), `package.json:3` says 2.0.0,
`CHANGELOG.md` last released 2.1.0, `src/index.ts:349` hardcodes 2.0.0. Four numbers.

### 0.7 The plugin's real MCP tool prefix — RESOLVED empirically

Two independent observations, both from this machine, this session:

1. The agent tool inventory of this session lists **both** `mcp__hindsight__memory_recall`
   (from `gerts-hub/.mcp.json`, which hand-wires a server literally named `hindsight`) and
   `mcp__plugin_fpl-hsmem_hindsight__memory_recall` (from the plugin install).
2. Claude Code's own MCP log directories for this project:
   `~/Library/Caches/claude-cli-nodejs/-Users-explosovebit-Work-GertsAi-gerts-hub/`
   contains both `mcp-logs-hindsight` and `mcp-logs-plugin-fpl-hsmem-hindsight`.

**The plugin-install prefix is `mcp__plugin_fpl-hsmem_hindsight__`.** All five shipped
skills pin `mcp__hindsight__` (`skills/{bootstrap,diagnose,export-bank,mental-model,status}/SKILL.md:4`),
which binds only because *this* repo hand-wires that name. Elsewhere the pins deny silently.

### 0.8 Elicitation: available, but not through the SDK helper

- `Server.elicitInput()` exists in the pinned SDK 1.30.0
  (`node_modules/@modelcontextprotocol/sdk/dist/esm/server/index.d.ts:158`).
- Its `form` branch (`server/index.js:350-352`) requires
  `this._clientCapabilities?.elicitation?.form` and otherwise **throws locally**:
  `"Client does not support form elicitation."` — before anything goes on the wire.
- Claude Code 2.1.221 declares the **bare** form. From the shipped binary:
  `function GK_(){return{roots:{listChanged:!0},elicitation:{},...DOe()&&{tasks:{requests:{elicitation:{create:{}}}}}}}`
  with `function DOe(){return!1}` — so the declared capability object is exactly
  `{roots:{listChanged:true}, elicitation:{}}`. No `.form`, no `.url`.
- Claude Code nevertheless *handles* form elicitation. Its own capability resolver
  `ZRd(e)` maps `elicitation/create` without `mode:"url"` to a requirement of
  `{elicitation:{form:{}}}`, and `oly(e,t,r)` exempts exactly this case:
  `e==="elicitation" && t==="form" && r.form===undefined && r.url===undefined`.
- `Protocol.request()` only calls `assertCapabilityForMethod` when
  `enforceStrictCapabilities === true` (`shared/protocol.js:623-625`), and even then the
  server-side check for `elicitation/create` requires only a truthy `elicitation`
  (`server/index.js:147-149`).

**Therefore**: the working call is `server.request({method:"elicitation/create",
params:{mode:"form", message, requestedSchema}}, ElicitResultSchema)` — *not* the
`elicitInput()` helper, which fails closed against the very client we ship for.
`server.getClientCapabilities()` exists (`server/index.d.ts:121`) and is the runtime probe.

**Hazard, recorded now**: the same binary contains `Elicitation resolved by hook:` — a user
hook can answer an elicitation before the human sees it (`sPo(t, o.params, …)` is consulted
first, and its return value short-circuits the UI). Elicitation is therefore
*out-of-band from the model* but **not** a guarantee of human attention. Named again in §9.

### 0.9 Path traversal — measured, and the proposed fix is insufficient

WHATWG URL resolves dot segments in-process, before the request is built
(`client.ts:82` concatenates and hands the string to `fetch`):

```
"x/../../../victim_bank/memories"  → /v1/default/banks/victim_bank/memories
"x/../../observations"             → /v1/default/banks/gerts_hub/observations
".."                               → /v1/default/banks/gerts_hub/
"../.."                            → /v1/default/banks/
```

Against the live OpenAPI those land on `clear_bank_memories`, `clear_observations` and
`delete_bank` — the three operations §2 refuses to expose.

**And the review's own proposed character class does not hold.** I ran it:
`/^[A-Za-z0-9._~-]+$/.test("..")` → **true**. Worse, `encodeURIComponent("..")` returns
`".."` unchanged (`.` is unreserved), so:

```
encodeURIComponent("..")     → ".."       → /v1/default/banks/gerts_hub/
encodeURIComponent("../..")  → "..%2F.."  → (single literal segment, harmless)
```

**Consequence for shipped code**: `mental_model_delete` (`client.ts:188`) already builds
`DELETE ${bankPath}/mental-models/${encodeURIComponent(id)}`. With `id: ".."` that resolves
to `DELETE /v1/default/banks/gerts_hub/`, one Starlette `redirect_slashes` hop from
`delete_bank`. `mental_model_update` is the same shape with `PATCH`, and
`PATCH /v1/default/banks/{bank_id}` is `update_bank`. This is a **live defect in shipped
code**, not a v1 design flaw — Phase 0, hotfix H1.

The redirect hop itself stays **UNVERIFIED**: confirming it requires a mutating call.
It does not need to be verified for the fix to be mandatory — `clear_bank_memories` and
`clear_observations` need no redirect at all.

### 0.10 `update_mode` defaults to `replace` — the shipped eraser

`MemoryItem.update_mode`, live OpenAPI: *"How to handle an existing document with the same
document_id. 'replace' (default) deletes old data and reprocesses from scratch. 'append'
concatenates new content to the existing document text and reprocesses."*

`src/lib/client.ts:107-118` never sends it. `src/index.ts:316` derives the id from the
caller's title: `title.toLowerCase().replace(/\s+/g,"-")`. A UUID slugifies to itself.
`src/hooks/retain.ts:88` writes documents whose id **is** the session UUID.

So `document_ingest(title: "6b1127be-9b9f-4699-86c4-5da66b8fc49c", content: "x")` destroys
765 memories — 45 % of the irreplaceable layer — under a description that reads *"Ingest a
text document (PRD, RFC, note) into the bank as a single unit"*. Phase 0, hotfix H2.

One correction to the review, which the implementer must not get wrong: **the hook depends
on `replace`.** It re-retains a growing transcript under the same document id every 10
turns; `append` there would duplicate the whole conversation each time. The fix is to send
`update_mode:"replace"` *explicitly from the hook* (intent recorded in code) and to make
`document_ingest` look before it overwrites.

### 0.11 `RecallResult` carries an `id`; our relay throws it away

Live OpenAPI `components.schemas.RecallResult` properties:
`id, text, type, entities, context, occurred_start, occurred_end, mentioned_at,
document_id, metadata, chunk_id, tags, source_fact_ids, scores`.

Our `RecallResult` interface (`src/lib/client.ts:18-24`) declares
`text, type, mentioned_at, entities` and an index signature. The MCP formatter
(`src/index.ts:218-224`) prints `[n] text / type / entities`. The hook formatter
(`src/lib/content.ts:139-148`) prints `- text [type] (date)`. **Neither prints the id the
server already sent.** Phase 0, hotfix H3.

### 0.12 Credential-shaped substrings in the corpus — read-only, totals only

`GET /memories/list?q=…&limit=0`, reading `total` and nothing else:

| `q` | total |
|---|---|
| `token` | 55 |
| `password` | 38 |
| `secret` | 17 |
| `API_KEY` | 11 |
| `Bearer` | 5 |
| `sk-` | 58 |
| `ghp_` | **0** |
| `AKIA` | **0** |

Calibration, because this matters for the decision in §5: `sk-` is dominated by ordinary
substrings (`task-`, `risk-`), and the two *high-signal* prefixes return **zero**. So the
honest statement is not "58 leaked keys". It is: **the corpus is unmasked, contains dozens
of hits on the words that surround credentials, and nothing in the system can tell you
whether any of them is live.** That is enough to act on and not enough to quantify.

### 0.13 `document_id` is a real query parameter on `/memories/list`

Full parameter list, live: `type, q, consolidation_state, state, document_id, entity_id,
tags, tags_match, limit (default 100), offset`. v1 omitted `document_id`, which is exactly
why v1's `document_delete` impact report could not be built. It is free; we use it.

### 0.14 `BankConfigUpdate` accepts two spellings of every key

`components.schemas.BankConfigUpdate.updates`: *"Configuration overrides. Keys can be in
Python field format (`retain_extraction_mode`) or environment variable format
(`HINDSIGHT_API_RETAIN_EXTRACTION_MODE`). Only hierarchical fields can be overridden
per-bank."* — repeated in the `PATCH /config` route description. A
`allowlist.includes(key)` test written from the Python spellings passes every
`HINDSIGHT_API_*` alias straight through.

`DELETE /config` = `reset_bank_config`: *"Reset bank configuration to defaults by removing
all bank-specific overrides."* — the only documented un-set path, and it takes the mission
with it.

---

## 1. Resolution of every critical and high finding

| # | Finding | Disposition | Where |
|---|---|---|---|
| 1 | Raw document-id path segment re-creates the refused endpoints | **accepted, fixed — and extended**: the review's char class accepts `..` (§0.9), and shipped `mental_model_*` already carries the traversal | §4.1, Phase 0 H1 |
| 2 | `document_ingest` is already an unguarded bank-eraser | **accepted, fixed**: all three remedies, plus the hook keeps `replace` deliberately | §4.3, Phase 0 H2 |
| 3 | `dry_run`/`confirm_token` is not a control | **accepted; remedy rewritten**: `elicitInput()` as prescribed would throw against Claude Code (§0.8). Real mechanism in §4.5; `memory_update` **descoped** | §4.5, §2 |
| 4 | `bank_config_set` allowlist bypassable by alias | **accepted, fixed**: normalise-then-match, single spelling on the wire, alias fixtures in tests | §4.4 |
| 5 | Permitted keys are the LLM control plane, mislabelled reversible | **accepted, descoped further than asked**: the five prompt keys are **not exposed at all**, not gated | §4.4 |
| 6 | `memory_list` free-text `q` is a credential grep, masking is off | **accepted, fixed with a stated asymmetry**: redactor on every text-emitting tool + `q` refuses while `memory_defense === null` unless acknowledged | §5 |
| 7 | Phase-0 `content.ts` allowlist does not close the poisoning class | **accepted, fixed**: strip each marker independently on input, escape on output, both markers, both directions | §4.2 |
| 8 | `document_delete`'s impact report cannot be built | **accepted, fixed**: `document_id` on `/memories/list` (§0.13); no count → no confirmation → no delete | §4.6 |
| 9 | Skills pin a prefix the plugin does not produce | **accepted, resolved empirically** (§0.7): both prefixes listed, generated from the registry, gate in Phase 3 | §7 |
| 10 | Response size ignored; `memory_list` ≈ 30 KB | **accepted, fixed**: projection + default limit 10 + never pretty-print a list | §4.7 |
| 11 | 340 B/tool budget starves the confusable tools | **accepted, inverted**: description **floor** of 180 B for confusable tools, total budget re-set at ≈13 KB | §3 |
| 12 | Flagship workflow has no first step — no id is ever printed | **accepted, fixed**: `id` into the interface and both formatters | Phase 0 H3 |
| 13 | §10 propagates the broken prefix into three new skills | **accepted** — same fix as 9 | §7 |
| 14 | USAGE.md actively lies for non-Claude-Code runtimes | **accepted**: line-addressed **edits**, not additions | §6 |
| 15 | Cross-runtime snippets unverified, Codex auth field likely wrong | **accepted**: run-or-label gate; the Codex field stays UNVERIFIED until run | §8 |

Two places where I did not simply agree, both argued from evidence rather than taste:

- **Finding 3's prescribed remedy is rejected; its diagnosis is accepted.** `elicitInput()`
  is the wrong call against this client (§0.8) and would have shipped a guard that throws
  on every invocation — a worse failure than the token, because it would look like a bug in
  the tool rather than a missing control. The mechanism in §4.5 is what actually reaches the
  human.
- **Finding 1's fix is accepted but insufficient as written.** `/^[A-Za-z0-9._~-]+$/`
  passes `..` (§0.9). Taking it verbatim would have produced a validated,
  documented, tested bypass. §4.1 states the rule that holds.

---

## 2. The tool surface

**27 tools: 13 existing (all revised) + 14 new.** v1 said 28/15; `memory_update` is gone.

Risk tiers: `read` (no writes) · `additive` (creates only) · `reversible` (soft, undoable
by another tool in this set) · `irreversible` (needs out-of-band confirmation) ·
`refused` (no schema, no handler, at any version).

### 2.1 New — 14

| Name | REST | Tier | Guard | Why it earns a place |
|---|---|---|---|---|
| `memory_list` | `GET /memories/list` | read | redactor + free-text `q` gate (§5) | The only way to enumerate by curation state. `document_id` filter powers the `document_delete` impact report. |
| `memory_get` | `GET /memories/{id}` | read | id validation, redactor | Read the exact fact before retiring it. |
| `memory_invalidate` | `PATCH /memories/{id}` | reversible | id validation | The correction itself. `{state:"invalidated", reason}`; `restore:true` → `{state:"valid"}`. |
| `memory_reconsolidate` | `DELETE /memories/{id}/observations` | reversible | id validation | Purge one memory's derived layer and re-consolidate. The memory survives; a job is queued automatically. |
| `memory_operations` | `GET /operations[/{id}]` | read | id validation | Answers "why does recall still return the old fact". Live: 192 completed, **10 failed**, 0 pending. |
| `mental_model_refresh` | `POST /mental-models/{id}/refresh` | additive | id validation | Force a rebuild instead of waiting. Returns an operation id. |
| `mental_model_clear` | `POST /mental-models/{id}/clear` | reversible | id validation | Our pages are created `mode:"delta"` (`client.ts:172`) and drift. Documented cure; recovered by `refresh`. **POST**, not DELETE. |
| `directive_list` | `GET /directives` | read | — | See what governs synthesis. Live: `{"items":[]}` — every reflect today is ungoverned. |
| `directive_create` | `POST /directives` | additive | — | `{name, content, priority, is_active, tags}`, required `[name, content]` — 1:1 with our arguments. |
| `directive_delete` | `DELETE /directives/{id}` | reversible | id validation | Recreatable from `directive_list` output, so no confirmation. |
| `bank_config_get` | `GET /config` | read | — | Unreachable from upstream MCP: `get_bank` maps to `GET /profile` (`{bank_id,name,disposition,mission}`); the config lives elsewhere. |
| `bank_config_set` | `PATCH /config` | reversible | normalised behavioural allowlist (§4.4) | Behavioural toggles only. Echoes the previous value. |
| `document_list` | `GET /documents` | read | — | `memory_unit_count` per document is the blast-radius number nothing else provides. |
| `document_delete` | `DELETE /documents/{id}` | **irreversible** | elicitation, fail-closed (§4.5) | The only remediation for an exposed transcript. Cascades to every memory from that document. |

### 2.2 Changed, not added

**`memory_retain` gains `wait: boolean` (default `false`).** Upstream splits this into
`retain` / `sync_retain`; they are the same endpoint distinguished by
`RetainRequest.async` — which our client already takes and hardcodes `?? true`
(`client.ts:115`). Note the API's own default is `async: false`
(`RetainRequest.async`, *"If true, process asynchronously… (default: false)"*), i.e. our
relay inverts it; `wait` makes that visible. `wait:true` raises the timeout to 60 s.

**`memory_retain` does NOT gain `document_id`, `update_mode`, `strategy`, `entities` or
`observation_scopes`.** v1 proposed all five on `RetainItem`. `document_id` + `update_mode`
together are the eraser of §0.10; exposing them as arguments turns an accident into a
feature. `strategy` / `entities` / `observation_scopes` have no stated use. `RetainItem`
gains exactly one internal field, `update_mode`, set by the two call sites and never by a
caller.

**`operation_id` passthrough** on retain (idempotent retry; mismatched reuse is HTTP 409) —
used by the hooks, not exposed as a tool argument.

### 2.3 Refused outright — no tool, at any version

Absent, not guarded. A tool that does not exist cannot be reached by a confused model, a
malformed argument, or an instruction embedded in recalled memory text.

| Operation | Why refused |
|---|---|
| `DELETE /v1/default/banks/{id}` — `delete_bank` | 7,011 nodes, 57,964 links, 26 documents and the profile. No undo, and no import path — the plugin's own `skills/export-bank/SKILL.md:78-80` records that Hindsight has no generic import. |
| `DELETE /memories` — `clear_bank_memories` | Same annihilation minus the profile. Adjacent to `delete_bank` by one query parameter. |
| `DELETE /observations` — `clear_observations` | All 5,328 observations. `memory_reconsolidate` does the same repair per memory. |
| `DELETE /config` — `reset_bank_config` | Removes **all** bank overrides, including whatever mission `memory_set_mission` wrote. Advertised as the only documented un-set path, which is exactly why an agent must not hold it. |
| **`PATCH /memories/{id}` text edit — `memory_update`** | **New refusal.** It is the only irreversible memory mutation in the set: re-embeds, drops derived observations, re-consolidates. `memory_invalidate` + `memory_retain(wait:true)` produces a corrected fact *and* a reversible archive of the wrong one. Keeping `memory_update` would have meant building the whole confirmation apparatus for an ergonomic shortcut around a reversible path. The route is still used — for `state` only, via `memory_invalidate`. |
| `cancel_operation` / `delete_operation` / `retry_operation` | Three adjacent routes (`DELETE /operations/{id}`, `DELETE /operations/{id}/delete`, `POST /operations/{id}/retry`) with different meanings. The stated ask was visibility; `memory_operations` gives it. |
| `bank_config_set` on `retain_mission`, `retain_custom_instructions`, `observations_mission`, `reflect_mission`, `retain_extraction_mode` | §4.4 — argued there. |
| `bank_config_set` on `mcp_enabled_tools`, `memory_defense` | §4.4. |

If a human genuinely needs one of these, the answer is a documented `curl` in
`TROUBLESHOOTING.md`, executed deliberately, by a person.

### 2.4 Not now (unchanged from v1, evidence re-confirmed)

Knowledge Base (9 REST ops — probed live, `tree` → `{"roots":[]}`, `search` → `total 0`;
reachable and **empty**), `get_bank`/`update_bank`, `get_bank_stats` (already covered by
`memory_status` → `GET /stats`), `list_banks`/`create_bank` (not on a bank-scoped endpoint),
`list_tags`, `POST /consolidate` (bank-wide; `enable_auto_consolidation: true` here),
`get_document` / `PATCH /documents/{id}` / chunks / reprocess, entities and graph, audit-logs
(`audit_log_enabled: false` — they would fail here), webhooks, document transfer,
`POST /memories/dry-run-extract`, `/mental-models/{id}/dry-run-refresh`, `*/history`,
`GET /observations/scopes`.

`GET /documents/{document_id}` (`get_document`) stays out, but note the correction:
v1 refused it *and* needed its data. `document_list({q: id})` returns
`memory_unit_count` and `text_length` for the same document, so the impact report is
buildable without it (§4.6).

---

## 3. Descriptions — a floor, not a ceiling

v1 set a hard cap of 340 bytes on the **whole `tools/list` entry**. Measured (§0.6), the
existing average entry is 313 B of which the *description* is 84 B and the schema 168 B. A
house-style schema for `memory_list` alone is ~500 B. Under a 340 B cap the only compliant
move is to delete the prose — starving exactly the tools a model must tell apart.

**The rule instead:**

1. **Floor**: every tool in a confusable pair carries **≥ 180 bytes** of description, and
   that description names the sibling it is *not*.
2. **Schema bytes float.** They are structure; a model reads them as structure.
3. **Total `tools/list` budget: ≤ 13,000 bytes** across 27 tools (≈ 3,250 tokens). Upstream's
   29 tools measure 30,135 B. We stay under half.
4. **Phase-2 gate, per confusable pair**: paste the two descriptions alone into a fresh
   context and ask the disambiguating question. Ambiguous answer → the description fails,
   not the budget.

The four pairs and their questions:

| Pair | Question the gate asks |
|---|---|
| `memory_invalidate` vs `memory_reconsolidate` vs `document_delete` | "A fact in the bank is wrong. Which tool?" |
| `memory_retain(wait:false)` vs `memory_retain(wait:true)` | "I just invalidated a fact and want to refresh a page that depends on it. Which call?" |
| `memory_recall` vs `memory_reflect` vs `memory_list` | "Find the memory that says Oxigraph is the TBox backbone, so I can correct it." |
| `mental_model_clear` vs `mental_model_delete` | "The page's content has gone stale but the query is still right." |

### 3.1 The actual description text

Byte counts are **measured** (`Buffer.byteLength(s,"utf8")` on the exact strings below), not
estimated. Em-dashes are 3 bytes each, which is why some rows run a few bytes over what the
prose suggests.

**New tools**

| Tool | Description | B |
|---|---|---|
| `memory_list` | `Browse memories by exact filter: type, state, document_id, tags. WARNING: q is a LITERAL case-insensitive substring, not semantic — q:"runtime cache" matches nothing unless those two words appear verbatim. To find a fact by meaning use memory_recall (it returns ids too). Defaults to type=world: only world/experience facts can be curated.` | 341 |
| `memory_get` | `Read one memory in full by id: text, state, invalidation_reason, source document_id, tags. Use it to confirm you have the right fact before memory_invalidate — memory_list truncates text to 200 chars.` | 202 |
| `memory_invalidate` | `Soft-retire a memory: excluded from recall and consolidation, derived observations pruned, kept in the archive. REVERSIBLE — restore:true puts it back. Only world/experience facts can be curated; an observation id is refused. To correct a wrong fact: invalidate it, then memory_retain the right version.` | 305 |
| `memory_reconsolidate` | `Delete the observations derived from ONE memory and queue it for re-consolidation. The memory itself survives. Use when the fact is correct but its synthesised layer went wrong. Not a correction tool — to retire a wrong fact use memory_invalidate.` | 249 |
| `memory_operations` | `List background jobs (retain, consolidation, mental-model refresh) with status and progress, or fetch one by id. This is the answer to "I corrected it but recall still returns the old claim": a retain is not recallable until its operation reports completed.` | 257 |
| `mental_model_refresh` | `Force a living page to re-synthesise now instead of waiting for the next consolidation. Returns an operation id — poll it with memory_operations. Run after correcting a fact the page is built on.` | 197 |
| `mental_model_clear` | `Erase a living page's accumulated content so the next mental_model_refresh rebuilds it from scratch. Pages created by this relay run in delta mode and drift over many incremental refreshes; this is the documented cure. Does NOT remove the page — that is mental_model_delete.` | 276 |
| `directive_list` | `List the standing rules that govern how memory_reflect interprets memories. An empty list means synthesis is ungoverned. A directive is a rule; the bank mission is a persona — memory_set_mission writes the latter.` | 215 |
| `directive_create` | `Add a standing rule that shapes every future memory_reflect answer. Empty tags = global; non-empty tags apply only when a reflect scope matches. priority orders conflicting rules. Additive and removable with directive_delete.` | 225 |
| `directive_delete` | `Remove a standing synthesis rule by id. Not confirmation-gated: it is cheap to recreate from directive_list output. Take the id from directive_list — never construct one.` | 172 |
| `bank_config_get` | `Read the bank's resolved configuration and its bank-specific overrides. Reports memory_defense (null = secret masking is OFF), store_document_text, audit_log_enabled, recall_max_tokens. Not reachable from the upstream Hindsight MCP server.` | 239 |
| `bank_config_set` | `Change one behavioural setting on the bank (recall and consolidation toggles and limits) and echo the previous value so it can be reverted. Refuses the extraction/synthesis prompt keys, mcp_enabled_tools and memory_defense — those are not agent decisions.` | 257 |
| `document_list` | `List ingested documents, newest first, with memory_unit_count — how many memories each produced. q filters on document ID, not on text. Auto-retained session transcripts appear here as bare UUIDs.` | 198 |
| `document_delete` | `Delete a document AND every memory extracted from it. Irreversible: there is no import path. Reports the exact memory_unit_count, then asks the human operator to confirm out of band; refuses outright if the client cannot show that prompt. Not for correcting a fact — that is memory_invalidate.` | 295 |

**Revised existing tools** (only where the text changes)

| Tool | Description | B |
|---|---|---|
| `memory_recall` | `Semantic search over memories. Returns ranked facts, each with its memory id — copy that id to act on a fact with memory_get or memory_invalidate. Ranks by meaning; it cannot filter by curation state, which is what memory_list is for.` | 236 |
| `memory_reflect` | `LLM-synthesised prose answer over the bank's memories. Use for a coherent summary; use memory_recall when you need the raw facts and their ids. Costs LLM tokens and takes seconds, so not for lookups.` | 199 |
| `memory_retain` | `Save a fact, decision or lesson into the bank. wait:false (default) returns as soon as the job is queued; wait:true blocks until the fact is live and recallable — use it after an invalidation, before refreshing a mental model.` | 228 |
| `memory_set_mission` | `Set the bank's persona (reflect_mission) and optionally the fact-extraction instructions (retain_mission). Both steer an LLM, so an existing value is not overwritten unless overwrite:true. For a standing synthesis rule use directive_create instead.` | 248 |
| `mental_model_delete` | `Delete a living page permanently — its content and its source_query. Not reversible and not what you want for stale content: mental_model_clear + mental_model_refresh rebuilds it.` | 181 |
| `document_ingest` | `Ingest a text document into the bank as one unit; the title becomes the document_id. Re-ingesting an existing id DESTROYS that document's previous memories — this tool refuses when the target exists with memories, and names the count.` | 236 |
| `document_ingest_file` | `Read a file from disk and ingest it as one document; the filename becomes the document_id. Same overwrite refusal as document_ingest — an existing document with memories is not silently replaced.` | 197 |

Unchanged: `memory_status`, `memory_get_current_bank`, `mental_model_list`,
`mental_model_get`, `mental_model_create`, `mental_model_update`.

**Measured total of the 21 strings above: 4,953 bytes** (mean 236 B, versus the shipped mean
of 84 B). Adding the six unchanged descriptions (~500 B), 27 schemas at the measured mean of
168 B (~4.5 KB), names and annotations, the projected `tools/list` is ≈ 11–12 KB. Under the
13 KB ceiling — and the *reason* the ceiling exists is that it stays under half of upstream's
measured 30,135 B, not that any individual tool must be terse.

`directive_delete` at 172 B is the only entry under 180. That is deliberate: the floor binds
tools in a confusable pair, and `directive_delete` has no sibling it can be mistaken for.

---

## 4. Guard architecture

Six layers. Only layers 0–4 are enforcement; layer 5 is advisory and labelled as such.

```
L0  refusal            the tool does not exist                       §2.3
L1  transport gate     no caller string ever reaches a URL path      §4.1
L2  content gate       markers stripped in, escaped out              §4.2
L3  argument gates     look-before-overwrite; normalised allowlists  §4.3 §4.4
L4  out-of-band        elicitation/create, fail-closed               §4.5
L5  annotations        hints to clients; never authorization         §4.8
```

### 4.1 L1 — the path rule, stated once for every parameter

**No caller-supplied value is ever concatenated into a URL path. Not encoded and
concatenated — not concatenated.**

`bankPath()` becomes private-by-construction and the only path builder is:

```ts
bankRequest<T>(
  method: string,
  segments: string[],          // ["memories", id, "observations"] — never a joined string
  opts?: { query?: Record<string, string|number|boolean|string[]|undefined>,
           body?: unknown, timeoutMs?: number },
): Promise<T>
```

Three independent checks, all of which must pass:

1. **Validate.** Every segment that is not a compile-time literal goes through
   `assertPathId(kind, value)`:
   - non-empty, ≤ 200 chars;
   - matches `/^[A-Za-z0-9_][A-Za-z0-9._~-]*$/` — note the **first character may not be a
     dot**, which is what excludes `.` and `..`;
   - additionally `!value.includes("..")`;
   - fails → an `isError` result naming the field, the rule and the received value.
   `assertPathId` carries a unit test whose fixtures are `"."`, `".."`, `"../.."`,
   `"x/.."`, `"%2e%2e"`, `".%2e"`, `""`, a 300-char string, and a real UUID. The first
   two are the ones the review's own char class let through (§0.9).
2. **Encode.** Each segment through `encodeURIComponent`. This is not the protection — §0.9
   shows it is not — it is hygiene for legal-but-awkward ids.
3. **Assert on the constructed URL, inside `bankRequest`, not in callers.**
   ```ts
   const u = new URL(this.url + "/v1/default/banks/" + encodeURIComponent(this.bankId) + "/" + segs.join("/"));
   const prefix = `/v1/default/banks/${encodeURIComponent(this.bankId)}/`;
   if (u.origin !== new URL(this.url).origin) throw ...;
   if (!u.pathname.startsWith(prefix)) throw ...;
   if (u.pathname.length <= prefix.length) throw ...;   // kills the bare-bank case
   ```
   v1 delegated encoding to callers "by convention". At 27 tools a convention is a
   near-certain drift; the assertion is three lines and holds for tools nobody has written yet.
4. **`redirect: "error"` on every `fetch`.** Removes the Starlette `redirect_slashes` →
   307 → method-preserving hop from the threat model entirely, rather than leaving it
   UNVERIFIED. Nothing in this API legitimately redirects.

Applies to: `memory_id`, `document_id`, `mental_model_id`, `directive_id`, `operation_id`,
`bank_id`. No exceptions — including the "document ids may contain slashes" exception v1
carved out. All 26 document ids on this bank are UUIDs (§0.2); if a path-shaped id ever
appears, it is handled by encoding each of *its* segments and re-running check 3, in a
change of its own.

**`document_ingest`'s derived id is a caller-supplied value.** `title.toLowerCase()
.replace(/\s+/g,"-")` (`src/index.ts:316`) happily yields `../..`. The slugifier becomes
`slug = title.toLowerCase().trim().replace(/[^a-z0-9._~-]+/g, "-").replace(/^[.\-]+/, "")`
and then goes through `assertPathId` like anything else.

### 4.2 L2 — the injection envelope

`stripMemoryTags` (`content.ts:9-10`) removes only **matched pairs**, so a bare
`</hindsight_memories>` in retained text survives; `formatMemories` (`content.ts:139-148`)
escapes nothing; `recall.ts:103-119` wraps the result in `<hindsight_memories>…</…>` and
emits it as `additionalContext` on the user turn. Memory text can therefore terminate its
own envelope, and everything after it reads as un-delimited user instruction.

Fix, both directions, both markers:

```ts
const MARKERS = ["hindsight_memories", "relevant_memories"];
// IN  (stripMemoryTags): remove paired blocks first, then remove any surviving
//     bare <marker> and </marker> independently.
// OUT (formatMemories + the MCP recall/list/get formatters): escape "<" to "&lt;"
//     in any occurrence of </?marker\b so the text cannot close the envelope.
```

Plus one sentence in `README.md` and one in `USAGE.md`, in the plainest words available:
**recalled memory is untrusted data injected into a privileged position. No tool
description, skill, or hook may treat it as instruction.**

This is a real trust boundary and it stays open in one direction after the fix: a model can
still *read* injected prose and choose to act. Escaping stops the envelope break; it does not
stop persuasion. Named again in §9.

### 4.3 L3a — look before you overwrite

`document_ingest` / `document_ingest_file`, in order:

1. `assertPathId("document_id", slug)`.
2. `GET /documents?q=<slug>&limit=100`; find an item whose `id === slug` exactly (`q` is a
   substring filter, §0.4 — a prefix match is not a hit).
3. If found and `memory_unit_count > 0` → **refuse**, with the count in the message:
   *"document `X` already exists and holds N memories; re-ingesting replaces it. Pass a
   different title, or delete it deliberately with document_delete."*
4. Otherwise send the item with `update_mode: "replace"` **explicitly**.

`src/hooks/retain.ts` also sends `update_mode: "replace"` explicitly, with a comment saying
why (the transcript grows and is re-extracted whole; `append` would duplicate it). Same
value, now a decision instead of an inherited default.

`memory_retain` exposes neither `document_id` nor `update_mode`.

### 4.4 L3b — `bank_config_set`, split by consequence

**Normalise before matching, and send one spelling.**

```ts
function normalizeConfigKey(raw: string): string | null {
  const k = raw.trim().toLowerCase().replace(/^hindsight_api_/, "");
  return /^[a-z0-9_]+$/.test(k) ? k : null;   // null → reject, never pass through
}
```

Unit-test fixtures are the **alias forms of every refused key**:
`HINDSIGHT_API_MCP_ENABLED_TOOLS`, `hindsight_api_memory_defense`,
`HINDSIGHT_API_OBSERVATIONS_MISSION`, `Hindsight_Api_Retain_Mission`. A test written from
the allowlist alone never catches this class (§0.14).

**Permitted — behavioural toggles and limits only.** Named for what they change, not for
where they live: `enable_reranking`, `enable_temporal_retrieval`, `enable_graph_retrieval`,
`recall_include_chunks`, `recall_max_tokens`, `retain_chunk_size`, `enable_observations`,
`enable_auto_consolidation`, `store_document_text`, `disposition_skepticism`,
`disposition_literalism`, `disposition_empathy`.

The tool reads `GET /config` first and returns *previous → new* for each key it wrote, so a
revert is mechanical.

**Refused — the LLM control plane.** `retain_mission`, `retain_custom_instructions`,
`observations_mission`, `reflect_mission`, `retain_extraction_mode`. The review proposed
putting these behind the destructive-tier confirmation. v2 goes further and does not expose
them, for three reasons:

1. **Their reach is not local.** `observations_mission` *"Replaces built-in consolidation
   rules entirely"* — it re-governs how all 5,328 observations are produced. `retain_mission`
   *"Steers what gets extracted during retain()"* — and the retain hook fires every 10 turns,
   so writing it corrupts every future fact with no further call.
2. **Reversibility is unverified and the un-set path is destructive.** All five are `null`
   here and `overrides` is `{}`. Whether `{"updates":{"observations_mission":null}}` clears
   or means "unchanged" is untested; the only documented reset is `DELETE /config`, which
   removes every override including the mission (§0.14). A tool cannot honestly be called
   reversible on those terms.
3. **There is no workflow that needs it.** The one legitimate agent write in this family is
   the bootstrap mission, and `memory_set_mission` already does that on the same endpoint.

`memory_set_mission` therefore stays, hardened: it reads `GET /config` first and **refuses
to overwrite a non-null `reflect_mission` or `retain_mission` unless `overwrite: true`**,
echoing the existing value in the refusal. Today on `gerts_hub` both are `null`, so this
changes nothing for the current bank and everything for a bank that has been configured.

**Refused — `mcp_enabled_tools`**: it can disable tools on the upstream `/mcp/gerts_hub/`
endpoint, i.e. an agent could lock out the sibling server — potentially including whatever
would undo it. **Refused — `memory_defense`**: shape UNVERIFIED (§0.1). `bank_config_get`
reports it; nothing writes it until the schema is known.

Resolution procedure for `DefensePolicy`, unchanged from v1 and still correct: read the
deployed source at tag **v0.9.1** (`vectorize-io/hindsight`, corroborated by
`GET /version` → `{"api_version":"0.9.1"}` and `openapi.info.version 0.9.1`) — never `main`,
v0.9.2 exists. If inconclusive, `PATCH /config` a candidate against a **throwaway bank** and
read it back. Record it in `CONFIGURATION.md`, then add the key in a change of its own.

### 4.5 L4 — out-of-band confirmation, fail-closed

**Applies to exactly one tool: `document_delete`.** That is the whole irreversible tier now
that `memory_update` is refused.

**Why the token is gone.** It was minted in-process and handed back to the same model in the
same turn, so it constrained nothing but ceremony; both calls carried the same tool name, so
it added nothing to the client's per-tool permission prompt; and a dry run on a traversal id
would have rendered a meaningless impact report and then minted a *valid* token for the
DELETE. The review is right that its only strength was a human reading along.

**What replaces it.** A JSON-RPC request to the *client*, which the model does not answer:

```ts
const caps = server.getClientCapabilities();
if (!caps?.elicitation) {
  return isError("document_delete requires an out-of-band confirmation and this client "
    + "does not advertise the elicitation capability. Delete it deliberately with curl, "
    + "or run this in a client that supports elicitation. Nothing was changed.");
}
const res = await server.request(
  { method: "elicitation/create",
    params: { mode: "form",
              message: `Delete document ${id}? This destroys ${count} memories and cannot be undone.`,
              requestedSchema: { type: "object",
                                 properties: { confirm: { type: "boolean",
                                   description: "Yes, delete the document and its memories" } },
                                 required: ["confirm"] } } },
  ElicitResultSchema);
if (res.action !== "accept" || res.content?.confirm !== true) return "Cancelled. Nothing was changed.";
```

Three mechanical notes, each earned in §0.8:

- **Do not use `Server.elicitInput()`.** Its form branch requires
  `clientCapabilities.elicitation.form`; Claude Code 2.1.221 declares bare
  `elicitation: {}`, so the helper throws locally and nothing ever reaches the user.
  `server.request()` bypasses that helper; `assertCapabilityForMethod` runs only under
  `enforceStrictCapabilities` (default off) and requires only a truthy `elicitation`.
- **Probe with `getClientCapabilities()?.elicitation`** — truthy, not `.form`.
- **Fail closed.** No elicitation capability → the tool refuses and says so. It does **not**
  fall back to a token, a boolean, or a second call. A guard whose fallback is "ask the
  model again" is not a guard; a tool that refuses in Codex is honest about what Codex is.

**Ordering is part of the control.** In `document_delete`, in this order:
validate the id (§4.1) → build the impact report (§4.6) → **refuse if the count cannot be
obtained** → elicit → delete. The count is computed from a validated id, and the confirmation
message quotes the same count, so a confirmation can never authorise a target the report did
not describe. v1's token was bound to an argument hash; this is bound to a resolved,
measured target.

### 4.6 The `document_delete` impact report

1. `assertPathId("document_id", id)`.
2. `GET /documents?q=<id>&limit=100`, exact-match on `item.id` → `memory_unit_count`,
   `text_length`, `updated_at`, `tags`.
3. Cross-check: `GET /memories/list?document_id=<id>&limit=0` → `total`
   (parameter verified live, §0.13).
4. If (2) finds nothing, or (2) and (3) disagree → **refuse**. *A guard that cannot measure
   must not authorise.*
5. Report both numbers, the id, and the age of the document, then elicit.

Live worked example for the docs: `c52f003b-f503-4c2c-b15a-a001c578a811` →
`memory_unit_count: 414`. A model deleting "one noisy transcript" destroys 414 memories.

### 4.7 Response projection and pagination

Never `JSON.stringify(x, null, 2)` a list. Six existing handlers do
(`src/index.ts:263, 276, 283, 292, 302`).

**`memory_list`** — projection matching the house style at `src/index.ts:218-225`:

```
[1] 3f2a…  world · valid · 2026-08-14
    Oxigraph is a runtime cache only, never the TBox backbone…   (≤200 chars, redacted)
    doc 6b1127be… · tags: invariant, storage
total 1134 · showing 1-10 · next: offset=10
```

Emitted: `id`, `text` truncated to 200, `fact_type`, `state`, `mentioned_at`, `document_id`,
`tags`. **Dropped**: `metadata`, `chunk_id`, `proof_count`, `entities`, `context`,
`consolidated_at`, `consolidation_failed_at`, `occurred_*`, `edited_at`, `invalidated_at`.
`invalidation_reason` is shown only when `state !== "valid"`.

Default `limit` **10** (v1 said 25; measured 28,767 B — §0.5), maximum 50, `offset` exposed,
`total` always reported. Projected cost ≈ 2.6 KB at limit 10 versus 11,301 B raw.

`memory_get` returns the full object because that is its whole job — one memory, ~1 KB.
`document_list` and `memory_operations` get the same treatment: named fields, no
pretty-printing, `total` + `offset`.

**Timeouts.** `request()` defaults to 15 s (`client.ts:77`). Lists: 20 s.
`memory_retain(wait:true)`: 60 s. Single-object reads: 15 s.

### 4.8 L5 — annotations, and what they are not

Zero of the 13 shipped tools carry annotations (measured, §0.6: `annotations: undefined` on
all 13). That is not neutral — under the 2025-11-25 schema the defaults are
`destructiveHint: true` and `openWorldHint: true`, so today `memory_recall` is advertised to
every client as destructive and open-world.

- `openWorldHint: false` on all 27.
- `readOnlyHint: true` — `memory_recall`, `memory_status`, `memory_get_current_bank`,
  `mental_model_list`, `mental_model_get`, `memory_list`, `memory_get`, `memory_operations`,
  `bank_config_get`, `directive_list`, `document_list`.
- `destructiveHint: true` — `document_delete`, `mental_model_delete`, `mental_model_clear`,
  `directive_delete`, `memory_invalidate`, `document_ingest`, `document_ingest_file`
  (the last two because of §0.10 — the honest hint for a tool that can replace a document).
- `destructiveHint: false` — `memory_retain`, `memory_reflect`, `directive_create`,
  `mental_model_create`, `mental_model_refresh`, `memory_reconsolidate`.
- `idempotentHint: true` — `memory_set_mission`, `bank_config_set`, `mental_model_update`,
  `memory_invalidate`.
- `title` on each tool.

**Annotations are hints. The MCP spec is explicit that clients must treat them as untrusted.
Layers 0–4 are the enforcement.**

### 4.9 Error handling — three tiers

`src/index.ts:359-363` returns *unknown tool* as `isError: true` inside a **result**, which
tells the model to retry a tool that does not exist. `:372-378` relays
`HTTP ${status} from ${path}: ${text}` — the whole upstream body — verbatim into context.

1. **Unknown tool → protocol error.** `McpError(ErrorCode.MethodNotFound)`.
2. **Local validation failure → `isError: true`**, naming field, constraint and the received
   value. Guidance, not a stack trace.
3. **Upstream failure → `isError: true`**, status mapped to an instruction, body **truncated
   to 500 chars and run through the redactor** (§5) — an error body from this API can carry
   memory text. 404 → *"bank `X` not found — call `memory_get_current_bank`"*; 401 → *"no or
   invalid API key — set `HINDSIGHT_API_KEY`"*; 409 on retain → *"operation_id already used"*.

And: `src/index.ts:247` swallows stats errors with `.catch(() => ({}))` then prints zeros, so
an outage reads as an empty bank. Do not copy that into any new tool — a failed read says it
failed.

### 4.10 Registry integrity

`tools` (`src/index.ts:38-194`) and `handlers` (`:196-346`) are two literals joined by a
string key with no assertion that they cover the same set. At 13 a human catches drift; at 27
they will not. A startup assertion over `Object.keys(handlers)` vs `tools.map(t => t.name)`
throws on mismatch — three lines, and it is also what makes the §4.11 allowlist and the §7
skill pins derivable from one source.

### 4.11 The `content.ts` tool-name pattern

`OPERATIONAL_TOOL_PATTERN` (`content.ts:5`) requires a trailing underscore on its verb
alternatives (`create_`, `update_`, `get_`, `list_`), so resource-first names systematically
evade it; a non-matching `mcp__…` tool whose input carries `text|body|message|content`
(`content.ts:4`) is treated as a **chat message** and its argument text is spliced into the
retained transcript and the recall query (`content.ts:22-33, 45-54, 227-242`).

`document_ingest` is poisoned **today**: it does not match, and its input field is literally
`content` — so every ingest re-injects the whole document into the retained transcript.
`directive_create` (field `content`) would join it.

Replace the regex with an explicit allowlist of this relay's own tool names, exported from
the registry (§4.10) so a tool added to the registry is automatically recognised. Phase 0,
hotfix H4 — this is a real fix and it is **not** the same thing as §4.2; the review is right
that v1 conflated them.

---

## 5. Secret exposure — the decision, and the part that cannot be fixed

**The state.** `memory_defense: null`, `store_document_text: true`, `audit_log_enabled: false`
(§0.1), on a bank whose Stop hook retains whole transcripts every 10 turns
(`src/hooks/retain.ts:61-68, 120-130`). 7,011 memories, 26 documents. Substring totals in
§0.12: `token` 55, `password` 38, `secret` 17, `API_KEY` 11 — and `ghp_` 0, `AKIA` 0.

**Decision, three parts.**

**(1) A redactor runs on every path that emits memory or document text.** Not only
`memory_list`: `memory_recall`, `memory_get`, `memory_reflect`, `memory_operations` error
strings, truncated upstream error bodies (§4.9), and the hook's `formatMemories`. Shape-based,
in `src/lib/redact.ts`, applied at the formatter — one place, all tools:

```
sk-[A-Za-z0-9]{20,}                     ghp_|gho_|ghu_|ghs_|github_pat_ …
AKIA[0-9A-Z]{16}                        xox[baprs]-[A-Za-z0-9-]{10,}
eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}      (JWT)
-----BEGIN [A-Z ]*PRIVATE KEY-----
(?i)\b(api[_-]?key|password|passwd|secret|token|bearer)\b\s*[:=]\s*\S{8,}
```

→ `[redacted:<kind>]`. Cheap, one module, and it protects `memory_recall` — which is called
on every prompt by the hook — as much as it protects the new browse tool.

**(2) `memory_list`'s free-text `q` is gated on the Memory Defense state.** While
`bank_config_get().config.memory_defense === null`, a call with `q` set returns:

> *`memory_list` free-text search is disabled: this bank has `memory_defense: null`, i.e.
> secret masking is off, and it auto-ingests raw session transcripts. Browse by `type`,
> `state`, `document_id` or `tags` instead, or pass `acknowledge_unmasked: true` to search
> anyway — the operator has been told.*

Structured filters are **never** gated: they are what the correction workflow actually needs
(§0.3), and they cannot be aimed at a string. The config read is cached in-process for 5
minutes so this costs one extra GET per session, not per call.

**(3) The asymmetry, stated where the operator will read it.** Enabling Memory Defense
changes **future writes only**. The 7,011 memories and 26 documents already in this bank were
written unmasked and stay unmasked. Turning it on today cleans nothing. There are exactly two
levers on the existing corpus:

- **Delete the documents that carry the exposure.** `document_delete` cascades to every
  memory extracted from a document. This is why the most dangerous tool in the set ships at
  all: it is the only remediation. And it is why it is the one tool behind §4.5.
- **Rotate.** Anything that could plausibly have been pasted into a Claude Code session in
  this project since the bank was created should be treated as disclosed. With
  `audit_log_enabled: false` there is no way to find out who read what, so "no evidence of
  access" is not available as a reassurance — the absence of a log is not the absence of an
  event.

`GETTING-STARTED.md` gains one step on day one — run `bank_config_get`, look at
`memory_defense` — precisely so a future bank never reaches 7,011 memories before anyone asks.

**What this design does not do**: it does not enable Memory Defense. That is the user's call
(the write is refused anyway until the `DefensePolicy` shape is verified, §4.4), and it is
the finding this whole expansion exists to surface.

---

## 6. Documentation plan — edits first, additions second

The requirement is a reader who has never used Hindsight. Two rules follow, and the second is
new in v2 because v1 got it wrong.

**Rule 1**: lead with the workflow, not the tool list.
**Rule 2**: **any existing sentence asserting automatic behaviour is in scope.** v1 planned
only additions, which would have left the file that most needs correcting stating the
opposite of the truth for three of four runtimes.

### 6.1 Corrections to existing text — line-addressed, mandatory

| File:line | Says today | Must become |
|---|---|---|
| `USAGE.md:39` | `Default context for every prompt \| **Auto-recall hook** \| Already happening, zero overhead, invisible` | qualified: *Claude Code only — in Codex / OpenCode / OMP there is no hook; call `memory_recall` explicitly* |
| `USAGE.md:327` | "The hook already runs recall for every prompt." | "**In Claude Code**, the hook already runs recall for every prompt. In every other runtime nothing runs automatically — manual recall is the only recall." |
| `USAGE.md:353` | "**Auto-recall** runs on every prompt with a 12-second timeout." | same qualifier |
| `USAGE.md:355` | "**Auto-retain** runs async — non-blocking." | same qualifier |
| `GETTING-STARTED.md:142,144,146` | "Every prompt triggers `recall.mjs`… Every response is followed by `retain.mjs`… Closing the session triggers `session-end.mjs`" | prefixed with "In Claude Code:"; a sibling paragraph states what the other three runtimes do instead |
| `README.md:5` | "13 MCP tools, 3 auto hooks, and 5 helper skills" | "27 MCP tools, 3 Claude-Code-only auto hooks, and 8 helper skills" |
| `README.md:92-98, 100-106, 108-116, 118-126` | four count tables | 27 tools regrouped (Core / Curation / Mental models / Directives / Operations / Bank / Documents); hooks table gains the Claude-Code-only caveat; 8 skills; activation mode 2 works again once §8's template fix lands |

`README-RU.md` mirrors `README.md` line-for-line — both are exactly 150 lines. Every edit is
made twice, in one lane, or they drift.

### 6.2 New content

**`docs/TOOLS.md` (new)** — 27 entries: name, purpose, arguments, risk tier, annotations,
upstream MCP equivalent, REST path. `document_delete`'s entry shows a real transcript of the
impact report and the elicitation prompt.

**`README.md` — a *Name mapping* table** (relay name ↔ upstream MCP name ↔ REST path). This
is the price of keeping resource-first names (§10): without it a reader following Hindsight's
own documentation cannot find our tools.

**`README.md` — "What this relay adds that upstream MCP cannot"**: bank config and Memory
Defense visibility (`get_bank` maps to `GET /profile` and cannot see it), per-memory
reconsolidation, project-aware bank resolution, output redaction.

**`USAGE.md` — new chapters**:
- *Correcting a memory that is wrong* — the headline workflow. Must teach §0.3 explicitly,
  because the trap is invisible: **the claim you saw in recall is usually an observation, and
  observations cannot be corrected — find the world fact underneath.** Steps: read the id
  straight out of `memory_recall`'s output (H3) → `memory_get` → `memory_invalidate(reason)`
  → `memory_retain(wait:true)` → `mental_model_refresh` → `memory_operations`. Includes the
  restore path, and `memory_list` as the fallback for a fact seen elsewhere **with the
  literal-substring warning attached**.
- *Directives* — rule vs persona, `priority`, `is_active`, empty tags = global.
- *Watching async work* — status vocabulary `pending|processing|completed|failed|cancelled`
  (the upstream docstring says "running" where the API says `processing`).
- *Auditing the bank* — `bank_config_get` first, then `document_list`, `memory_status`,
  `memory_operations`.
- *Anti-patterns* (`USAGE.md:297-334`) gains: don't invalidate an observation; don't page
  `memory_list` at `limit:50` into context; don't create a directive for something that
  belongs in the mission; **don't re-ingest a document under an id you got from
  `document_list`**.

**`CONFIGURATION.md`**: a *Bank configuration* section keyed to this bank's live values; a
*Memory Defense* section carrying §5 verbatim including the asymmetry; the bank-resolution
divergence (§8); new defaults (`memory_list` limit 10, list timeout 20 s, `wait` 60 s); and
the redactor's shape list.

**`TROUBLESHOOTING.md`**: *"I corrected a memory but recall still returns the old claim"*;
*"invalidate failed — it is an observation"*; *"the mental model is stale after a
correction"*; *"an operation has been pending for a long time"* (and why we do not expose
cancel); *"document_delete says it cannot confirm"* (§4.5 fail-closed, and the curl); *"the
same tool appears twice"* (`hindsight` + `hindsight-full` in this repo's `.mcp.json`);
*"memory_list refuses my search"* (§5).

**`CHANGELOG.md`**: one `[3.0.0]` entry covering the 14 tools, the guard architecture, the
annotations, the error tiers, the redactor, the Phase 0 hotfixes, and a *version
reconciliation* note recording that 2.0.0 / 2.1.0 / 2.2.0 disagreed and what is now canonical.
`[Unreleased]` (`:7`) is empty and there is no `2.2.0` section despite the manifest claiming
it — collapse the mess here rather than adding a fifth statement of it.

---

## 7. Skills

Three new, five updated, and one convention change that is the whole point.

### 7.1 The `allowed-tools` fix

The plugin-install prefix is `mcp__plugin_fpl-hsmem_hindsight__` (§0.7, two independent
observations). All five shipped skills pin `mcp__hindsight__`, which binds only in a project
that hand-wires that server name — as this repo does, which is why nobody has noticed.

**Every skill lists both prefixes for every tool it uses**, and the list is **generated**
from the registry (§4.10) by `scripts/gen-skill-pins.mjs`, with a check mode that fails CI on
drift. Hand-maintained pins across 8 skills × 2 prefixes is the same silent-denial trap one
level up.

Rejected alternative — dropping `allowed-tools` entirely: it is the cheaper fix and it works,
but it also drops the restriction on `correct-memory`, which drives invalidation. Listing
both costs one generator.

**Phase-3 gate**: each of the 8 skills is invoked once in a **plugin-install** session (not
this repo's hand-wired one) and at least one of its MCP tool calls is observed to succeed. A
typecheck cannot catch this class; only an invocation can.

### 7.2 New

- **`correct-memory`** — the headline workflow (§6.2). Carries
  `disable-model-invocation: true`: it drives invalidation, and model invocation is reserved
  for skills without side effects. The user invokes it deliberately.
- **`audit-bank`** — read-only and model-invocable: `bank_config_get` first (is
  `memory_defense` null? is `store_document_text` on?), then `memory_status`, `document_list`,
  `memory_operations`. This is the skill that would have surfaced §0.1 months ago.
- **`directives`** — list what governs synthesis, create a rule, retire one; teaches the
  mission-vs-directive distinction and tag scoping.

### 7.3 Updated

`status` (+ `memory_operations`, a `memory_defense` line), `diagnose` (+ bank config and
operations checks, + the bank-resolution divergence of §8), `export-bank` (+ `memory_list`
for a fuller export than 3–5 broad recalls; + `disable-model-invocation: true`),
`bootstrap` (+ `directive_create`; and it must now handle `memory_set_mission`'s
overwrite refusal — note `overrides: {}` means the mission was never set on this bank),
`mental-model` (+ `refresh` / `clear` and when each applies).

Frontmatter stays `name` + `description` (+ `when_to_use`, harmlessly ignored elsewhere), one
level under `skills/` — OMP's loaders only find `skills/<name>/SKILL.md` and a nested group
directory is invisible to them.

---

## 8. Cross-runtime plan

Honest split, unchanged in shape from v1: **the server and the skills are portable; the hooks
are not.** What is new is a gate.

### 8.1 The verification gate — run it or label it

**No configuration snippet ships unrun.** For each runtime, the snippet is executed once in
that runtime and must reach a successful `memory_get_current_bank`. A snippet that has not
been run ships with this line directly above it, in the file:

```
> UNVERIFIED — not yet executed in this runtime. Report failures rather than working around them.
```

That is the whole mechanism. It costs one session per runtime and it converts "hand-written
from memory" into either a fact or a labelled guess. v1's Phase 3 had no gate at all, so
nothing in `docs/CROSS-RUNTIME.md` would ever have been executed before shipping.

### 8.2 `docs/CROSS-RUNTIME.md` (new)

- **Claude Code** — plugin install; note the tool prefix `mcp__plugin_fpl-hsmem_hindsight__`
  (§0.7) as a cross-runtime fact, not a Claude-Code detail.
- **Codex CLI** — TOML, `[mcp_servers.hindsight]` in `~/.codex/config.toml` or
  `.codex/config.toml`; `command`, `args`, `env`. **UNVERIFIED**: v1 prescribed auth via
  `bearer_token_env_var`. I did not check Codex's documentation in this session, and the
  review's suspicion is structurally sound — a bearer-token field belongs to a
  streamable-HTTP server, whereas this relay is launched over **stdio**, where the token
  belongs in `env`. The implementer resolves this by running it; until then the file carries
  the `env` form and the UNVERIFIED label on the alternative.
- **OpenCode** — `opencode.json`, top-level `mcp` key, different vocabulary:
  `{"type":"local","command":["node","…/dist/index.mjs"],"environment":{…}}`. `command` is an
  **array**; it is `environment`, not `env`; `local`/`remote`, not `stdio`/`http`;
  interpolation is `{env:VAR}`, not `${VAR}`. `.mcp.json` is not documented as read.
  **UNVERIFIED until run.**
- **OMP** — usually nothing to do: it reads the Claude plugin cache directly. Dedup is by
  server **name**, first wins, lower-priority duplicates shadowed silently.
- **Codex skills mirror**: extend the existing relative `.agents/skills/` symlinks to the 3
  new skills. Relative is required — Claude Code rejects symlinks pointing outside the
  plugin, and within-plugin ones survive the cache copy.

### 8.3 Not portable — say so rather than implying otherwise

The three hooks (`UserPromptSubmit` / `Stop` / `SessionEnd` with a declarative `hooks.json`)
are Claude Code only: OMP uses JS/TS extension factories, OpenCode uses JS/TS plugins with
different event names, Codex has none. Everything the user's own
`~/.claude/rules/hindsight.md` says — "auto-hooks do 80 % of the work", "don't call
`memory_recall` reflexively" — is **true only in Claude Code**. This is the §6.1 edit list,
and **no tool description may assume a hook already ran**.

**Consequence for `document_delete`**: elicitation is a *client* capability. In a runtime
that does not advertise it the tool refuses (§4.5). That is not a gap to paper over; it is
the design working. It goes in the runtime table.

**Ship no agents.** Three incompatible dialects, none for Codex, and they would not reduce
the tool-listing cost. Memory operations are tool calls, not delegated investigations.

### 8.4 The bank-resolution divergence (latent, becomes visible in 3.0)

Hooks resolve the bank with `deriveBankId(cwd)` (`src/lib/bank.ts:45-57`, called from
`src/hooks/recall.ts:69` and `retain.ts:91`), which reads **only** the project `.mcp.json` key
`mcpServers.hindsight.env.HINDSIGHT_BANK_ID` and otherwise falls back to the directory name.
The MCP server uses `loadConfig().bankId` (`src/lib/config.ts:148-180`), which also honours
`~/.hindsight/config.json`, `.hindsight.json` and `HINDSIGHT_BANK_ID`.

In a **plugin-only** install there is no project `.mcp.json` naming a server `hindsight`, so
the hooks fall back to the directory basename while the server may resolve something else
entirely. Set the bank by env and the tools and the hooks talk to different banks. Latent
today; user-visible the moment `bank_config_get` reports a bank the hooks are not writing to.
Unify on `loadConfig()` in Phase 0 — it is a strict superset, so no behaviour is lost — and
document it in `CONFIGURATION.md`.

---

## 9. Residual risks

Named because they survive this design, not because they are acceptable.

1. **Elicitation can be answered by a hook, not a human.** Claude Code's handler consults a
   hook first (`Elicitation resolved by hook:` — §0.8) and short-circuits the UI on a
   non-empty return. So §4.5 guarantees *out-of-band from the model*, not *seen by a person*.
   A user who installs an auto-accepting elicitation hook has disabled the guard and the
   relay cannot tell. Document it in `CONFIGURATION.md` next to the guard description.
2. **Escaping stops envelope breakout; it does not stop persuasion.** §4.2 prevents recalled
   text from closing `<hindsight_memories>` and being read as un-delimited user turn. It does
   not stop a model from reading injected prose *inside* the envelope and acting on it. The
   loop poisoned memory → auto-injected context → agent writes memory stays closed only
   because the config control plane is refused (§4.4) and `document_ingest` no longer
   silently overwrites (§4.3). Widening either re-opens it.
3. **The server keeps no audit trail.** `audit_log_enabled: false`, and the deployment
   reports `audit_log: false` on `GET /version`, so audit-log endpoints would fail here. Every
   destructive act in this design is attributable only by the local transcript. There is no
   server-side answer to "who deleted that document".
4. **The existing 7,011 memories stay unmasked whatever we decide.** §5(3). Enabling Memory
   Defense is forward-only, and this relay refuses to enable it anyway until the
   `DefensePolicy` shape is verified. Between those two facts, the corpus is what it is.
5. **`sk-` → 58 is noise, `ghp_` → 0 is real.** We do not know the true exposure, and no tool
   in this set can find out; the redactor masks *shapes*, and a secret that does not match a
   shape is not masked. Do not let the redactor be read as a claim of coverage.
6. **The Starlette trailing-slash redirect is UNVERIFIED.** §0.9. `redirect: "error"` removes
   it from the threat model without ever testing it, which is the right trade — but it also
   means we never learn whether it was reachable. If a future change re-enables redirects,
   the question comes back unanswered.
7. **`memory_invalidate` on a world fact — does it leave observations stale?** The
   documentation says invalidation prunes derived observations; not verified for a
   `state`-only change on this deployment. Test on a throwaway bank before the docs promise it.
8. **Mental models created outside this relay may not auto-refresh.** Ours carry
   `refresh_after_consolidation: true` (`client.ts:173`); pages created elsewhere may not.
   `mental_model_refresh` is the manual answer; the automatic path is unverified end to end.
9. **Two servers, 27 + 29 tools.** `gerts-hub/.mcp.json` wires both `hindsight` (relay) and
   `hindsight-full` (upstream). Today 42 tools visible; after this change 56, with substantial
   semantic overlap. Dropping `hindsight-full` is the right move once the relay covers the
   need, and it is the user's call.
10. **10 failed operations sit on this bank right now** (§0.2) and nothing in the current
    surface reports them. `memory_operations` will make them visible for the first time;
    expect the first run to surface a backlog nobody has looked at.
11. **`dist/` is committed** and adding tools without rebuilding ships a manifest that lies —
    `tools/list` keeps returning 13 while the docs claim 27, and nothing errors. Phase 4 must
    rebuild and commit it; the release checklist must say so. The longer-term fix
    (build-on-install) is out of scope.

---

## 10. Naming — unchanged, and now empirically defensible

Keep the resource-first convention: all 14 new tools are `memory_*`, `mental_model_*`,
`directive_*`, `document_*`, `bank_*`. Do not adopt upstream's bare verbs.

1. **The existing names are load-bearing and renaming fails silently** — the same silent
   failure as the prefix defect (§7.1), which is now measured rather than argued.
2. **Mixing is the documented anti-pattern**: adopting upstream names for new tools while
   keeping ours for old would put `recall` and `memory_recall` in one server.
3. **Resource-first *is* the recommended pattern** (group by service and resource).
4. **OMP collision safety**: OMP strips a redundant `<server>_` prefix once; our server is
   `hindsight` and our tools are `memory_*`, so nothing is stripped. Bare `recall` would also
   sit beside OMP's own native `recall`.
5. **Length**: MCP allows 1–128 chars of `[A-Za-z0-9_.-]`; OMP hashes names over 64. Longest
   here is `mcp__plugin_fpl-hsmem_hindsight__memory_reconsolidate` = 53. The plugin prefix
   alone is 33 — a standing constraint on future names.

The cost is paid in documentation: the *Name mapping* table and the per-tool "upstream
equivalent" column (§6.2).

---

## 11. Versioning

**Ship 3.0.0.** Strict semver on the tool surface alone says minor. Three things override it:

1. **Four numbers disagree** (§0.6). A minor bump from any one leaves the others ambiguous.
2. **The annotation contract changes how clients treat all 13 existing tools** — from
   implicitly `destructiveHint: true` / `openWorldHint: true` to explicitly annotated. That is
   a compatibility-relevant change to consumers, not an addition.
3. **`version` pins the plugin cache directory**
   (`~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/` — this repo's `.mcp.json`
   currently points at `…/fpl-hsmem/2.2.0/dist/index.mjs`, a directory whose bundle announces
   `2.0.0`). A major bump guarantees a fresh directory.

**Single source**: `package.json` → `3.0.0`. `src/index.ts:349` stops hardcoding — but do
**not** reuse `readPackageVersion()`: it does `join(__dirname,"..","..","package.json")`
(`client.ts:7-14`), which from `dist/index.mjs` resolves to a non-existent
`plugins/package.json` and returns `"0.0.0"`, while from `dist/hooks/*.mjs` it resolves
correctly — so the MCP server sends `User-Agent: hindsight-mcp/0.0.0` and the hooks send the
real version. Fix the class: inject at build time via esbuild `define` (`__HSMEM_VERSION__`)
in `build.mjs` (which currently passes no `define` — `build.mjs:22-36`), use that constant for
`serverInfo` and the User-Agent, then delete `readPackageVersion()`.
`.claude-plugin/plugin.json` and the marketplace entry → `3.0.0`.
`plugin.json.description` is a 1,199-character changelog and it is the marketplace card text —
reduce to one sentence.

**Pre-existing defect folded in**: `templates/mcp.json.template:5` and
`templates/claude-settings.json.template:8,19,30` reference `dist/index.js` and
`dist/hooks/*.js`, but `build.mjs:15-19` emits `.mjs` and `dist/` contains only `.mjs`.
Activation Mode 2 is **broken today**; anyone testing the new tools through it will conclude
the new tools are broken.

---

## 12. Phase 0 — hotfixes to shipped code

**Blocking. Single owner. No new tool ships before this lands.** Four of the six are defects
in code that is running right now.

| # | Defect | File:line | Fix | Severity |
|---|---|---|---|---|
| H1 | `encodeURIComponent("..")` = `".."`; `mental_model_{get,update,delete}` build a path from a caller id, so `id:".."` resolves to the bank base — `PATCH` there is `update_bank`, `DELETE` is one redirect from `delete_bank` | `src/lib/client.ts:157,184,188` | `assertPathId` + segment-array `bankRequest` + post-construction URL assertion + `redirect:"error"` (§4.1) | **critical** |
| H2 | `document_ingest` inherits `update_mode: "replace"`; the title slugifies to the document id; the retain hook writes documents whose id is the session UUID. One call destroys up to 765 memories | `src/index.ts:312-324, 326-345`; `src/lib/client.ts:107-118`; `src/hooks/retain.ts:88` | send `update_mode` explicitly everywhere; look-before-overwrite with the count in the refusal; hook keeps `replace` deliberately (§4.3) | **critical** |
| H3 | `memory_recall` never prints a memory id although the API returns one, so the correction workflow has no first step | `src/lib/client.ts:18-24`; `src/index.ts:218-224`; `src/lib/content.ts:139-148` | add `id` to `RecallResult`; print it in both formatters (§0.11) | **high** |
| H4 | `OPERATIONAL_TOOL_PATTERN` misses resource-first names, so `document_ingest`'s `content` argument is re-injected into the retained transcript on every ingest | `src/lib/content.ts:5,22-33,240` | replace the regex with an allowlist exported from the registry (§4.11) | **high** |
| H5 | `stripMemoryTags` is pair-matched, so a bare `</hindsight_memories>` survives round-trip and `formatMemories` escapes nothing — recalled text can close its own envelope | `src/lib/content.ts:9-10,139-148`; `src/hooks/recall.ts:103-119` | strip each marker independently in, escape out, both markers (§4.2) | **high** |
| H6 | Hooks and the MCP server resolve the bank differently; in a plugin-only install they can address different banks | `src/lib/bank.ts:45-57` vs `src/lib/config.ts:148-180` | unify on `loadConfig()` (superset) (§8.4) | medium |
| H7 | `readPackageVersion()` returns `"0.0.0"` from `dist/index.mjs`; four version numbers disagree | `src/lib/client.ts:7-14`; `src/index.ts:349`; `package.json:3`; `.claude-plugin/plugin.json:3` | esbuild `define` `__HSMEM_VERSION__`; all manifests to `3.0.0` (§11) | medium |
| H8 | Templates point at `dist/*.js`; the build emits `.mjs`. Activation Mode 2 is broken | `templates/mcp.json.template:5`; `templates/claude-settings.json.template:8,19,30` | `.js` → `.mjs` | medium |

**Phase 0 gate**: `npm run build` green; the rebuilt bundle still lists exactly 13 tools and
answers `memory_recall` against `gerts_hub` **with ids in the output**; `assertPathId`'s
fixture test passes including `"."` and `".."`; a `document_ingest` against an existing
document id is refused with a count in the message. No destructive call is made against
`gerts_hub` at any point.

---

## 13. Implementation lanes

`src/index.ts` currently holds both the `tools` array (`:38-194`) and the `handlers` map
(`:196-346`), so every lane would contend for it. Phase 1 removes the contention; only then do
lanes fork.

### Phase 0 — hotfixes (single owner, blocking)

Files: `src/lib/client.ts`, `src/lib/content.ts`, `src/lib/bank.ts`, `src/lib/redact.ts`
(new), `src/lib/paths.ts` (new — `assertPathId`), `src/hooks/retain.ts`, `src/hooks/recall.ts`,
`src/index.ts` (formatters only), `build.mjs`, `package.json`, `templates/*.template`.
Delivers H1–H8 plus `bankRequest`, the redactor module, and explicit timeouts.

### Phase 1 — registry split (single owner, blocking)

Files: `src/index.ts`, `src/tools/index.ts` (new). Move the 13 tools into per-resource
modules each exporting `{ tools, handlers }`; `src/tools/index.ts` aggregates, asserts key
parity (§4.10) and exports the tool-name allowlist consumed by `content.ts`. `src/index.ts`
shrinks to transport, dispatch and the three error tiers. **Gate**: `tools/list` returns
exactly the same 13 names; parity assertion passes. No behaviour change.

### Phase 2 — five lanes, disjoint file ownership

| Lane | Owns (exclusively) | Delivers |
|---|---|---|
| **A — curation** | `src/tools/memories.ts` | `memory_list` (projection §4.7, `q` gate §5), `memory_get`, `memory_invalidate`, `memory_reconsolidate`, `wait` on `memory_retain` |
| **B — mental models** | `src/tools/mentalmodels.ts` | `mental_model_refresh`, `mental_model_clear`, revised `mental_model_delete` description |
| **C — directives** | `src/tools/directives.ts` | `directive_list`, `directive_create`, `directive_delete` |
| **D — operations + bank** | `src/tools/operations.ts`, `src/tools/bank.ts` | `memory_operations`, `bank_config_get`, `bank_config_set` (normalised allowlist §4.4), hardened `memory_set_mission` |
| **E — documents** | `src/tools/documents.ts`, `src/lib/confirm.ts` (new) | `document_list`, `document_delete` (impact report §4.6 + elicitation §4.5), revised `document_ingest*` descriptions |

Lane E owns `src/lib/confirm.ts` because it is its only consumer — `memory_update` is gone,
so the elicitation helper has exactly one caller and does not need to be frozen in Phase 0.
Every lane consumes `src/lib/paths.ts` and `src/lib/redact.ts`; **no lane edits them.**

**Gate per lane**: typecheck; one live **read-only** call against `gerts_hub`; the §3
confusable-pair description test for any pair the lane touches. **No lane executes a
destructive call against `gerts_hub`.** Lane E's `document_delete` is exercised against a
throwaway bank or not at all.

### Phase 3 — two lanes

| Lane | Owns | Delivers |
|---|---|---|
| **F — skills** | `skills/{correct-memory,audit-bank,directives}/` (new), the 5 existing `SKILL.md` frontmatters, `scripts/gen-skill-pins.mjs` (new), `.agents/skills/` symlinks | §7 |
| **G — docs** | `README.md`, `README-RU.md`, `docs/TOOLS.md`, `docs/CROSS-RUNTIME.md`, `USAGE.md`, `CONFIGURATION.md`, `TROUBLESHOOTING.md`, `GETTING-STARTED.md`, `CHANGELOG.md` | §6 |

Lane G is large but single-owner on purpose: `README.md` and `README-RU.md` mirror
line-for-line (both 150 lines) and must move together.

**Gate F**: each of the 8 skills invoked once in a plugin-install session with an observed
successful tool call (§7.1). **Gate G**: every corrected line in §6.1 is diffed and present;
every unrun runtime snippet carries its UNVERIFIED label.

### Phase 4 — release (single owner)

`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `dist/`. Versions to 3.0.0;
`plugin.json.description` to one sentence; **rebuild and commit `dist/`**; verify over stdio
that the shipped bundle announces `3.0.0` and lists 27 tools, and that `tools/list` is
≤ 13,000 bytes.

---

## 14. Open questions carried forward

1. **`DefensePolicy` shape** — UNVERIFIED. Procedure in §4.4. `memory_defense` stays
   read-only until resolved.
2. **Should Memory Defense be enabled on `gerts_hub`?** The user's decision, and §5(3) is the
   input to it: turning it on protects future writes only.
3. **Codex `bearer_token_env_var` vs `env` for a stdio server** — UNVERIFIED (§8.2). Resolved
   by running it, not by reading about it.
4. **Knowledge Base** — live but empty. Revisit when populated; 9 tools of permanent context
   for an unused subsystem is a bad trade today.
5. **Does a `state`-only invalidation prune derived observations?** Documented for a text
   change; untested for `state` alone (§9.7).
6. **Do mental models created elsewhere auto-refresh after a correction?** (§9.8).
7. **OMP's native `recall`/`retain`/`reflect` beside our `memory_*`** — disambiguation
   untested in a real OMP session.
8. **Drop `hindsight-full` from `gerts-hub/.mcp.json`?** (§9.9) — the user's call.
9. **`overrides: {}` on this bank** — was the mission never set, or was it reset by a
   `DELETE /config`? Worth one question to the user before `bootstrap` is run again.
