# Section 10 — FPF (First Principles Framework) knowledge base

**5 tools** for querying the FPF KB + introspecting rules.

## 10.1 forgeplan_fpf_list — list all KB sections

```python
forgeplan_fpf_list()
# → [{"id": "A.1", "title": "..."}, {"id": "B.3", "title": "..."}, ...]
```

## 10.2 forgeplan_fpf_search — search KB by query

Default keyword; pass `semantic=true` for BGE-M3 vector similarity.

```python
forgeplan_fpf_search(query="abduction")                          # keyword
forgeplan_fpf_search(query="when to escalate", semantic=true)    # vector
forgeplan_fpf_search(query="...", limit=20)                       # bigger result set
```

**First semantic call**: may take 10-30 seconds (BGE-M3 model download, ~150MB). Subsequent calls are fast.

**Graceful fallback**: if `semantic-search` build feature not compiled in, query falls back to keyword + response includes `warning` field.

## 10.3 forgeplan_fpf_section — get section by ID

```python
forgeplan_fpf_section(id="B.3")
forgeplan_fpf_section(id="C.2.2")
```

**Use case**: agent needs the full text of an FPF principle. Faster than search if you know the ID.

## 10.4 forgeplan_fpf_check — which rules apply to an artifact

Returns matched rules + winning rule (first in priority order) + non-matched rules with reasons. Use to understand FPF engine behaviour for a specific artifact before mutating it.

```python
forgeplan_fpf_check(id="PRD-041")
# → {"matched": [...], "winning": {...}, "not_matched": [...]}
```

## 10.5 forgeplan_fpf_rules — list active rules

```python
forgeplan_fpf_rules()                       # all rules with full condition trees
forgeplan_fpf_rules(summary=true)           # name + priority + action only
forgeplan_fpf_rules(action="INVESTIGATE")   # only INVESTIGATE rules
forgeplan_fpf_rules(name="orphan-active")   # one rule by name
forgeplan_fpf_rules(source="config")        # workspace-defined rules only
```

**Workspace rules** override built-in defaults — defined under `fpf.rules` in `.forgeplan/config.yaml`.

**Use case**: debug why an artifact is flagged (or not flagged). Pair with `forgeplan_fpf_check` for the artifact-side view.
