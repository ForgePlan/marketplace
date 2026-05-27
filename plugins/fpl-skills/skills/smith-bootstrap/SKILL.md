---
name: smith-bootstrap
description: |
  Greenfield-project onboarding skill. For a fresh repo (no CLAUDE.md, no forgeplan, no AGENTS.md), runs an active infrastructure setup (plugin gate → forgeplan MCP auto-wire via `forgeplan mcp install` → Hindsight detection + env-var remap guidance → `.claude/hooks/` baseline bundle → reload + verify) → pre-flight detection → forgeplan init → CLAUDE.md scaffold → AGENTS.md scaffold → plugin install recommendations → first Brief via brief-intake agent → first PRD via specification agent. Output: bootstrap checklist artifact + a confirmed greenfield project ready for the canonical /forge-cycle pipeline.

  Triggers: "smith bootstrap", "/smith-bootstrap", "bootstrap project", "новый проект", "fresh start", "greenfield onboarding", "init this project"
---

# /smith-bootstrap — greenfield onboarding

You bootstrap a fresh (greenfield) project into the ForgePlan canonical pipeline. The procedure is one-time: **Step 0 active infrastructure setup (5 sub-steps)** → pre-flight detection → forgeplan init → CLAUDE.md + AGENTS.md scaffold → MUST/SHOULD plugin recommendations → first Brief → first PRD. End state: project is ready for `/forge-cycle` on the first PRD with the MCP layer fully wired and verified.

This skill is a **wrapper around `templates/smith-bootstrap.md`** (the output template). It procedurally drives the template top-to-bottom, marking `[x]` as each step lands. The skill is the doer; the template is the artifact.

Foundation: EPIC-002 «smith master orchestrator». Sibling skills: `/smith` (default routing entry), `/smith-plan` (planning mode), `/smith-routing` (depth router).

---

## When to invoke

- Fresh repo with no `.git` or empty `.git` (no commits yet).
- No `CLAUDE.md` present at repo root.
- No `AGENTS.md` present at repo root.
- No `.forgeplan/` directory or empty `.forgeplan/`.
- No `.mcp.json` declaring forgeplan / hindsight MCP servers.
- User explicitly says "новый проект" / "bootstrap" / "let's start" / "fresh start" / "init this project".
- `/smith` default mode auto-delegates here when pre-flight checks fail (i.e., scaffolds absent).

## When NOT to use

- The project already has a populated `CLAUDE.md` + `.forgeplan/` with active artifacts — route to `/smith` default mode.
- The repo has substantial existing source code with no forgeplan history — route to `forgeplan-brownfield-pack:discover`.
- User only wants to add a single plugin or skill — tactical; do it directly.

---

## Step 0 — Active infrastructure setup

This is the most important departure from a typical declarative bootstrap: `/smith-bootstrap` **actively wires** the project's MCP / Hindsight / hooks infrastructure rather than asking the user to do it manually elsewhere. We discovered through real-project usage (a sibling project bootstrapped on 2026-05-20) that delegating MCP wiring to "run `/fpl-init` first" creates a dead zone — the user thinks bootstrap is done, but the MCP layer is not actually wired, so subsequent agent dispatches silently shell-fall-back and produce degraded artifacts (e.g., a PRD created by `agents-pro:artifact-author` because `agents-sparc:specification` was not reachable).

Five sub-steps, executed in order. Only Step 0a halts on miss — the rest act on what they find or print specific guidance and continue.

### Step 0a — Plugin enablement gate (halt-only — cannot auto-fix)

Required plugins for greenfield bootstrap (matches Step 4 MUST tier). Plus a SHOULD probe for `fpl-hsmem` (Hindsight) — not blocking, but Step 0c needs to know whether it's enabled.

```bash
REQUIRED=(fpl-skills agents-pro agents-sparc agents-core forgeplan-workflow)
SHOULD=(fpl-hsmem fpf)

# Probe enabled plugins from Claude Code's user config (~/.claude/settings.json holds enabledPlugins).
# Project-local .claude/settings.local.json holds permissions, not plugin enablement.
ENABLED_LIST=$(python3 - <<'PY' 2>/dev/null
import json, pathlib
p = pathlib.Path.home() / ".claude/settings.json"
d = json.loads(p.read_text()) if p.exists() else {}
# enabledPlugins keys are formatted as "plugin-name@marketplace-name"
print("\n".join((d.get("enabledPlugins") or {}).keys()))
PY
)

MISSING_MUST=(); MISSING_SHOULD=()
for plugin in "${REQUIRED[@]}"; do
    echo "$ENABLED_LIST" | grep -q "^${plugin}@" || MISSING_MUST+=("$plugin")
done
for plugin in "${SHOULD[@]}"; do
    echo "$ENABLED_LIST" | grep -q "^${plugin}@" || MISSING_SHOULD+=("$plugin")
done
```

**If `MISSING_MUST` is non-empty — HALT.** Print:

