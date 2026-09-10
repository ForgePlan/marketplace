# fpl-hsmem — security findings, 2026-09-08

Eight defects in shipped code, found while designing the relay expansion. Every claim here was
verified against the running code or the live API; where something is inferred rather than
observed it says so. Full design context is `ARCHITECTURE.md` — this file exists so you can fix
these without reading it.

Fix order is the order below. F1–F3 are why this file is not a backlog item.

---

## F1 — `..` as an id reaches the bank base (CRITICAL, latent)

**Where:** `src/lib/client.ts:157` (`getMentalModel`), `:184` (`updateMentalModel`),
`:188` (`deleteMentalModel`). URL assembled at `:82`.

**What happens:** all three interpolate a caller-supplied id through `encodeURIComponent`. That
function does **not** encode a dot — `..` survives verbatim — and `new URL()` then resolves the
dot segment in-process:

```js
encodeURIComponent('..')                                    // → '..'
new URL('https://h/v1/default/banks/gerts_hub/mental-models/..').pathname
                                                            // → '/v1/default/banks/gerts_hub/'
```

So `mental_model_delete('..')` issues `DELETE` against the bank base, where `DELETE` is
`delete_bank` and `PATCH` is `update_bank`. The live bank holds 7,011 memories, 57,964 links and
26 documents, and Hindsight has no generic import endpoint (`skills/export-bank/SKILL.md:78-80`).

**Why it has not fired:** `GET` on the bank base returns `307` with a `Location` that downgrades
to `http://`, so `fetch` drops the `Authorization` header cross-origin and the call fails. That is
a property of the deployment, not of this code. If that redirect is ever changed to stay on
`https`, the traversal completes. Do not treat the current failure as a control.

**Fix:**
1. `assertPathId(value)` — non-empty, ≤200 chars, `/^[A-Za-z0-9_][A-Za-z0-9._~-]*$/`, plus an
   explicit `!value.includes('..')`. The **leading-character clause is what excludes `..`** — a
   plain `[A-Za-z0-9._~-]+` accepts it, so do not simplify to that.
2. `bankRequest(method, segments: string[], opts)` — a segment **array**, never a joined string.
   Validate and `encodeURIComponent` each segment, then assert the built URL still starts with
   `/v1/default/banks/<enc(bankId)>/` and is longer than that prefix.
3. `redirect: 'error'` on every `fetch`, with the resulting bare `TypeError` reworded.
4. Bank ids need a **different, permissive** validator — they come from directory basenames, so
   `"my project"` and `"föö"` must pass after normalisation while `.`, `..`, and anything with
   `/ \ %` or a control character is rejected.

**Test fixtures:** `'.'`, `'..'`, `'../..'`, `'x/..'`, `'%2e%2e'`, `'.%2e'`, `''`, 300 chars.

---

## F2 — `document_ingest` silently destroys a session's memories (CRITICAL, live)

**Where:** `src/index.ts:312-324` (`document_ingest`), `:326-345` (`document_ingest_file`),
`src/lib/client.ts:107-118` (`retain` never sends `update_mode`), `src/hooks/retain.ts:88`
(`documentId = sessionId`).

**What happens:** the document id is derived as `title.toLowerCase().replace(/\s+/g, '-')`, so a
UUID slugifies to **itself**. The retain hook writes each session's transcript as a document whose
id *is* the session UUID. `update_mode` is never sent, and the API default is `replace` —
documented in the live OpenAPI as *"deletes old data and reprocesses from scratch"*.

So `document_ingest({ title: '<a session uuid>', content: 'x' })` destroys that session's document
and every memory extracted from it. Measured on the live bank: 26 documents carry 1,683 memory
units — 1,134 `world` + 549 `experience`, i.e. the whole non-derived layer. One session document
carried 414.

**Fix:**
1. Send `update_mode` explicitly from every call site. Never inherit the server default.
2. Look before overwriting: `assertPathId` the slug, `GET /documents/{slug}` for exact existence
   (not the `q` substring filter — it matches prefixes), and refuse with the `memory_unit_count`
   in the message when it is non-zero.
3. Harden the slugifier: lowercase, trim, `replace(/[^a-z0-9._~-]+/g,'-')`, strip leading dots and
   dashes, then `assertPathId`.
4. The retain **hook** keeps `replace` — sent explicitly, with a comment — because it re-retains a
   growing transcript under one id and `append` would duplicate the conversation each cycle.
5. `destructiveHint: true` on both ingest tools.

---

## F3 — `document_ingest_file` uploads any absolute path on the machine (CRITICAL)

**Where:** `src/index.ts:326-345`.

**What happens:** the tool takes an absolute path, reads the file and uploads its full content to
the hosted bank. There is no containment check. Server-side secret masking is **off** on this bank
(`GET /config` → `memory_defense: null`, `store_document_text: true`), so the file lands stored as
plain text.

**Fix:** `assertIngestPath` — `realpathSync` the argument, require the result to be inside the
resolved project root (not `cwd`), refuse symlinks that escape it, and cap the size. Refuse
outright rather than truncating.

---

## F4 — memory text can terminate its own envelope (HIGH)

**Where:** `src/lib/content.ts:9-10` (`stripMemoryTags`), `:139-148` (`formatMemories`),
`src/hooks/recall.ts:103-119` (envelope + `additionalContext`), `src/index.ts:218-224`.

