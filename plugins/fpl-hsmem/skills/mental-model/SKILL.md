---
name: mental-model
description: Guided creation of a Hindsight mental model (a living knowledge page that auto-refreshes from memories). Use when the user says "create a mental model for X", "add a knowledge page about Y", or when you notice a recurring question that would benefit from an auto-updating synthesis.
allowed-tools: mcp__hindsight__mental_model_list, mcp__hindsight__mental_model_create, mcp__hindsight__mental_model_get
---

# Create a mental model

A mental model is a **living knowledge page** in a Hindsight bank.
Hindsight rebuilds its content from accumulated memories after every
consolidation, so the page stays current without manual updates.

## Pre-flight check

Before creating, **always**:
1. `mental_model_list` — see what already exists
2. If a similar page exists, suggest `mental_model_get` to read it
   instead, or `mental_model_update` to refine its query

## When to create vs. when NOT to

✓ Create when:
- A topic comes up in conversation **repeatedly** (≥3 separate sessions)
- The answer requires **synthesis** across many memories, not lookup
- The page would answer a question that can't be obtained via `grep` or
  `Read` (e.g. "what are our open architectural compromises?")

✗ Don't create when:
- The answer is already in a single file → just read that file
- The topic is one-time / ephemeral
- The user is asking for it as a vanity exercise (don't fill the bank
  with pages that won't be read)

## Steps

### 1. Gather inputs from the user
- **id**: short kebab-case identifier (e.g. `auth-decisions`, `bug-history`)
- **name**: human-readable (e.g. "Authentication decisions log")
- **source_query**: the **question** Hindsight will re-ask after each
  consolidation. This is the most important field — phrase it as a clear
  natural-language question.

### 2. Validate source_query quality
A good source_query is:
- A complete sentence ending in a question mark
- Asks for synthesis ("What have we…", "Why do we…", "How do we…")
- Bounded in scope (not "everything about X" — too broad)

If the user's draft fails any check, suggest a refinement.

Examples of **good** source_queries:
- "What architectural decisions about authentication have we made, and what were the reasons?"
- "Which bugs have we encountered in the billing module, and how were they fixed?"
- "What conventions are specific to this codebase that a new developer should know?"

Examples of **bad** source_queries:
- "auth" (single keyword, not a question)
- "everything about this project" (too broad)
- "list all PRs" (Hindsight doesn't track PRs)

### 3. Create
Call `mental_model_create({ id, name, source_query })`.

### 4. Tell the user what happens next
Explain:
- The page is created but **empty until next consolidation**
- Hindsight runs consolidation periodically (it triggers automatically
  after retains accumulate)
- They can check progress with `mental_model_get(id)` in a few minutes
- The page **auto-updates** going forward — no manual maintenance

## Output

```
Created mental model:
  id:           <id>
  name:         <name>
  source_query: <query>

Content will appear after the next consolidation (usually a few minutes
after the next retain). Use `mental_model_get("<id>")` to check.
```