```
✗ Bootstrap halted — required plugins are not enabled (Step 0a):

  <list of missing MUST plugins>

Install (one-time), then re-run /smith-bootstrap:

  /plugin marketplace add ForgePlan/marketplace
  /plugin install fpl-skills@ForgePlan-marketplace
  /plugin install agents-pro@ForgePlan-marketplace
  /plugin install agents-sparc@ForgePlan-marketplace
  /plugin install agents-core@ForgePlan-marketplace
  /plugin install forgeplan-workflow@ForgePlan-marketplace

Strongly recommended (install before re-running if you don't want to backfill later):

  /plugin install fpf@ForgePlan-marketplace        # FPF ADI reasoning (Standard+ requirement, Sprint Z7)
  /plugin install fpl-hsmem@ForgePlan-marketplace  # Hindsight cross-session memory bank

Why agents-sparc is MUST: Step 6 dispatches agents-sparc:specification for the first PRD.
Without it, the dispatch falls back to agents-pro:artifact-author (generic Profile A) — the PRD
lands but misses SPARC Specification's contract (SMART AC + ≥3 hypotheses via forgeplan_reason).
Halting up-front is cheaper than a re-run after /methodology-check flags the gap.
```

**If `MISSING_MUST` is empty** — print one line plus a note about any missing SHOULD plugins, and continue to Step 0b:

```
✓ Step 0a: 5/5 MUST plugins enabled (fpl-skills, agents-pro, agents-sparc, agents-core, forgeplan-workflow)
[~] Step 0a: 1/2 SHOULD plugins enabled (fpf enabled, fpl-hsmem missing — Step 0c will print Hindsight setup guidance)
```

### Step 0b — forgeplan MCP auto-wire (active)

Probe `.mcp.json` for `mcpServers.forgeplan` with `args: ["serve"]`. If absent / stale / missing-block — **actively wire** using forgeplan's native command (not Python merge):

```bash
# Probe current state
STATE=$(python3 - <<'PY' 2>/dev/null
import json, pathlib
p = pathlib.Path(".mcp.json")
if not p.exists():
    print("ABSENT"); raise SystemExit
try:
    d = json.loads(p.read_text())
except Exception as e:
    print(f"INVALID:{e}"); raise SystemExit
fp = d.get("mcpServers", {}).get("forgeplan")
if not fp:
    print("MISSING-FORGEPLAN-BLOCK")
elif fp.get("args") == ["mcp"]:
    print("STALE-ARGS")
elif fp.get("args") == ["serve"]:
    print("OK")
else:
    print(f"UNEXPECTED-ARGS:{fp.get('args')}")
PY
)
```

**If `STATE` is `OK`** — print `✓ Step 0b: forgeplan MCP already wired` and continue to Step 0c.

**If `STATE` is anything else** — verify `forgeplan` CLI is on PATH, then run the native install:

```bash
# Verify forgeplan CLI reachable first
if ! command -v forgeplan >/dev/null 2>&1; then
    cat <<'EOF'
✗ Step 0b HALT — forgeplan CLI is not on $PATH.

Install forgeplan first (one-time), then re-run /smith-bootstrap:
  • macOS / Linux Homebrew: brew install ForgePlan/tap/forgeplan
  • From source (Rust):     cargo install --git https://github.com/ForgePlan/forgeplan forgeplan-cli

Verify with `forgeplan --version`.
EOF
    exit 1
fi

# Wire via native command — smart-merge, idempotent, preserves existing hindsight/orch entries
forgeplan mcp install --client claude --scope project
```

Why the native command, not Python merge:

- `forgeplan mcp install` is owned by forgeplan and stays correct across CLI versions.
- It is idempotent and smart-merge (preserves existing `hindsight`, `orch`, and any other MCP server entries).
- It writes the canonical `command: forgeplan / args: ["serve"] / transport: stdio` form (`["mcp"]` is the historic buggy shape that does not start the server).
- Centralising on this command eliminates the Python-merge in `/fpl-init` (planned migration, separate PR) and avoids drift between the two skills.

Print `✓ Step 0b: forgeplan MCP wired via `forgeplan mcp install` (smart-merge preserved N existing entries)`.

### Step 0c — Hindsight detection + guidance (informational, not aggressive)

Hindsight cross-session memory is SHOULD (not MUST). Detect what is already there, classify the situation, and either confirm or print specific guidance. Never write API keys into `.mcp.json` automatically — those are user secrets and may be checked into git by mistake.

**Key insight**: when `fpl-hsmem` plugin is enabled (Step 0a SHOULD-probe `HSMEM_ENABLED=yes`), Claude Code reads the plugin's own MCP manifest and exposes the hindsight server at session level — **no project-local `.mcp.json` hindsight block is required**. The project-local block is only needed for advanced cases (e.g., different bank per project, or hindsight without the plugin). This was a smoke-test finding from PR #118 (fpl-skills 1.35.1).

