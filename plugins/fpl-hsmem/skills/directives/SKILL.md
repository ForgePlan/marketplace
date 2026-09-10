---
name: directives
description: |
  The standing rules a bank follows when it synthesises an answer — precedence between conflicting
  decisions, what an answer must always name, what to leave out. The distinction that makes this
  useful: a factually wrong answer is a memory problem, a consistently badly-shaped answer is a
  rules problem, and adding more facts never fixes the second.
  EN: List, add and retire the rules that govern synthesis. Use when reflect keeps preferring a
  superseded decision, or omits the source, or answers in a shape you keep correcting by hand. NOT
  for wrong facts — that is /fpl-hsmem:correct-memory. NOT the bank's persona — that is one setting,
  memory_set_mission.
  RU: Смотреть, добавлять и снимать правила, по которым банк строит ответ. Когда синтез упорно
  предпочитает отменённое решение, не называет источник или отвечает в форме, которую вы каждый раз
  правите руками. НЕ для неверных фактов — это /fpl-hsmem:correct-memory. И это не «личность» банка,
  она задаётся одной настройкой.
  Triggers: "it keeps preferring the old decision", "make it always mention the source",
  "why does reflect answer like that", "synthesis rules", "directives", "оно опять берёт старое
  решение", "пусть всегда называет источник", "почему такой ответ", "правила синтеза", "директивы"
hindsight-tools: [directive_list, directive_create, directive_delete, memory_reflect, memory_get_current_bank]
allowed-tools: mcp__hindsight__directive_list, mcp__plugin_fpl-hsmem_hindsight__directive_list, mcp__hindsight__directive_create, mcp__plugin_fpl-hsmem_hindsight__directive_create, mcp__hindsight__directive_delete, mcp__plugin_fpl-hsmem_hindsight__directive_delete, mcp__hindsight__memory_reflect, mcp__plugin_fpl-hsmem_hindsight__memory_reflect, mcp__hindsight__memory_get_current_bank, mcp__plugin_fpl-hsmem_hindsight__memory_get_current_bank
---

# Directives — the rules synthesis follows


## Model tier

**This skill asks for tier B.**

Writing a rule that is decidable, and that a synthesiser can actually follow,
is the whole task. "Be accurate" is unfalsifiable; "prefer the later decision and say the earlier
one was superseded" is checkable. Telling those apart is judgement, and a bad rule silently shapes
every answer that follows.

`model:` values like `opus` / `sonnet` / `haiku` are Claude Code names, not the
requirement. On another runtime substitute whatever serves this tier there, and when you cannot
tell, miss **upward**. Saving cost means giving a skill less work, not a weaker model.

## The distinction that makes this useful

Three different levers sound alike and do different things. Getting them
confused is why people try to fix synthesis by adding more facts.

| Lever | Governs | Set by |
|---|---|---|
| **Facts** | what is true | `memory_retain`, and the background hooks |
| **Mission** | who the bank is when it answers — its voice and focus | `memory_set_mission` |
| **Directives** | the rules an answer must obey — precedence, required elements, what to leave out | this skill |

A wrong answer is a fact problem. A consistently badly-shaped answer is a
directive problem. If reflect keeps preferring a superseded decision, no
amount of retaining will fix it — the rule "when two decisions conflict, the
later one wins" does not exist yet.

## Step 1 — see what is in force

```
directive_list
```

An empty list is the common state and it is worth naming out loud: it means
every synthesised answer in this bank is currently ungoverned. That is not a
bug, but it is a choice nobody made.

## Step 2 — write a rule that can actually be followed

A directive is an instruction to the synthesiser, not a wish.

**Good — decidable, and it changes an output:**

- "When two decisions conflict, prefer the one with the later date and say
  that the earlier one was superseded."
- "Name the source document whenever the answer depends on a single one."
- "If the evidence for a claim is one memory, say so rather than stating it
  flatly."

**Bad — nothing to check against:**

- "Be accurate." Unfalsifiable.
- "Prefer good sources." Undefined.
- "Remember that we use Postgres." That is a fact. Retain it.

```
directive_create
  name="supersede-wins"
  content="When two stored decisions conflict, prefer the later one and state that it supersedes the earlier."
  priority=10
```

`priority` orders rules when they collide; lower numbers are considered first.
`tags` scope a rule to a subject area rather than the whole bank — use it when
a rule is genuinely local, and leave it off when the rule is about how to
answer in general.

## Step 3 — check that it changed something

A directive that changes no output is worse than none: it reads as governance
and provides none.

```
memory_reflect  query="<a question whose old answer you remember>"
```

Compare against what the same question produced before. If nothing moved,
either the rule was not decidable, or nothing in the bank triggers it.

Directives apply to **future** synthesis — reflect calls and knowledge-page
rebuilds from now on. Existing page content is not retroactively re-governed;
rebuild a page with `mental_model_refresh` if you want it under the new rule.

## Step 4 — retire what you no longer follow

```
directive_delete  id=<id>
```

Reversible: `directive_list` output contains everything needed to recreate it,
so copy the rule before removing it if you might want it back.

## When not to use this

- **The answer is factually wrong.** Use `/correct-memory` — a rule cannot
  make a wrong fact right.
- **You want to change what gets stored** from conversations. That is the
  extraction setting, it is an operator-level control, and this relay refuses
  to write it on purpose: a tool able to change what memory keeps could rewrite
  the memory rules for everything that follows.
- **You want the bank to have a different personality.** That is
  `memory_set_mission`, one setting, not a list of rules.
