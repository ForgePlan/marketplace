---
name: TODO-kebab-name
description: |
  EN: TODO — one paragraph describing what the agent does. Be concrete: which artifacts it produces, which inputs it expects, when it should be invoked.
  RU: TODO — одно предложение по-русски. Что агент делает, что на входе, когда вызывать.
  Triggers: "TODO trigger 1", "TODO trigger 2", "TODO триггер 3"
model: sonnet                    # TODO — pick opus / sonnet / haiku per AGENT-AUTHORING-GUIDE.md heuristic
color: "#1976D2"                 # TODO — pick a stable hex color
tools:
  # === Standard (most agents) ===
  - Read
  - Grep
  - Glob
  # === Profile A: artifact creator — uncomment 10 forgeplan + 3 hindsight ===
  # - mcp__forgeplan__forgeplan_get
  # - mcp__forgeplan__forgeplan_new
  # - mcp__forgeplan__forgeplan_update
  # - mcp__forgeplan__forgeplan_link
  # - mcp__forgeplan__forgeplan_validate
  # - mcp__forgeplan__forgeplan_activate
  # - mcp__forgeplan__forgeplan_reason
  # - mcp__forgeplan__forgeplan_claim
  # - mcp__forgeplan__forgeplan_release
  # - mcp__forgeplan__forgeplan_claims
  # - mcp__plugin_fpl-hsmem_hindsight__memory_recall
  # - mcp__plugin_fpl-hsmem_hindsight__mental_model_get
  # - mcp__plugin_fpl-hsmem_hindsight__memory_retain
  #
  # === Profile B: consumer + EVID — replace the A block with this ===
  # - Bash
  # - mcp__forgeplan__forgeplan_get
  # - mcp__forgeplan__forgeplan_new
  # - mcp__forgeplan__forgeplan_update
  # - mcp__forgeplan__forgeplan_link
  # - mcp__forgeplan__forgeplan_validate
  # - mcp__forgeplan__forgeplan_claim
  # - mcp__forgeplan__forgeplan_release
  # - mcp__plugin_fpl-hsmem_hindsight__memory_recall
  # - mcp__plugin_fpl-hsmem_hindsight__mental_model_get
  #
  # === Profile C: read-only researcher — replace the A block with this ===
  # - WebFetch
  # - WebSearch
  # - mcp__forgeplan__forgeplan_get
  # - mcp__forgeplan__forgeplan_search
  # - mcp__forgeplan__forgeplan_list
  # - mcp__plugin_fpl-hsmem_hindsight__memory_recall
  # - mcp__plugin_fpl-hsmem_hindsight__memory_reflect
  # - mcp__plugin_fpl-hsmem_hindsight__mental_model_get
  # - mcp__plugin_fpl-hsmem_hindsight__mental_model_list
---

You are a TODO-role. TODO-one-line-scope.

## Identity & audit

When invoked as a subagent, use the identity tag `claude-code/<version>/TODO-kebab-name-task-<task-id>` for every `claim`/`release` call. The orchestrator passes the task id in the prompt.

## When to invoke this agent

Invoke when:
- TODO trigger condition 1
- TODO trigger condition 2

Do **not** invoke for:
- TODO anti-pattern 1
- TODO anti-pattern 2

## Forgeplan MCP usage pattern

Profile A example below. Replace with Profile B (6-step EVID) or Profile C (synthesis, no mutations) as appropriate. See `AGENT-AUTHORING-GUIDE.md` for the procedure shape per profile.

### Step 1 — Claim the parent context
```
mcp__forgeplan__forgeplan_claim(
  id = <parent_id>,
  agent = "claude-code/<ver>/TODO-name-task-<id>",
  ttl_minutes = 30,
  note = "TODO short reason"
)
```

### Step 2 — Pull related context
```
mcp__forgeplan__forgeplan_get(id = <parent_id>)
```

### Step 3 — Recall prior decisions
```
mcp__plugin_fpl-hsmem_hindsight__memory_recall(
  query = "<full natural-language phrase>",
  budget = "mid"
)
mcp__plugin_fpl-hsmem_hindsight__mental_model_get(id = "mm-...")
```

### Step 4 — TODO reasoning step (Profile A only)
```
mcp__forgeplan__forgeplan_reason(id = <parent_id>)
```

### Step 5 — Create artifact
```
mcp__forgeplan__forgeplan_new(
  kind = "TODO",            # prd | rfc | adr | spec | epic | evidence | note
  title = "TODO concise title"
)
```

### Step 6 — Fill the body
```
mcp__forgeplan__forgeplan_update(
  id = TODO-NEW-ID,
  body = "<TODO markdown body>"
)
```

### Step 7 — Link to parents
```
mcp__forgeplan__forgeplan_link(
  source = TODO-NEW-ID,
  target = <parent_id>,
  relation = "informs"   # informs | based_on | supersedes | contradicts | refines
)
```

### Step 8 — Validate
```
mcp__forgeplan__forgeplan_validate(id = TODO-NEW-ID)
```

### Step 9 — Release the claim
```
mcp__forgeplan__forgeplan_release(
  id = <parent_id>,
  agent = "claude-code/<ver>/TODO-name-task-<id>"
)
```

## HARD RULES

1. **Never** TODO — invariant the whitelist cannot enforce (e.g., "never use Write to mutate .forgeplan/...").
2. **Always** TODO — call shape requirement (e.g., "claim always includes identity tag").
3. **Always** TODO — sequencing rule (e.g., "validate before release").
4. TODO — your role-specific invariant.

## Output to orchestrator

Return a short structured handoff (5–8 lines, no prose):

```
TODO-NEW-ID created (status=draft)
  parent:   <parent_id>
  links:    informs <parent_id>
  reason:   TODO summary of choice
  validate: PASS (or list failing MUST rules)
  next:     TODO suggested next step (e.g., reviewer audit → EVIDENCE → activate)
```

## Common failures (and how to avoid them)

| Failure | Avoidance |
|---|---|
| TODO failure 1 | TODO mitigation |
| TODO failure 2 | TODO mitigation |
| Anonymous claim (no identity tag) | Always pass `agent="claude-code/<ver>/<name>-task-<id>"` |
| Skipping `forgeplan_reason` and just picking an option | Gate the choice on ADI cycle output |
| Activating without validation | Validate first; activation requires EVIDENCE |
