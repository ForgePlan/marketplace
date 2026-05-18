#!/bin/bash
# Validate all plugins or a specific plugin
# Usage:
#   ./scripts/validate-all-plugins.sh              # all plugins
#   ./scripts/validate-all-plugins.sh laws-of-ux   # specific plugin

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGINS_DIR="$REPO_ROOT/plugins"
SPECIFIC_PLUGIN=""
STRICT_AGENTS=0
for arg in "$@"; do
    case "$arg" in
        --strict-agents) STRICT_AGENTS=1 ;;
        --help|-h)
            echo "Usage: $0 [plugin-name] [--strict-agents]"
            echo "  plugin-name      Validate only this plugin (omit for all)"
            echo "  --strict-agents  Treat legacy agent lint warnings as errors"
            exit 0
            ;;
        --*) echo "Unknown flag: $arg" >&2; exit 1 ;;
        *) SPECIFIC_PLUGIN="$arg" ;;
    esac
done
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

    # Check v2 optional fields (warn if missing, don't fail)
    local category
    category=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('category',''))" "$plugin_dir/.claude-plugin/plugin.json" 2>/dev/null || true)
    [ -z "$category" ] && echo "  INFO: No 'category' field (v2 schema)"

    # Validate components if present
    local has_components
    has_components=$(python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print('yes' if 'components' in d else 'no')" "$plugin_dir/.claude-plugin/plugin.json" 2>/dev/null || true)
    if [ "$has_components" = "yes" ]; then
        echo "  OK: v2 components field present"
    fi

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

# ============================================================
# Canonical agent-pattern lint rules (LR-1..LR-7)
# Per PRD-026 Phase 4 + EVID-044 Section G.
#
# Forgeplan-aware agents (those whose tools whitelist contains any
# `mcp__forgeplan__*` tool) MUST conform to the canon — failures are
# ERRORS. Legacy v1.0 agents (no mcp__forgeplan__* in whitelist) get
# the same checks as WARNINGS (migration nudge).
#
# Rules:
#   LR-1 model is one of {opus, sonnet, haiku}, never `inherit`
#   LR-2 color is hex "#RRGGBB"
#   LR-3 description is bilingual block (EN: + RU: + Triggers:)
#   LR-4 no Profile mixing — not BOTH {Write|Edit} AND {forgeplan_new|update|link}
#   LR-5 no `forgeplan_activate` in any agent's whitelist
#   LR-6 Profile B agents (has Bash + forgeplan_new, no Write/Edit) must
#        NOT have {forgeplan_reason, forgeplan_claims, memory_retain}
#   LR-7 HARD RULES list items use plain bold, no emoji prefixes
#        (🔴 / 🟠 / 🟡 / 🔵 as bullet prefix is forbidden)
#
# Pass `--strict-agents` to also fail on legacy WARNINGS.
# ============================================================
echo ""
echo "=== Canonical agent-pattern lint (forgeplan-aware) ==="
LINT_OUTPUT=$(python3 - "$PLUGINS_DIR" "$STRICT_AGENTS" "${SPECIFIC_PLUGIN:-}" << 'PYEOF'
import os, re, sys, yaml

plugins_dir = sys.argv[1]
strict = sys.argv[2] == '1'
specific_plugin = sys.argv[3] if len(sys.argv) > 3 else ''

errors = 0
warns = 0
checked = 0
forgeplan_aware = 0
legacy = 0

LR_DESCRIPTIONS = {
    'LR-1': 'model must be opus|sonnet|haiku (never inherit)',
    'LR-2': 'color must be hex #RRGGBB',
    'LR-3': 'description must be bilingual (EN: + RU: + Triggers:)',
    'LR-4': 'profile mixing — both Write/Edit AND forgeplan_new/update/link present',
    'LR-5': 'forgeplan_activate must not appear in any agent whitelist (orchestrator/guardian territory)',
    'LR-6': 'Profile B agent has forbidden tools (forgeplan_reason/claims/memory_retain)',
    'LR-7': 'HARD RULES list items must not have emoji prefix (use plain **Never**/**Always**)',
}

def parse_frontmatter(text):
    m = re.match(r'^---\n(.*?)\n---\n', text, re.S)
    if not m:
        return None, None
    try:
        fm = yaml.safe_load(m.group(1))
    except Exception:
        return None, None
    body = text[m.end():]
    return fm, body

def check_agent(plugin, agent_path):
    global errors, warns, checked, forgeplan_aware, legacy
    text = open(agent_path).read()
    fm, body = parse_frontmatter(text)
    agent_name = os.path.basename(agent_path)[:-3]
    if fm is None:
        return  # malformed; original validator caught this
    checked += 1

    tools = fm.get('tools', []) or []
    if not isinstance(tools, list):
        tools = []
    tools_set = set(tools)

    # Parse disallowedTools (B2 paradigm — comma-separated string OR list)
    disallowed_raw = fm.get('disallowedTools', '') or ''
    if isinstance(disallowed_raw, str):
        disallowed_set = set(t.strip() for t in disallowed_raw.split(',') if t.strip())
    elif isinstance(disallowed_raw, list):
        disallowed_set = set(disallowed_raw)
    else:
        disallowed_set = set()

    # Detect forgeplan-aware:
    #   - Legacy v1 path: tools allowlist contains mcp__forgeplan__*
    #   - B2 canonical path: disallowedTools mentions mcp__forgeplan__forgeplan_activate
    #     (only canonical Profile A/B/D agents explicitly deny activate)
    #   - Body path: mentions mcp__forgeplan__ MCP calls
    is_fp_aware_legacy = any(t.startswith('mcp__forgeplan__') for t in tools)
    is_fp_aware_b2 = 'mcp__forgeplan__forgeplan_activate' in disallowed_set or any(t.startswith('mcp__forgeplan__') for t in disallowed_set)
    is_fp_aware_body = bool(body and 'mcp__forgeplan__' in body)
    is_fp_aware = is_fp_aware_legacy or is_fp_aware_b2 or is_fp_aware_body
    if is_fp_aware:
        forgeplan_aware += 1
    else:
        legacy += 1

    findings = []  # list of (rule, message)

    # LR-1: model
    model = fm.get('model', '')
    if model not in ('opus', 'sonnet', 'haiku'):
        findings.append(('LR-1', f"model='{model}' (must be opus|sonnet|haiku)"))

    # LR-2: color hex
    color = str(fm.get('color', ''))
    if not re.match(r'^#[0-9A-Fa-f]{6}$', color):
        findings.append(('LR-2', f"color='{color}' (must be hex #RRGGBB)"))

    # LR-3: bilingual description
    desc = fm.get('description', '')
    if isinstance(desc, str):
        missing = [s for s in ('EN:', 'RU:', 'Triggers:') if s not in desc]
        if missing:
            findings.append(('LR-3', f"description missing: {','.join(missing)}"))
    else:
        findings.append(('LR-3', f"description is not a string"))

    # LR-4: no profile mixing
    writes = tools_set & {'Write', 'Edit'}
    mutates = tools_set & {
        'mcp__forgeplan__forgeplan_new',
        'mcp__forgeplan__forgeplan_update',
        'mcp__forgeplan__forgeplan_link',
    }
    if writes and mutates:
        findings.append(('LR-4', f"profile mixing — has both {sorted(writes)} and forgeplan mutators {sorted(mutates)}"))

    # LR-5: no forgeplan_activate
    if 'mcp__forgeplan__forgeplan_activate' in tools_set:
        findings.append(('LR-5', "forgeplan_activate in whitelist (orchestrator/guardian only)"))

    # LR-6: Profile B forbidden tools
    is_profile_b = (
        'mcp__forgeplan__forgeplan_new' in tools_set
        and 'Bash' in tools_set
        and 'Write' not in tools_set
        and 'Edit' not in tools_set
    )
    if is_profile_b:
        forbidden = tools_set & {
            'mcp__forgeplan__forgeplan_reason',
            'mcp__forgeplan__forgeplan_claims',
            'mcp__plugin_fpl-hsmem_hindsight__memory_retain',
        }
        if forbidden:
            findings.append(('LR-6', f"Profile B agent has forbidden tools: {sorted(forbidden)}"))

    # LR-7: HARD RULES voice — no emoji prefix on numbered list items
    if body:
        # extract HARD RULES section
        m = re.search(r'^##\s+HARD RULES\s*\n(.*?)(?=^##\s|\Z)', body, re.S | re.M)
        if m:
            rules_block = m.group(1)
            for line in rules_block.splitlines():
                if re.match(r'^\s*[0-9]+\.\s+[🔴🟠🟡🔵]', line):
                    findings.append(('LR-7', f"HARD RULES emoji-prefixed line: {line.strip()[:60]}..."))
                    break  # first hit is enough

    # Report findings
    for rule, msg in findings:
        if is_fp_aware:
            print(f"  ERROR [{rule}] {plugin}/{agent_name} — {msg}")
            errors += 1
        else:
            print(f"  WARN  [{rule}] {plugin}/{agent_name} (legacy) — {msg}")
            warns += 1

# scan all plugins
for plugin in sorted(os.listdir(plugins_dir)):
    if specific_plugin and plugin != specific_plugin:
        continue
    agent_dir = os.path.join(plugins_dir, plugin, 'agents')
    if not os.path.isdir(agent_dir):
        continue
    for fname in sorted(os.listdir(agent_dir)):
        if not fname.endswith('.md'):
            continue
        check_agent(plugin, os.path.join(agent_dir, fname))

print(f"\n  Scanned: {checked} agents ({forgeplan_aware} forgeplan-aware, {legacy} legacy)")
print(f"  Errors:  {errors} (forgeplan-aware violations — must fix)")
print(f"  Warns:   {warns} (legacy violations — migration nudge)")

# exit code: errors always fail; warns fail only in strict mode
if errors > 0 or (strict and warns > 0):
    sys.exit(1)
sys.exit(0)
PYEOF
)
LINT_EXIT=$?
echo "$LINT_OUTPUT"
if [ $LINT_EXIT -ne 0 ]; then
    ERRORS=$((ERRORS + 1))
fi

# Check for command name collisions across plugins
echo ""
echo "=== Checking command collisions ==="
python3 - "$PLUGINS_DIR" << 'PYEOF'
import os, re, sys
plugins_dir = sys.argv[1]
owners = {}
collisions = 0
for plugin in sorted(os.listdir(plugins_dir)):
    cmd_dir = os.path.join(plugins_dir, plugin, 'commands')
    if not os.path.isdir(cmd_dir):
        continue
    for fname in sorted(os.listdir(cmd_dir)):
        if not fname.endswith('.md'):
            continue
        fpath = os.path.join(cmd_dir, fname)
        with open(fpath) as f:
            head = ''.join(f.readline() for _ in range(5))
        m = re.search(r'^name:\s*["\']?(.+?)["\']?\s*$', head, re.MULTILINE)
        if m:
            cmd_name = m.group(1).strip()
            if cmd_name in owners:
                print(f"  WARN: Command '{cmd_name}' in '{plugin}' collides with '{owners[cmd_name]}'")
                collisions += 1
            else:
                owners[cmd_name] = plugin
if collisions:
    print(f"  {collisions} command collision(s) found")
else:
    print(f"  OK: No command collisions ({len(owners)} commands checked)")
PYEOF

echo ""
if [ $ERRORS -gt 0 ]; then
    echo "FAILED: $ERRORS error(s) found"
    exit 1
else
    echo "ALL PASSED"
fi