**What happens:** the stripper removes only **matched pairs**
(`/<hindsight_memories>[\s\S]*?<\/hindsight_memories>/g`). A bare closing tag inside retained text
survives. The recall hook then injects memories into the user turn wrapped in those same markers.
So a memory containing a lone `</hindsight_memories>` closes the envelope early and everything
after it reads as un-delimited user instruction — in a privileged position.

Memory content is attacker-influenceable by construction: everything the agent reads can end up in
the transcript the Stop hook retains.

**Fix:** strip each marker independently on the way **in** — paired blocks first, then any
surviving bare opening and closing tags separately — for both `hindsight_memories` and
`relevant_memories`. Escape `<` to `&lt;` in any `</?marker\b` on the way **out**, in
`formatMemories` and in the MCP formatters. State the trust boundary in `README.md` and
`USAGE.md`: recalled memory is untrusted data in a privileged position and must never be treated
as instruction.

---

## F5 — two bank resolvers split the project's memory in half (HIGH, already happened)

**Where:** `src/lib/bank.ts:45-57` (`deriveBankId`, used by the hooks at `recall.ts:69`,
`retain.ts:91`) versus `src/lib/config.ts:148-180` (`loadConfig`, used by the MCP server).

**What happens:** `deriveBankId` reads only `mcpServers.hindsight.env.HINDSIGHT_BANK_ID` from the
project `.mcp.json` and otherwise falls back to the directory basename. `loadConfig` also honours
`~/.hindsight/config.json`, `.hindsight.json` and the environment. The two disagree, silently.

**Measured consequence:** this project has two live banks. `gerts_hub` — 7,011 memories, 26
documents, newest entry 2026-09-08. `gerts-hub` — 4,684 memories, 2 documents, newest entry
2026-09-03. Everything written before 3 September went to the dash-spelled bank and is invisible
to recall today. Note the composition: the orphaned bank holds 1,674 `world` and 1,254
`experience` — proportionally *more* of the non-derived layer than the active one.

**Fix:** the hooks use `loadConfig()` — it is a strict superset, so nothing is lost. Anchor
resolution on a project root (nearest ancestor with `.mcp.json` or `.hindsight.json`, else git
toplevel, else cwd), not raw cwd. Report the resolved bank **and its source** in `memory_status`,
and warn when the id was derived from a directory name rather than declared.

**Separately, an operator decision:** whether to migrate, abandon or merge the orphaned bank.

---

## F6 — `memory_reflect` has never worked (HIGH)

**Where:** `src/index.ts:233` reads `result.response`; the live OpenAPI
`components.schemas.ReflectResponse` declares `text`. Timeout at `src/lib/client.ts:144` is 30 s
against a measured 49–70 s upstream latency.

**Effect:** every reflect answer this relay has returned was empty or wrong, and slow calls aborted
before the server finished.

**Fix:** read `.text`; raise the timeout to 120 s and make it configurable; set `max_tokens`
deliberately; report elapsed time when aborting so the caller knows it was a timeout, not an empty
answer.

---

## F7 — `memory_status` reports fact types that do not exist (MEDIUM)

**Where:** `src/index.ts:247`, `:252-257`.

**What happens:** it prints an `opinion` fact type the API does not have, hides `observation`
which it does, and prints zeros when the stats read fails — so a dead server and an empty bank
look identical. Measured cold `/stats` latency is 5,950 ms against a 5,000 ms limit, so the failure
path is not hypothetical.

**Fix:** the three real types (`world`, `experience`, `observation`); never print a default where a
read failed — say the read failed; use an authenticated bank-scoped probe rather than `/health`.

---

## F8 — `retain_mission` is exposed as a free-text tool argument (HIGH)

**Where:** `src/index.ts:107-110` (declared), `:266-272` (passed),
`src/lib/client.ts:191-195` (sent to `PATCH {bank}/config`).

**What happens:** `memory_set_mission` accepts `retain_mission`, which upstream documents as
steering *what gets extracted during retain*. An agent can therefore rewrite the extraction rules
for all future memory through a tool that reads as cosmetic. The auto-retain hook then applies the
new rules every cycle.

**Fix:** remove `retain_mission` from the tool surface. Mission text stays; extraction-control keys
do not belong in an agent-callable tool.

---

## Configuration hazard — the sibling server defeats every refusal

Not a code defect, but it nullifies the design. `gerts-hub/.mcp.json` (removed 2026-09-08) and
`gerts-hub/.codex/config.toml` (**still present**) declare `hindsight-full`, an HTTP MCP server on
`https://hindsight.tools.orch.so/mcp/gerts_hub/` exposing the full 29-tool upstream surface —
including `delete_bank`, `clear_memories` and `update_bank`.

This relay's strongest control is that those tools do not exist in it: no schema, no handler,
nothing to call. A sibling server holding them in the same session makes that refusal decorative.

**Fix:** remove the entry. A deny-list is not equivalent — it must be generated from a live
`tools/list` and re-checked on every upstream release, and it fails open when a tool is renamed.

---

## What is verified, and what is not

Verified by direct observation: F1 (the URL normalisation and the 307 with scheme downgrade),
F2 (the OpenAPI `update_mode` default, the slug behaviour, the document/memory counts), F5 (both
banks, their totals, compositions and newest-entry dates), F7 (the live `nodes_by_fact_type`),
and the `memory_defense: null` / `store_document_text: true` config state.

Inferred from code reading, not executed: the exact failure of F3 against a symlinked path, and
F6's upstream latency figures beyond the measured range. Neither changes the fix.

Not attempted, deliberately: any mutating call against the live bank.