```bash
# Probe four signals: plugin enablement, .mcp.json hindsight block, env vars (both naming conventions)
HSMEM_ENABLED="no"; echo "$ENABLED_LIST" | grep -q '^fpl-hsmem@' && HSMEM_ENABLED="yes"

MCPJSON_HINDSIGHT=$(python3 - <<'PY' 2>/dev/null
import json, pathlib
p = pathlib.Path(".mcp.json")
d = json.loads(p.read_text()) if p.exists() else {}
hs = d.get("mcpServers", {}).get("hindsight")
if not hs: print("MISSING")
elif not hs.get("env", {}).get("HINDSIGHT_API_KEY"): print("BLOCK-BUT-NO-KEY")
else: print("WIRED")
PY
)

# Env var probe — both canonical (plugin reads HINDSIGHT_URL/HINDSIGHT_API_KEY) and
# alternate (some users have HINDSIGHT_API_URL/HINDSIGHT_API_TOKEN from earlier setups)
ENV_CANON="no"; [[ -n "${HINDSIGHT_URL:-}" && -n "${HINDSIGHT_API_KEY:-}" ]] && ENV_CANON="yes"
ENV_ALT="no";   [[ -n "${HINDSIGHT_API_URL:-}" && -n "${HINDSIGHT_API_TOKEN:-}" ]] && ENV_ALT="yes"
```

Classify into one of **six** states (order matters — earlier rows take precedence):

| # | State | `HSMEM_ENABLED` | `.mcp.json` hindsight | Env vars | Action |
|---|---|---|---|---|---|
| 1 | **Fully wired (project-local)** | yes | WIRED | any | `✓ Step 0c: Hindsight fully wired via project-local .mcp.json block (plugin enabled too — block overrides)` |
| 2 | **Plugin handles it** (NEW — smoke finding) | yes | MISSING | any | `✓ Step 0c: Hindsight available via fpl-hsmem plugin-level registration (no project-local block needed). Plugin reads HINDSIGHT_URL/HINDSIGHT_API_KEY from env.` Healthy state; continue. |
| 3 | **Plugin enabled, project-local block has no key** | yes | BLOCK-BUT-NO-KEY | env canon | Print: "project has `.mcp.json` hindsight block without `HINDSIGHT_API_KEY`. Either remove the project-local block (plugin-level registration will pick up the env-var key automatically — preferred), or add the key under the `env` block. **Do not commit `.mcp.json` if it contains the key inline.**" |
| 4 | **Env-var naming mismatch** | yes/no | any | env alt only (no canon) | Print: "your shell env has `HINDSIGHT_API_URL`/`HINDSIGHT_API_TOKEN`, but `fpl-hsmem` plugin reads `HINDSIGHT_URL`/`HINDSIGHT_API_KEY`. Pick one of: (a) rename them in `~/.zshrc` / `~/.bashrc`, (b) set both pairs, (c) write the explicit env block under `.mcp.json` `mcpServers.hindsight.env` with proper names." |
| 5 | **Plugin not enabled, creds exist** | no | any | env canon or alt | Print: "Hindsight credentials detected in env. Run `/plugin install fpl-hsmem@ForgePlan-marketplace` to enable the plugin, then re-invoke `/smith-bootstrap` (Step 0c will pick the wired state up)." |
| 6 | **No plugin, no creds — Docker quick-start** | no | MISSING | neither | Print: "Hindsight is SHOULD, not MUST. Quick path: `docker run -d --name hindsight -p 8888:8888 ghcr.io/vectorize-io/hindsight:latest` then `/plugin install fpl-hsmem@ForgePlan-marketplace`. Skip and continue without Hindsight if you want — Step 5 (Brief) does not depend on it." |

Reference implementation:

```bash
if [ "$HSMEM_ENABLED" = "yes" ] && [ "$MCPJSON_HINDSIGHT" = "WIRED" ]; then
    STATE="fully-wired"
elif [ "$HSMEM_ENABLED" = "yes" ] && [ "$MCPJSON_HINDSIGHT" = "MISSING" ]; then
    STATE="plugin-handles-it"   # NEW — covers the normal case
elif [ "$HSMEM_ENABLED" = "yes" ] && [ "$MCPJSON_HINDSIGHT" = "BLOCK-BUT-NO-KEY" ]; then
    STATE="block-no-key"
elif [ "$ENV_ALT" = "yes" ] && [ "$ENV_CANON" = "no" ]; then
    STATE="env-var-mismatch"
elif [ "$HSMEM_ENABLED" = "no" ] && { [ "$ENV_CANON" = "yes" ] || [ "$ENV_ALT" = "yes" ]; }; then
    STATE="plugin-not-enabled"
elif [ "$HSMEM_ENABLED" = "no" ] && [ "$MCPJSON_HINDSIGHT" = "MISSING" ] && [ "$ENV_CANON" = "no" ] && [ "$ENV_ALT" = "no" ]; then
    STATE="docker-quickstart"
else
    STATE="unclassified"  # should never happen with 6-state matrix; report probe values to user
fi
```

`/smith-bootstrap` itself never modifies `.mcp.json` Hindsight env values, never writes secrets, never auto-enables plugins. All Hindsight state changes are user actions guided by this step's print.

### Step 0d — `.claude/hooks/` baseline check (additive, opt-in)

A canonical safety bundle ships with this plugin at `plugins/fpl-skills/templates/hooks/`. As of fpl-skills 1.35 it contains three project-local hooks:

| Hook | Trigger | Purpose |
|---|---|---|
| `safety-hook.sh` | `PreToolUse:Bash` | Blocks destructive git/rm patterns (`git push --force`, `rm -rf /`, `git push origin main`, etc.). The minimal safety baseline; every project should have it. |
| `pre-pr-evidence-check.sh` | `PreToolUse:Bash` (gates `gh pr create`) | Forgeplan-aware: scans branch name + last 20 commit messages for artifact IDs (PRD/RFC/ADR/EPIC/...), then verifies each referenced artifact has linked EVID. Blocks PR creation if evidence is missing. Bypass via `FORGEPLAN_SKIP_EVIDENCE=1` env var or branch patterns (`docs/*`, `hotfix/*`, `release/v*`). |
| `forge-safety-hook.sh` | `PreToolUse:Bash` | Forgeplan operations safety: blocks destructive forgeplan commands (`forgeplan delete`, `forgeplan reset`) without explicit `--yes`. Delegates to `dev-toolkit` safety hook when both plugins are installed. |

If the project's `.claude/hooks/` is empty or absent, offer to copy the bundle:

```bash
TEMPLATES="${CLAUDE_PLUGIN_ROOT}/templates/hooks"
PROJECT_HOOKS=".claude/hooks"

if [ ! -d "$TEMPLATES" ]; then
    echo "[~] Step 0d: hooks templates not shipped in this fpl-skills version — skipping."
elif [ -d "$PROJECT_HOOKS" ] && [ -n "$(ls -A "$PROJECT_HOOKS" 2>/dev/null)" ]; then
    echo "✓ Step 0d: .claude/hooks/ already populated — leaving user's hooks untouched."
else
    echo "[?] Step 0d: .claude/hooks/ is empty. Install canonical safety bundle (3 hooks)?"
    echo "    • safety-hook.sh            — PreToolUse:Bash blocker for destructive git/rm commands"
    echo "    • pre-pr-evidence-check.sh  — PreToolUse:Bash gate before gh pr create, requires linked EVID"
    echo "    • forge-safety-hook.sh      — PreToolUse:Bash gate for destructive forgeplan operations"
    echo "Install? [y/n]"
    # On `y`: mkdir -p .claude/hooks && cp -i "$TEMPLATES"/*.sh .claude/hooks/ && chmod +x .claude/hooks/*.sh
    #         then either create .claude/settings.json with three PreToolUse:Bash matcher entries
    #         (one per hook), or merge into existing (Python merge, preserving any user hooks already
    #         configured). All three hooks are PreToolUse:Bash; chain them by listing all three in the
    #         hooks[] array under the Bash matcher.
    # On `n`: skip silently — bootstrap continues, hooks are defense-in-depth not load-bearing
fi
```

Acceptance for Step 0d: either user said no, or templates absent, or hooks copied + executable + `.claude/settings.json` merged.

### Step 0e — Reload + verify

Plugin-level changes (Step 0a guidance, Step 0c plugin install if user did it) require `/reload-plugins`. MCP server changes (Step 0b) require Claude Code to re-read `.mcp.json` (also via `/reload-plugins`).

Print to the user:

```
Step 0e: please run /reload-plugins now, then continue.

After reload, this skill verifies via ToolSearch:
  • mcp__forgeplan__forgeplan_*           — Should appear (Step 0b wired forgeplan MCP)
  • mcp__plugin_fpl-hsmem_hindsight__*    — Should appear if Hindsight is wired (Step 0c)
```

After reload, the skill verifies using ToolSearch queries — `select:mcp__forgeplan__forgeplan_health` and `select:mcp__plugin_fpl-hsmem_hindsight__memory_status`. If neither tool surface is reachable post-reload, halt with a diagnostic dump (`.mcp.json` contents + plugin enablement list). Otherwise:

```
✓ Step 0e: MCP layer verified. forgeplan tools: 47 available. Hindsight tools: 13 available (or "Hindsight skipped per Step 0c").
```

Acceptance for Step 0 overall: every sub-step printed a `✓` or `[~]` line (warning-but-continue), no `✗` halt occurred.

---

## Pre-flight detection

Before doing anything else, verify the repo is genuinely greenfield. Run the following Bash checks and record each result as PRESENT / ABSENT / NEEDS-UPGRADE:

```bash
# 1. Git status — is this a repo? does it have commits?
git status                                          # → "no commits yet" OR clean tree
git log --oneline 2>/dev/null | head -5             # → empty or 0-3 commits

# 2. Top-level scaffolds — which exist?
ls CLAUDE.md AGENTS.md .mcp.json 2>/dev/null        # → list of present files (empty = good)

# 3. Forgeplan initialised?
find .forgeplan -type f 2>/dev/null | head -5       # → empty = fresh; populated = brownfield
test -d .forgeplan && echo "PRESENT" || echo "ABSENT"

# 4. Existing plugin config?
cat .claude/settings.json 2>/dev/null               # → empty/absent = greenfield
ls .claude/plugins 2>/dev/null                      # → empty = greenfield

# 5. Stack signals — do not overwrite if these exist
ls package.json pyproject.toml go.mod Cargo.toml composer.json 2>/dev/null
```

**Pre-flight matrix** (fill from the checks above):

