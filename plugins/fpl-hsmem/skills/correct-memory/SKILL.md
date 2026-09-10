---
name: correct-memory
description: Fix a wrong fact in long-term memory — find the exact stored row, retire it with a stated reason, write the correction, and rebuild the beliefs that rested on it. Use when the user says "that's wrong", "memory has the old value", "it keeps telling me X but we changed it", "forget that", or when recall returns something you know is stale. This is a curation workflow with side effects; invoke it deliberately.
disable-model-invocation: true
hindsight-tools: [memory_list, memory_get, memory_invalidate, memory_retain, memory_reconsolidate, memory_operations, memory_recall, memory_get_current_bank]
allowed-tools: mcp__hindsight__memory_list, mcp__plugin_fpl-hsmem_hindsight__memory_list, mcp__hindsight__memory_get, mcp__plugin_fpl-hsmem_hindsight__memory_get, mcp__hindsight__memory_invalidate, mcp__plugin_fpl-hsmem_hindsight__memory_invalidate, mcp__hindsight__memory_retain, mcp__plugin_fpl-hsmem_hindsight__memory_retain, mcp__hindsight__memory_reconsolidate, mcp__plugin_fpl-hsmem_hindsight__memory_reconsolidate, mcp__hindsight__memory_operations, mcp__plugin_fpl-hsmem_hindsight__memory_operations, mcp__hindsight__memory_recall, mcp__plugin_fpl-hsmem_hindsight__memory_recall, mcp__hindsight__memory_get_current_bank, mcp__plugin_fpl-hsmem_hindsight__memory_get_current_bank
---

# Correct a wrong memory

Memory that cannot be corrected is not memory, it is sediment. This is the
workflow that makes a bank correctable.

**The tension this resolves.** Deleting a wrong fact is easy and wrong: six
months later someone asks "why did we think that", and the answer is gone
along with the mistake. Keeping it is also wrong: recall goes on returning it.
Hindsight's answer is a third thing — the fact stays readable, marked invalid,
with a written reason, and stops being returned. Nothing is destroyed and
nothing is silently wrong.

## Before you start

Confirm which bank you are about to change:

```
memory_get_current_bank
```

If the bank id came from a directory name rather than a config file, stop and
say so. Correcting a fact in the wrong bank leaves both banks wrong.

## Step 1 — find the exact row

`memory_recall` ranks by meaning. It is the right tool for "what do we know
about X" and the wrong tool here, because it does not give you the thing you
need: the id of the specific stored row.

```
memory_list  type=world  tags=[...]        # narrow structurally
memory_list  document_id=<id>              # everything from one transcript
```

Free-text `q` is gated while the bank stores unmasked text — a substring query
can surface a credential somebody pasted into a session. Structured filters are
never gated, and they are what this workflow actually needs.

If you cannot find the row structurally and you genuinely need a substring
search, pass `acknowledge_unmasked: true` and say out loud in your reply that
you did.

Read the candidate in full before touching it:

```
memory_get  id=<id>
```

## Step 2 — retire it, with a reason

```
memory_invalidate  id=<id>  reason="superseded 2026-09: the tokens contract moved to X"
```

The reason is required by this relay, not by the API. A retired fact with no
stated reason is indistinguishable from an accident to whoever reads it next.
Write the reason for that person, not for the log.

Wrong on purpose:

- `reason="wrong"` — says nothing.
- `reason="user said so"` — says who, not what.
- `reason="replaced by memory abc123"` — good, if that id exists.

**Undo** is `memory_invalidate id=<id> restore=true`. Nothing here is
one-way, which is why this step needs no confirmation prompt.

## Step 3 — write the correction

```
memory_retain  content="<the correct statement, in full>"  wait=true
```

Two things matter.

**Write the full statement, not the delta.** "It is 4096, not 2048" is
meaningless to a reader who never saw the wrong one. Write the fact as if for
the first time.

**`wait=true` when the next step depends on it.** Retain returns before the
server has extracted anything; without waiting, a recall on the next line can
still miss the fact you just wrote and you will conclude the write failed.

## Step 4 — rebuild what rested on it

This is the step people skip, and it is why "I already fixed that" keeps not
being true.

The bank derives durable beliefs from groups of facts. Retiring one fact does
not notify the belief drawn from it — recall keeps returning the conclusion
long after its premise is gone.

```
memory_reconsolidate  id=<the retired memory id>
```

The memory survives; only the derived layer is dropped and rebuilt from what
is currently valid.

If a knowledge page covers this topic, rebuild it too — pages are built in
edit-in-place mode, so a drifted page keeps drifting:

```
mental_model_clear    id=<page>     # only if the content itself is wrong
mental_model_refresh  id=<page>
```

## Step 5 — verify, do not assume

Rebuilds are queued server-side and they can fail. A failed job leaves no trace
anywhere else — recall simply keeps answering with the old material.

```
memory_operations  status=failed  limit=10
```

Then re-ask the original question with `memory_recall`. If the old answer is
still there and no job has failed, wait a minute and ask again; consolidation
is not instant.

## What this workflow will not do

- **It will not edit a fact's text.** Rewriting is irreversible upstream: it
  re-embeds, drops the derived beliefs and re-consolidates, with no undo.
  Retire-and-rewrite reaches the same end state and leaves the mistake
  readable.
- **It will not delete a memory.** The only deletion this relay offers is at
  document level, it cascades to every fact from that document, and it exists
  for one purpose — removing a leaked transcript.
- **It will not clean the whole bank.** If the answer to "how many rows are
  wrong" is "hundreds", the problem is upstream of curation: check what the
  extractor is being told to keep, and check `memory_operations` for a pattern
  of failures.
