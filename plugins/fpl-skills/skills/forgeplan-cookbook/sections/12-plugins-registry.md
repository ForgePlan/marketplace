# Section 12 — Plugins registry (PRD-067)

**3 tools** for plugin detection across Claude / agentskills / Cursor / Forgeplan.

## 12.1 forgeplan_plugins_list — what's installed

```python
forgeplan_plugins_list()
# → [{"name": "forgeplan", "source": "forgeplan", "version": "0.32.1", "path": "(built-in)"},
#    {"name": "agents-pro", "source": "claude-code", "version": "1.11.1", "path": "..."}, ...]
```

Read-only filesystem scan. Detects installed plugins from `~/.claude/plugins/`, agentskills directories, Cursor settings.

## 12.2 forgeplan_plugins_doctor — health-check

Health-check the extended plugin registry: ok / outdated / missing.

```python
forgeplan_plugins_doctor()
# → {"ok": 5, "outdated": 1, "missing": 11,
#    "details": [...]}
```

⚠️ **forgeplan#351 wart**: install hints output `claude plugin install <name>` — that's wrong. Real syntax is `/plugin install <name>@<marketplace>`. See [`14.3`](14-mcp-safety-warnings.md).

**Also**: plugin-name registry may drift from `ForgePlan/marketplace` (e.g., `sparc-specification` reported missing, actual name is `agents-sparc`). Verify against the marketplace catalog before following install hints.

## 12.3 forgeplan_plugins_info — details for one plugin

```python
forgeplan_plugins_info(name="agents-pro")
# → {"static_info": {"description": "...", "version_req": "*"},
#    "installed": {"path": "...", "version": "1.11.1"}}
```

Returns the static `PluginInfo` (what the registry expects) + `InstalledPlugin` runtime record (path + version actually on disk), or only the static info if not installed.

## Use case — pre-bootstrap plugin verification

`/smith-bootstrap` Step 0a does this kind of check (via `~/.claude/settings.json` `enabledPlugins` probe, not via `forgeplan_plugins_*`). The forgeplan-side tools are mostly for cross-CLI / Cursor verification where Claude Code's own settings are not available.

```python
status = forgeplan_plugins_doctor()
if status["missing"]:
    # Don't follow the bad `claude plugin install` hint.
    # Translate to Claude Code's syntax manually:
    for m in status["details"]:
        if not m["installed"]:
            print(f"/plugin install {m['name']}@ForgePlan-marketplace")
```