| Item | Expected for greenfield | Status |
|---|---|---|
| Git initialised | yes (empty or ≤3 commits) | PRESENT / ABSENT |
| `CLAUDE.md` at root | absent | ABSENT / PRESENT |
| `AGENTS.md` at root | absent | ABSENT / PRESENT |
| `.mcp.json` at root | absent | ABSENT / PRESENT |
| `.forgeplan/` directory | absent | ABSENT / PRESENT |
| `.claude/settings.json` plugin config | absent | ABSENT / PRESENT |
| Stack manifest | absent OR minimal | ABSENT / PRESENT (capture stack) |

**Decision rule**: if ≥3 items show PRESENT, **STOP** — this is not greenfield. Recommend `forgeplan-brownfield-pack:discover` and exit. Stack manifest PRESENT but other scaffolds ABSENT is still greenfield — capture the stack value and continue.

---

## Step 1 — forgeplan init

**Pre-condition**: Step 0 Gate B already verified `.mcp.json` exists with the `forgeplan` block. If it didn't, you halted earlier — you should not be here.

If `.forgeplan/` is absent (pre-flight detection said ABSENT), run the exact command (non-interactive):

```bash
cd <repo path>
forgeplan init -y
forgeplan health
```

If `.forgeplan/` already exists (because the user ran `/fpl-init` first and it covered both `.mcp.json` AND `forgeplan init`) — skip the init call and just verify health.

Expected result:
- `.forgeplan/` directory present with `state/`, `notes/`, `decisions/` sub-dirs.
- `forgeplan health` returns "healthy" with zero artifacts.
- Project bank ID generated (visible in `.forgeplan/config.yaml`).

If `forgeplan init` fails — see Failure modes below.

Acceptance for Step 1: `forgeplan health` exit code 0; `forgeplan list` shows 0 artifacts.

---

## Step 2 — AGENTS.md scaffold

