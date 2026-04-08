# Contributing to ForgePlan Marketplace

## Adding a new plugin

### 1. Create plugin directory

```bash
mkdir -p plugins/your-plugin-name/.claude-plugin
```

### 2. Create plugin.json

```json
{
  "name": "your-plugin-name",
  "version": "1.0.0",
  "description": "Brief description of what the plugin does",
  "author": {
    "name": "Your Name",
    "url": "https://github.com/your-username"
  },
  "license": "MIT",
  "keywords": ["relevant", "tags"]
}
```

### 3. Add your components

| Component | Directory | Format |
|-----------|-----------|--------|
| Commands | `commands/` | Markdown with YAML frontmatter (`name`, `description`) |
| Agents | `agents/` | Markdown with YAML frontmatter (`name`, `description`, `model`, `color`) |
| Skills | `skills/skill-name/` | `SKILL.md` + optional `sections/` |
| Hooks | `hooks/` | `hooks.json` |

### 4. Register in marketplace.json

Add your plugin to `.claude-plugin/marketplace.json`:

```json
{
  "name": "your-plugin-name",
  "source": "./plugins/your-plugin-name",
  "description": "Same as plugin.json description",
  "version": "1.0.0",
  "author": { "name": "Your Name" },
  "keywords": ["relevant", "tags"]
}
```

### 5. Validate

```bash
./scripts/validate-all-plugins.sh your-plugin-name
```

### 6. Submit PR

- Branch: `add/your-plugin-name`
- PR title: `Add plugin: your-plugin-name`
- Include a brief description of what the plugin does

## Updating an existing plugin

1. Make changes in `plugins/your-plugin-name/`
2. Bump `version` in both `plugin.json` and `marketplace.json`
3. Submit PR with title: `Update plugin: your-plugin-name v1.1.0`

## Plugin quality checklist

- [ ] `plugin.json` has `name`, `version`, `description`
- [ ] Commands have `name` and `description` in frontmatter
- [ ] Agents have `name`, `description`, `model`, `color` in frontmatter
- [ ] Skills have `name` and `description` in SKILL.md frontmatter
- [ ] `hooks.json` is valid JSON
- [ ] No hardcoded paths (use `${CLAUDE_PLUGIN_ROOT}` for scripts)

### hooks.json Schema

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/your-hook.sh",
            "timeout": 3
          }
        ]
      }
    ]
  }
}
```

| Field | Values | Notes |
|-------|--------|-------|
| Event | `PreToolUse`, `PostToolUse` | Top-level key |
| `matcher` | Tool name or `\|`-joined list | e.g. `"Bash"`, `"Write\|Edit"` |
| `type` | `"command"` | **Only supported type — `"prompt"` is BANNED (see below)** |
| `command` | Shell command | Use `${CLAUDE_PLUGIN_ROOT}` for paths |
| `timeout` | Integer (seconds) | Recommended: 3-5 |

### Why `"type": "prompt"` is banned

Prompt-type hooks inject an LLM instruction into the agent ("Check the command and respond if X, else respond with empty string"). This is **non-deterministic** and causes two critical problems:

1. **False blocks**: The LLM sometimes "thinks out loud" before returning empty, and its reasoning is interpreted by the harness as a stop signal. Result: agent halts on unrelated commands.
2. **Token cost**: Every single tool call pays for an LLM round-trip, even when the hook should be silent.

**Correct pattern — command hook with silent exit:**

```bash
#!/usr/bin/env bash
# Hint about /sync only when forgeplan activate runs. Silent otherwise.

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)

[ -z "$CMD" ] && exit 0

case "$CMD" in
  *"forgeplan activate"*)
    echo '{"message":"Consider /sync to keep Orchestra in sync."}'
    exit 0
    ;;
  *)
    exit 0  # silent for all other commands
    ;;
esac
```

The CI check `Ban prompt-type hooks` enforces this rule — any `"type": "prompt"` in `hooks.json` fails the build.
- [ ] README.md included in plugin directory
