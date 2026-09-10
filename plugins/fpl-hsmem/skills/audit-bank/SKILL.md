---
name: audit-bank
description: |
  Read-only audit of a bank in six calls, ending in a written verdict rather than a number. Answers
  the three questions a count cannot: is it safe to keep filling, is it actually working, and did
  anyone choose this bank on purpose.
  EN: Posture audit — masking on or off, what a single document is worth if deleted, which jobs
  failed silently, whether the bank id was chosen or derived. Run on day one of a new bank and
  whenever the answer to "is this safe" is a shrug. Changes nothing. NOT a quick health check —
  that is /fpl-hsmem:status.
  RU: Аудит состояния — включено ли маскирование секретов, сколько стоит удаление одного документа,
  какие задачи упали молча, выбрал ли кто-то этот банк осознанно. Прогонять в первый день нового
  банка и всякий раз, когда на вопрос «это безопасно?» ответа нет. Ничего не меняет. НЕ быстрая
  проверка — это /fpl-hsmem:status.
  Triggers: "audit memory", "is memory safe", "what is in the bank", "did that get saved",
  "why does recall still say the old thing", "проверь банк", "аудит памяти", "память безопасна",
  "что лежит в банке", "это сохранилось", "почему память отдаёт старое"
hindsight-tools: [bank_config_get, memory_status, document_list, memory_operations, memory_list, memory_get_current_bank]
allowed-tools: mcp__hindsight__bank_config_get, mcp__plugin_fpl-hsmem_hindsight__bank_config_get, mcp__hindsight__memory_status, mcp__plugin_fpl-hsmem_hindsight__memory_status, mcp__hindsight__document_list, mcp__plugin_fpl-hsmem_hindsight__document_list, mcp__hindsight__memory_operations, mcp__plugin_fpl-hsmem_hindsight__memory_operations, mcp__hindsight__memory_list, mcp__plugin_fpl-hsmem_hindsight__memory_list, mcp__hindsight__memory_get_current_bank, mcp__plugin_fpl-hsmem_hindsight__memory_get_current_bank
---

# Audit a memory bank

Six read calls, in this order, ending in a written verdict. Nothing here
writes. Run it on day one of a new bank and any time the answer to "is this
safe" is a shrug.


## Model tier

**This skill asks for tier C for the reads, B for the verdict.**

Collecting the six readings is mechanical.
Turning them into "safe to keep filling / not safe" is not: it weighs masking state against what is
already stored, and the cost of getting it wrong is asymmetric — a false "safe" keeps a bank
accumulating credentials for months. Run it at B; the reads are cheap either way.

`model:` values like `opus` / `sonnet` / `haiku` are Claude Code names, not the
requirement. On another runtime substitute whatever serves this tier there, and when you cannot
tell, miss **upward**. Saving cost means giving a skill less work, not a weaker model.

## Step 1 — which bank, and who decided

```
memory_get_current_bank
```

Report `bank_id_source` verbatim. The three sources mean different things:

| Source | What it means |
|---|---|
| `mcp.json` / `hindsight.json` / `user-config` | someone chose this bank on purpose |
| `env` | the environment chose it — check whether more than one config sets it |
| `derived-from-directory` | nobody chose it. Rename the directory and the memory moves to a new bank, silently |

**The failure this catches.** One project can end up with several banks, none
of which can see the others, because different entry points resolve the name
differently — the MCP server reads one config, the background hooks inherit
another. If you are auditing a project that has felt "forgetful", check every
config that can set `HINDSIGHT_BANK_ID`, not just the one in front of you.

## Step 2 — privacy posture (do this before counting anything)

```
bank_config_get
```

Three fields decide whether this bank is safe to keep filling:

| Field | Safe value | What the unsafe value means |
|---|---|---|
| `memory_defense` | a policy object | `null` — no secret masking. Anything pasted into a session is stored verbatim |
| `store_document_text` | `false` | `true` — whole raw transcripts are kept, not just extracted facts |
| `audit_log_enabled` | `true` | `false` — there is no record of who read what. "No evidence of access" is not available as a reassurance |

**State the asymmetry out loud in your report.** Turning masking on changes
future writes only. It cleans nothing already stored. A bank that has run
unmasked for months does not become clean by flipping a switch, and the only
remediation for a credential already in it is rotating that credential.

## Step 3 — size and shape

```
memory_status
```

Report counts by fact type. The ratio is informative:

- mostly `observation` — the bank has been consolidating; there are durable
  beliefs, not just raw notes.
- mostly `experience` with few `world` facts — it is recording what the agent
  did rather than what is true. Check what the extractor is instructed to keep.
- a large document count with a small memory count — transcripts are being
  stored but not yielding much. Check step 5.

## Step 4 — what a document is worth

```
document_list  limit=10
```

The `memories` number per document is the blast radius of deleting it, and
nothing else in the system reports it. A document that looks like "one noisy
transcript" routinely carries hundreds of facts.

If step 2 found masking off, this list is also the exposure inventory: each
document is a whole session stored verbatim.

## Step 5 — what silently failed

```
memory_operations  status=failed  limit=20
```

This is the only place a failure is visible. A retain that failed produces no
error anywhere the user can see — the conversation simply never became memory,
and recall answers as if it never happened.

Read the pattern, not just the count:

- **repeated `Fact extraction failed`** — the extraction model is rejecting or
  choking on the input. Long transcripts and unusual content are the usual
  causes.
- **`TimeoutError` on export/import jobs** — the operation is too big for one
  request; it needs splitting, not retrying.
- **failures clustered on one date** — an outage, not a systemic problem.

## Step 6 — spot-check the content

```
memory_list  type=world  limit=5
memory_list  state=invalidated  limit=5
```

Read five actual rows. Counts do not tell you whether the bank is storing
anything worth keeping; five rows do.

An empty `invalidated` list on a large old bank is not good news — it means
nothing has ever been corrected, which for a corpus of thousands of facts is
unlikely to be because they are all right.

## Verdict

Write four lines, in plain language:

1. **Which bank**, and whether anyone chose it.
2. **Whether it is safe to keep filling** — masking, raw storage, audit log.
   If masking is off, say what that means for what is already stored.
3. **Whether it is working** — failed jobs, and whether recent conversations
   actually became memory.
4. **One recommended action**, or "nothing to do".

Do not end with a number. A count is not a verdict.