Write `AGENTS.md` at repo root. AGENTS.md is the **cross-CLI standard** adopted by the Linux Foundation in December 2025 (source: https://agents.md). It acts as a context shim so Claude Code, Gemini CLI, Codex CLI, Goose, and other MCP-aware clients all read the same project context.

**Minimum required sections** for greenfield AGENTS.md:

```markdown
# Agents Manifest — <project name>

Cross-CLI context shim. Source of truth: `CLAUDE.md`.

## Project mission
<one to two sentences describing what this project does and why>

## Stack
- Language: <e.g., TypeScript / Python / Go / Rust>
- Framework: <e.g., Next.js / FastAPI / Gin / Axum>
- Runtime: <e.g., Node.js 22 / Python 3.12 / Go 1.23>

## Build / test / lint commands
- Build: `<command>` (TBD until first stack lands)
- Test: `<command>` (TBD)
- Lint: `<command>` (TBD)

## Smith pointer
This project uses **smith** as master orchestrator. For any non-trivial task, invoke:

- `/smith` — default routing entry (figures out depth automatically)
- `plugins/agents-pro/agents/smith.md` — agent definition

Smith reads CLAUDE.md, picks the right depth (tactical / standard / deep / critical), then dispatches the canonical pipeline (FPF → BMAD → OpenSpec → Forgeplan).

## MCP servers
- `forgeplan` — project artifacts (PRD/RFC/ADR/Evidence)
- `hindsight` — cross-session memory (installed when `fpl-hsmem` plugin added)

## Conventions
See `CLAUDE.md` for full project conventions, commit format, branch protection, and security rules.
```

Verify:
- File written at repo root, ≥30 lines.
- All five sections present (mission, stack, build/test/lint, smith pointer, MCP servers, conventions reference).
- Smith pointer paragraph cites `/smith` and `plugins/agents-pro/agents/smith.md`.

---

## Step 3 — CLAUDE.md scaffold

Write a minimal `CLAUDE.md` at repo root. This is the **primary source of truth** for the project; AGENTS.md points back here. Pull the methodology declaration from `routing-map.md` (Wave 1B output, sibling file in this plugin).

**Minimum required sections** for greenfield CLAUDE.md:

```markdown
# <Project Name> — Claude Code Configuration

**Purpose**: <one-sentence purpose from the user>
**Stack**: <captured from pre-flight or Step 2>
**Status**: Greenfield bootstrap — <YYYY-MM-DD>

## Methodology

This project uses the ForgePlan canonical pipeline:
- **FPF** (First Principles Framework) — design via ADI hypotheses
- **BMAD** (adversarial review) — quality gate via Profile B reviewer
- **OpenSpec** — DAG structure with delta-spec at supersede
- **Forgeplan** — automation layer (PRD/RFC/ADR/Evidence artifacts)

For any Standard+ task → route through `/smith` (master orchestrator).

## Communication style

- Language: <Russian / English / mixed — capture from user preference>
- Conclusion first, justification second
- Short concrete phrases — no jargon walls

## Hard rules

- Commits: conventional-commit prefixes (`feat`, `fix`, `docs`, `chore`, `audit`)
- Branches: `feat/*`, `fix/*`, `docs/*`, `chore/*`
- PRs required for `main` (configure branch protection after first push)
- Never `git push --force`
- Never `git add .` or `git add -A` — stage specific files only
- Never skip hooks (`--no-verify`)

## Forgeplan

```bash
forgeplan health                       # current state
forgeplan list                         # all artifacts
forgeplan new prd "title"              # new PRD
forgeplan activate PRD-NNN             # after evidence linked
```

## Smith orchestrator

For any task: `/smith <description>` — figures out depth, dispatches the canonical pipeline.

See `AGENTS.md` for cross-CLI context.
```

Verify:
- File written at repo root, ≥40 lines.
- First line is the `# <Project Name> — Claude Code Configuration` heading.
- Methodology section names the 4-layer pipeline (FPF/BMAD/OpenSpec/Forgeplan).
- Hard rules section has ≥5 bullets.
- Smith pointer section names `/smith`.

---

## Step 4 — Plugin install recommendations

Install plugins in three priority tiers. Show the user the table, install MUST automatically (with one confirm), prompt for SHOULD, ask explicitly for OPTIONAL.

| Priority | Plugin | Why |
|---|---|---|
| MUST | `fpl-skills` | Core skills incl. `/smith`, `/forge-cycle`, `/decay-watch`, `/methodology-check`, `/decision`, `/supersede`, `/c4-diagram` |
| MUST | `forgeplan-workflow` | `/forge-cycle` reactive enforcer + `/forge-audit` + guardian agent (gate enforcement) |
| MUST | `agents-pro` | `smith` (master orchestrator) + `adr-architect` + `guardian` + `brief-intake` + `architect-reviewer` + `security-expert` + 20+ other Profile A/B agents |
| MUST | `agents-sparc` | `specification` + `architecture` + `pseudocode` + `refinement` + `sparc-orchestrator` (Profile A SPARC phase agents — smith dispatches `agents-sparc:specification` for the first PRD) |
| MUST | `agents-core` | `coder`, `code-reviewer`, `tester` (canonical Profile C-coder / Profile B agents) |
| SHOULD | `fpf` | First Principles Framework ADI reasoning — **mandatory at Standard+** per Sprint Z7 (CLAUDE.md FPF ADI discipline) |
| SHOULD | `fpl-hsmem` | Hindsight v2 memory plugin — cross-session memory per-project bank (recommended for projects >1 week) |
| OPTIONAL | `laws-of-ux` | UX code review — install if project has a frontend |
| OPTIONAL | `forgeplan-brownfield-pack` | Discover agent — only needed if you later import legacy code |

**Install commands**:

```bash
# In a Claude Code session:
/plugin marketplace add ForgePlan/marketplace          # one-time, if marketplace not yet added
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install forgeplan-workflow@ForgePlan-marketplace
/plugin install agents-pro@ForgePlan-marketplace
/plugin install agents-sparc@ForgePlan-marketplace     # MUST — Step 6 dispatches agents-sparc:specification
/plugin install agents-core@ForgePlan-marketplace
/plugin install fpf@ForgePlan-marketplace              # SHOULD
/plugin install fpl-hsmem@ForgePlan-marketplace        # SHOULD
```

Verify after install:

```bash
/plugin list                                            # all 4 MUST + chosen SHOULD enabled
```

Acceptance: ≥4 MUST plugins enabled. SHOULD plugins enabled if user confirmed. OPTIONAL plugins NEVER installed by default.

---

## Step 5 — First Brief

Dispatch `agents-pro:brief-intake` (Profile A) to capture the project idea into a structured Brief NOTE artifact.

```text
Task(subagent_type="agents-pro:brief-intake",
     prompt="Capture the project idea for <project name>.
             Stack: <stack from CLAUDE.md>.
             Goal: <one-line goal from user>.
             Constraints: <known constraints or 'none yet'>.
             Output: Brief NOTE artifact in forgeplan, draft status.")
```

The agent asks clarifying questions, synthesizes the responses, and creates a Brief NOTE via `forgeplan_new(kind="note")`. If the user is unclear about the mission — that is expected; the agent's job is to extract it. Do not skip this step even if the user "just wants to start coding".

Verify:
- `forgeplan list --type note` shows ≥1 new artifact (note: the CLI flag is `--type` / `-t`, not `--kind` — that name only exists in the MCP `forgeplan_new(kind=...)` form).
- Brief body has ≥4 sections: problem statement, target users, success criteria, non-goals.
- Brief is in `draft` status (activates after first PRD links to it).

---

## Step 6 — First PRD

Dispatch `agents-sparc:specification` (Profile A) to convert the Brief into a Standard-depth PRD.

```text
Task(subagent_type="agents-sparc:specification",
     prompt="Read Brief NOTE-NNN (from Step 5).
             Produce PRD with FR / NFR / AC (SMART) / out-of-scope.
             Depth: Standard.
             Link to BRIEF via `informs` relation.
             Output: PRD artifact in forgeplan, draft status.")
```

**Important — FPF ADI is mandatory at Standard+** (Sprint Z7, CLAUDE.md FPF ADI discipline):

> Every Standard+ artifact MUST have FPF ADI cycle completed before activation. ADI = ≥3 hypotheses with explicit deductive predictions and inductive evidence checks.

The specification agent will draft the PRD but **will not activate it**. Activation requires:
1. ADI EVID linked (`forgeplan_reason PRD-NNN` to generate, then `forgeplan_new(kind="evidence")` to capture).
2. Profile B reviewer EVID linked (Sprint Z6 BMAD discipline — `## Findings` ≥1 item).
3. `/methodology-check PRD-NNN` returns ≥75% coverage.
4. `forgeplan_activate PRD-NNN` succeeds.

Bootstrap completes once the PRD draft exists. Activation is the next session's `/forge-cycle` job.

**Required section names** — the dispatched `agents-sparc:specification` must use these literal Markdown section headers, because `forgeplan validate` MUST-checks them by name (caught during E2E smoke against forgeplan 0.32.1):

| Section | Why required |
|---|---|
| `## Problem statement` | The "what" the PRD addresses (≥50 words body to avoid `prd-problem-density` SHOULD warning). |
| `## Target audience` (or `## Target users`) | Who the PRD serves. Absence triggers `prd-target-audience` MUST violation for Standard+ depth. |
| `## Goals` (or `## Success Criteria`) | Outcomes the PRD aims at. Absence triggers `prd-goals-exist` MUST violation. SMART goals here also reduce `prd-orphan-goals` warnings when each goal traces to an FR. |
| `## Functional Requirements` | Literal capitalisation matters. Lower-case `## Functional requirements` or expanded `## Functional requirements (FR)` will fail `prd-fr-exist`. |
| `## Out of scope` | Non-goals; what the PRD explicitly does NOT address. |
| `## Related Artifacts` | Cross-links section. Absence triggers `prd-related` MUST violation. Use this rather than inline mentions for the `informs ← BRIEF` reference. |

NFR and Acceptance Criteria sections are useful but not validator-required; SHOULD-level rules cover orphan FRs/Goals (good practice: ensure each FR is referenced by at least one AC, and each Goal is supported by ≥1 FR).

Verify:
- `forgeplan list --type prd` shows ≥1 new artifact (the CLI flag is `--type` / `-t`, not `--kind`).
- `forgeplan validate PRD-NNN` → `Result: PASS` (warnings tolerable, but zero MUST errors).
- PRD links to BRIEF via `informs` relation (`forgeplan_get PRD-NNN` shows the link).
- PRD is in `draft` status (NOT activated yet — `/forge-cycle` activates after ADI + BMAD EVID land).

---

## Acceptance criteria

Bootstrap is complete when ALL the following hold:

- [ ] Step 0a passed (5 MUST plugins enabled — fpl-skills, agents-pro, agents-sparc, agents-core, forgeplan-workflow)
- [ ] Step 0b succeeded (`.mcp.json` has `mcpServers.forgeplan` with `args: ["serve"]` — either pre-existed or wired by `forgeplan mcp install`)
- [ ] Step 0c reached a defined state (fully wired / waiting on user action / Hindsight skipped — but not silently broken)
- [ ] Step 0d either copied the hooks bundle or user declined
- [ ] Step 0e verification via ToolSearch confirms `mcp__forgeplan__*` reachable
- [ ] `forgeplan health` returns "healthy" (exit 0)
- [ ] `CLAUDE.md` present at repo root, ≥40 lines, first line is `# <Project Name> — Claude Code Configuration`
- [ ] `AGENTS.md` present at repo root, ≥30 lines, contains smith pointer + MCP servers section
- [ ] `.mcp.json` present at repo root with at least the `forgeplan` MCP server registered (already verified at Step 0b)
- [ ] At least one Brief NOTE artifact in forgeplan (`forgeplan list --type note` shows ≥1)
- [ ] At least one PRD in draft (`forgeplan list --type prd --status draft` shows ≥1); `forgeplan validate PRD-NNN` returns `Result: PASS`
- [ ] PRD links to BRIEF via `informs` relation

Save a copy of the filled `smith-bootstrap.md` template to `.forgeplan/notes/bootstrap-<YYYY-MM-DD>.md` for traceability.

---

## Hand-off

When all acceptance criteria are `[x]`, hand off to the user with this exact message:

> Bootstrap complete. Your project is ready for the canonical pipeline.
>
> Next step: run `/smith` (default mode) — it will pick up the draft PRD and route it through `/forge-cycle` (FPF → BMAD → OpenSpec → activate).
>
> Or, if you want to inspect first: `/methodology-check PRD-NNN` to see which of the 4 pipeline layers still need work before activation.

Do NOT auto-dispatch `/smith` or `/forge-cycle` from inside this skill. Bootstrap is a one-shot — the user re-engages explicitly.

---

## Hard rules

1. **Never overwrite existing CLAUDE.md / AGENTS.md / .mcp.json.** If a file is PRESENT in pre-flight, do not write to it. Surface the diff vs the minimal scaffold and ask the user whether to merge or skip. Default action when in doubt: skip and keep the existing file.
2. **Never run `forgeplan init` without confirming the project is truly greenfield.** If pre-flight shows ≥3 PRESENT items, exit with a brownfield recommendation. `forgeplan init` on a populated `.forgeplan/` will refuse, but the safer path is to never reach that error.
3. **Never install all plugins by default.** Install MUST tier automatically (with one user confirm). SHOULD tier requires explicit user yes. OPTIONAL tier requires explicit user yes per plugin. Bulk-installing OPTIONAL plugins wastes the user's plugin slot budget and pollutes the session.
4. **Bootstrap is a one-time operation.** If the user re-invokes `/smith-bootstrap` on a project that already has `.forgeplan/` populated + `CLAUDE.md` present — exit with: "This project is already bootstrapped. Use `/smith` (default mode) for next-step routing." Do not re-run init.
5. **Never activate the first PRD inside the bootstrap skill.** The specification agent produces a draft. Activation requires ADI EVID + BMAD EVID + methodology-check — that is `/forge-cycle`'s job, not bootstrap's.

---

## Failure modes

| Failure | Recovery |
|---|---|
| Step 0a halt (MUST plugins missing) | Print the install block, exit cleanly without writing files. User runs the `/plugin install` commands, then re-invokes `/smith-bootstrap`. Do not silent-fallback to non-MUST agents. |
| Step 0b halt (`forgeplan` CLI not on PATH) | Print the install instructions (brew / cargo), exit cleanly. After CLI install, user re-invokes `/smith-bootstrap`. Do not attempt a Python merge fallback — `forgeplan mcp install` is the canonical path. |
| Step 0b fail (`forgeplan mcp install` non-zero exit) | Surface the stderr verbatim. Common causes: file permissions, malformed pre-existing `.mcp.json`. If `.mcp.json` is unparseable, recommend backup + re-init: `mv .mcp.json .mcp.json.bak && forgeplan mcp install --client claude --scope project`. |
| Step 0c env-var mismatch case | Print the rename / dual-set / `.mcp.json` env-block guidance. Do not modify shell rc files automatically. Continue to Step 0d if user wants to skip Hindsight; Hindsight is SHOULD, not MUST. |
| Step 0d hooks templates absent | Older fpl-skills (<1.34) doesn't ship hooks templates. Print one-line warning and continue. Do not block bootstrap. |
| Step 0e ToolSearch verify fails post-reload | Halt with diagnostic dump: cat `.mcp.json`, list `enabledPlugins` from `~/.claude/settings.json`, last 10 lines of any forgeplan log. Most common cause: user forgot to actually run `/reload-plugins`. |
| `forgeplan init` fails with "command not found" | Should be caught at Step 0b. If reached here anyway, instruct user to install forgeplan CLI first (per forgeplan README). Do not proceed without it. |
| `forgeplan init` fails with "already initialised" | Pre-flight missed something. Re-run pre-flight detection. If `.forgeplan/` is in fact present, exit and recommend `/smith` default mode. |
| User has partial scaffold (e.g., CLAUDE.md exists but AGENTS.md does not) | Diff the existing file vs the minimal scaffold from Step 2/3. Surface the diff. Ask the user: extend existing, replace, or skip. Never silently overwrite. |
| User is unclear about project mission ("just want to start coding") | Run `brief-intake` (Step 5) anyway. The agent's questions WILL extract the mission. Do not skip to Step 6 without a Brief — specification agent has nothing to convert from. |
| `brief-intake` produces a Brief but mission is still vague | Re-dispatch with a sharper prompt citing specific examples. If second attempt also fails, mark Brief as `draft` and ask the user to refine manually before Step 6. |
| `/plugin install` fails (network, marketplace not added, version conflict) | Run `/plugin marketplace add ForgePlan/marketplace` first. Then retry install. If still failing, surface the exact error to the user. Do not proceed past Step 4 without ≥4 MUST plugins. |

---

## References

- **Template (output)**: `plugins/fpl-skills/templates/smith-bootstrap.md` — the checklist this skill fills (175 lines, Wave 1C output).
- **Routing map**: `plugins/fpl-skills/skills/smith/routing-map.md` — greenfield row #1 (Wave 1B output).
- **RAG content**: `plugins/fpl-skills/skills/smith/sections/01-greenfield.md` — extended greenfield onboarding context.
- **Smith agent**: `plugins/agents-pro/agents/smith.md` — sibling Profile B-orchestrator agent (Wave 1A output).
- **Smith default skill**: `plugins/fpl-skills/skills/smith/SKILL.md` — main entry (Wave 2-B1 sibling).
- **AGENTS.md standard**: https://agents.md — Linux Foundation, December 2025.
- **Forgeplan init docs**: `forgeplan init --help` (CLI) or forgeplan README.
- **FPF ADI discipline**: CLAUDE.md `## FPF ADI discipline (Sprint Z7 — PRD-059)` — why Standard+ PRDs need ≥3 hypotheses before activation.
- **BMAD adversarial review**: CLAUDE.md `## BMAD adversarial review discipline (Sprint Z6 — PRD-057)` — why every Standard+ artifact needs a Profile B reviewer EVID.
- **Sibling skills**: `/smith` (Wave 2-B1), `/smith-plan` (Wave 2-B3), `/smith-routing` (Wave 2-B4).

---

## Anti-patterns

- Skipping pre-flight because "the user said it's greenfield". User's word is a signal, not verification.
- Auto-installing OPTIONAL plugins ("might as well add laws-of-ux"). Pollutes the session, dilutes context budget.
- Activating the first PRD inside bootstrap. Activation belongs to `/forge-cycle`. Bootstrap ends at a draft PRD.
- Overwriting an existing CLAUDE.md without diff/confirm. The user may have hand-written it.
- Running `forgeplan init` then immediately dispatching coder agents. Pipeline is sequenced: Brief → PRD → RFC/ADR → code.
