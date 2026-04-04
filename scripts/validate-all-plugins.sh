#!/bin/bash
# Validate all plugins or a specific plugin
# Usage:
#   ./scripts/validate-all-plugins.sh              # all plugins
#   ./scripts/validate-all-plugins.sh laws-of-ux   # specific plugin

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGINS_DIR="$REPO_ROOT/plugins"
SPECIFIC_PLUGIN="${1:-}"
ERRORS=0

validate_plugin() {
    local plugin_dir="$1"
    local plugin_name="$(basename "$plugin_dir")"

    echo "--- Validating: $plugin_name ---"

    # Check plugin.json exists
    if [ ! -f "$plugin_dir/.claude-plugin/plugin.json" ]; then
        echo "  FAIL: Missing .claude-plugin/plugin.json"
        ERRORS=$((ERRORS + 1))
        return
    fi

    # Check plugin.json is valid JSON
    if ! python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$plugin_dir/.claude-plugin/plugin.json" 2>/dev/null; then
        echo "  FAIL: plugin.json is not valid JSON"
        ERRORS=$((ERRORS + 1))
        return
    fi

    # Check required fields
    local name
    name=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('name',''))" "$plugin_dir/.claude-plugin/plugin.json")
    local version
    version=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('version',''))" "$plugin_dir/.claude-plugin/plugin.json")
    local desc
    desc=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('description',''))" "$plugin_dir/.claude-plugin/plugin.json")

    [ -z "$name" ] && { echo "  FAIL: Missing 'name' in plugin.json"; ERRORS=$((ERRORS + 1)); }
    [ -z "$version" ] && { echo "  FAIL: Missing 'version' in plugin.json"; ERRORS=$((ERRORS + 1)); }
    [ -z "$desc" ] && { echo "  FAIL: Missing 'description' in plugin.json"; ERRORS=$((ERRORS + 1)); }

    # Check commands frontmatter
    if [ -d "$plugin_dir/commands" ]; then
        for cmd in "$plugin_dir/commands"/*.md; do
            [ -f "$cmd" ] || continue
            if ! head -1 "$cmd" | grep -q "^---"; then
                echo "  WARN: $(basename "$cmd") missing YAML frontmatter"
            fi
        done
    fi

    # Check agents frontmatter
    if [ -d "$plugin_dir/agents" ]; then
        for agent in "$plugin_dir/agents"/*.md; do
            [ -f "$agent" ] || continue
            if ! head -1 "$agent" | grep -q "^---"; then
                echo "  WARN: $(basename "$agent") missing YAML frontmatter"
            fi
        done
    fi

    # Check hooks.json validity
    if [ -f "$plugin_dir/hooks/hooks.json" ]; then
        if ! python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$plugin_dir/hooks/hooks.json" 2>/dev/null; then
            echo "  FAIL: hooks.json is not valid JSON"
            ERRORS=$((ERRORS + 1))
        fi
    fi

    # Check SKILL.md exists for skills
    if [ -d "$plugin_dir/skills" ]; then
        for skill_dir in "$plugin_dir/skills"/*/; do
            [ -d "$skill_dir" ] || continue
            if [ ! -f "$skill_dir/SKILL.md" ]; then
                echo "  WARN: $(basename "$skill_dir") missing SKILL.md"
            fi
        done
    fi

    echo "  OK: $plugin_name validated"
}

# Validate marketplace.json
echo "=== Validating marketplace.json ==="
if ! python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$REPO_ROOT/.claude-plugin/marketplace.json" 2>/dev/null; then
    echo "  FAIL: marketplace.json is not valid JSON"
    exit 1
fi
echo "  OK: marketplace.json is valid"
echo ""

# Validate plugins
echo "=== Validating plugins ==="
if [ -n "$SPECIFIC_PLUGIN" ]; then
    if [ -d "$PLUGINS_DIR/$SPECIFIC_PLUGIN" ]; then
        validate_plugin "$PLUGINS_DIR/$SPECIFIC_PLUGIN"
    else
        echo "Plugin '$SPECIFIC_PLUGIN' not found"
        exit 1
    fi
else
    for plugin_dir in "$PLUGINS_DIR"/*/; do
        [ -d "$plugin_dir" ] || continue
        validate_plugin "$plugin_dir"
    done
fi

echo ""
if [ $ERRORS -gt 0 ]; then
    echo "FAILED: $ERRORS error(s) found"
    exit 1
else
    echo "ALL PASSED"
fi
