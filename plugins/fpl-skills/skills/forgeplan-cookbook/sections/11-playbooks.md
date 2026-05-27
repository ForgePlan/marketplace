# Section 11 — Playbooks (PRD-065 / SPEC-003)

**4 tools** for declarative YAML orchestration. Playbooks define multi-step workflows that dispatch plugins / agents / skills / commands / forgeplan_core actions in sequence.

## 11.1 forgeplan_playbook_list — discover playbooks

Read-only filesystem scan for workspace + plugin-pack playbooks.

```python
forgeplan_playbook_list()
# → [{"name": "feature-dev-standard", "title": "...", "step_count": 8,
#     "source": ".forgeplan/playbooks/feature-dev-standard.yaml"}, ...]
```

## 11.2 forgeplan_playbook_show — full details for one playbook

```python
forgeplan_playbook_show(target="feature-dev-standard")        # by name
forgeplan_playbook_show(target=".forgeplan/playbooks/x.yaml") # by path
```

Returns parsed Playbook struct + source path.

## 11.3 forgeplan_playbook_validate — structural validation

Parse + cycle detection + unknown-step-ref check + mapping/produces_at consistency.

```python
forgeplan_playbook_validate(file=".forgeplan/playbooks/x.yaml")
# → {"passed": true, "errors": []} or {"passed": false, "errors": [...]}
```

## 11.4 forgeplan_playbook_run — execute end-to-end

```python
forgeplan_playbook_run(target="feature-dev-standard", yes=true, dry_run=true)
forgeplan_playbook_run(target="...", yes=true)                     # full execution
forgeplan_playbook_run(target="...", yes=true, step=3)             # start at step 3
forgeplan_playbook_run(target="...", yes=true, allow_shell=true)    # required for shell-exec steps
```

**Security gates** (ADR-009):

1. `yes: true` — required to consent to any execution.
2. `allow_shell: true` — required ALONGSIDE `yes` when the playbook contains `Delegation::Command` (shell-exec) steps. Default-deny per PRD-074 / PROB-053.

Workspace pre-approval: `[playbook] allow_shell = true` in `.forgeplan/config.yaml`.

**Use `dry_run: true`** to enumerate steps without invoking dispatchers — safe inspection mode.

## Example invocation chain

```python
# 1. List available
playbooks = forgeplan_playbook_list()

# 2. Validate the one you want before running
v = forgeplan_playbook_validate(file=playbooks[0]["source"])
if not v["passed"]:
    halt(v["errors"])

# 3. Dry-run to inspect step plan
plan = forgeplan_playbook_run(target=playbooks[0]["name"], yes=true, dry_run=true)
print(plan["steps"])

# 4. Real execution
result = forgeplan_playbook_run(target=playbooks[0]["name"], yes=true)
```

## When to write a playbook vs use the orchestrator entrypoints

| Need | Use |
|---|---|
| One-off task in this session | `/forge-cycle` or `/autorun` |
| Repeatable workflow you'll run dozens of times | Playbook |
| Cross-CLI portability (Claude / Codex / Gemini) | Playbook (declarative YAML is CLI-agnostic) |
| Customisation per-domain (your repo's quirks) | Playbook (lives in `.forgeplan/playbooks/`) |
