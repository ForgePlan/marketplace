[English](USAGE-GUIDE.md) | [Русский](USAGE-GUIDE-RU.md)

# ForgePlan Marketplace — Usage Guide

## Installation

### Step 1: Add the marketplace (once per machine)

```
/plugin marketplace add ForgePlan/marketplace
```

### Step 2: Install plugins you need

```bash
# Universal tools (any project)
/plugin install dev-toolkit@ForgePlan-marketplace    # /audit, /sprint, /recall
/plugin install fpf@ForgePlan-marketplace             # /fpf (reasoning framework)

# Frontend
/plugin install laws-of-ux@ForgePlan-marketplace      # /ux-review, /ux-law

# Forgeplan users
/plugin install forgeplan-workflow@ForgePlan-marketplace  # /forge-cycle, /forge-audit
/plugin install forgeplan-orchestra@ForgePlan-marketplace  # /sync, /session
```

```
/reload-plugins
```

### Updating

```
/plugin marketplace update ForgePlan-marketplace
/plugin install <plugin-name>@ForgePlan-marketplace   # reinstall each plugin
/reload-plugins
```

---

## Quick Reference

| Command | Plugin | What it does |
|---------|--------|-------------|
| `/recall` | dev-toolkit | Restore session context (git + CLAUDE.md + memory) |
| `/sprint <task>` | dev-toolkit | Adaptive sprint: Tactical→Standard→Deep |
| `/audit` | dev-toolkit | Multi-expert code review (4 parallel agents) |
| `/fpf <question>` | fpf | Structured reasoning: decompose, evaluate, reason, lookup |
| `/ux-review` | laws-of-ux | UX audit against 30 Laws of UX |
| `/ux-law <name>` | laws-of-ux | Look up a specific UX law |
| `/forge-cycle` | forgeplan-workflow | Full dev cycle (route→shape→build→evidence→activate) |
| `/forge-audit` | forgeplan-workflow | Multi-expert audit (6 agents) |
| `/sync` | forgeplan-orchestra | Bidirectional sync Forgeplan ↔ Orchestra |
| `/session` | forgeplan-orchestra | Session Start Protocol with Inbox Pattern |

---

## Daily Workflow

### Morning — restore context

```
/recall
```

Shows: current branch, uncommitted changes, recent commits, project health.

### Before a task — think first

```
/fpf decompose our payment system     # break into parts
/fpf evaluate Redis vs Memcached      # compare options
/fpf reason why tests are flaky       # structured debugging
```

### Implementation — adaptive sprint

```
/sprint add user authentication
```

The sprint auto-detects scale:

| Scale | What happens |
|-------|-------------|
| **Tactical** (typo, config) | 1 agent, quick waves, run tests |
| **Standard** (feature, 1-3 days) | ADI checkpoint, 2 agents, lint + types + test |
| **Deep** (module, architecture) | Mandatory ADI, 3-4 agents, full pipeline + release |

### After coding — verify

```
/audit
```

4 agents check in parallel: logic, architecture, security, tests. Reports findings as CRITICAL/HIGH/MEDIUM/LOW with file:line references.

### Frontend — UX check

```
/ux-review                    # scan all frontend files
/ux-law fitts                 # look up Fitts's Law (44px targets)
/ux-law hick                  # look up Hick's Law (7 nav items max)
```

---

## What to Add to CLAUDE.md

Add this block to your project's CLAUDE.md:

```markdown
## Commands

| Command | When to use |
|---------|-------------|
| `/recall` | Start of session — restore context |
| `/sprint <task>` | Implement a feature (auto-scales) |
| `/audit` | After writing code — multi-expert review |
| `/fpf <question>` | Architecture decisions, comparisons, debugging |
| `/ux-review` | After frontend work — UX law compliance |
```

If using Forgeplan:

```markdown
## Forgeplan Workflow

- `forgeplan route "task"` before coding → determine depth
- `/forge-cycle` → full cycle (health→route→shape→build→evidence→activate)
- `/sync` → sync Forgeplan artifacts ↔ Orchestra tasks
- `/session` → Session Start Protocol with Inbox triage
```

---

## Plugin Details

### dev-toolkit — Universal Engineering Tools

**No dependencies.** Works with any project and language.

- `/audit` — Launches 4 reviewers: Logic, Architecture, Security, Tests
- `/sprint` — Breaks tasks into waves, adapts by complexity
- `/recall` — Reads CLAUDE.md, git status, memory (Hindsight/mem0 if available)
- Safety hook blocks: `git push --force`, `git reset --hard`, `rm -rf /`
- Test reminder on new public functions

### fpf — First Principles Framework

**No dependencies.** Based on FPF by Anatoly Levenchuk.

- `/fpf` — Universal router (decompose/evaluate/reason/lookup)
- `/fpf decompose <system>` — Bounded contexts, roles, interfaces
- `/fpf evaluate <A vs B>` — F-G-R scoring, ADI reasoning cycle
- `/fpf reason <problem>` — 3+ hypotheses → test → conclude
- 224 FPF specification sections + 4 applied pattern guides

### laws-of-ux — Frontend UX Review

**No dependencies.** Based on lawsofux.com by Jon Yablonski.

- `/ux-review` — Scans HTML/CSS/JS/React/Vue against 30 UX laws
- `/ux-law <name>` — Look up any law with frontend implications
- 30 laws in 4 categories: Heuristics, Cognitive, Gestalt, Principles
- 9 code pattern files with VIOLATION/CORRECT examples
- Auto-hint hook on frontend file edits

### forgeplan-workflow — Structured Dev Cycle

**Requires:** forgeplan CLI (private app, access via project admin).

- `/forge-cycle` — 8-step pipeline: health→route→shape→build→test→evidence→activate→commit
- `/forge-audit` — 6 parallel reviewers with structured report
- Methodology KB: workflow, artifacts, depth calibration, R_eff scoring, quality gates
- Safety hook + PRD check before code edits

### forgeplan-orchestra — Unified Workflow

**Requires:** forgeplan CLI + Orchestra MCP server.

- `/sync` — Bidirectional diff: Forgeplan artifacts ↔ Orchestra tasks
- `/session` — Session Start Protocol: context→inbox→health→triage→synthesis
- Unified Workflow KB: architecture, setup, fields, playbook, configs
- Status↔Phase mapping: Backlog=Shape, To Do=Validate, Doing=Code, Review=Evidence, Done=Done

---

## Hook Behavior

When you install multiple plugins, their hooks stack — each fires independently.

### What fires when

| Event | Plugins | Hook | What it does |
|-------|---------|------|-------------|
| `PreToolUse:Bash` | dev-toolkit | safety-hook.sh | Blocks dangerous commands (force push, rm -rf /, DROP TABLE) |
| `PreToolUse:Bash` | forgeplan-workflow | forge-safety-hook.sh | Delegates to dev-toolkit if installed, otherwise runs own checks |
| `PreToolUse:Write` | forgeplan-workflow | pre-code-check.sh | Warns if no active PRD (cached, 5-min TTL) |
| `PostToolUse:Write\|Edit` | dev-toolkit | test-hint.sh | Suggests tests when new public functions are added |
| `PostToolUse:Write\|Edit` | laws-of-ux | ux-hint.sh | Suggests UX review when frontend files are modified |
| `PostToolUse:Bash` | forgeplan-orchestra | forge-sync-hint.sh | Suggests Orchestra sync after forgeplan activate/new |

### If both dev-toolkit and forgeplan-workflow are installed

Both have safety hooks on `PreToolUse:Bash`. The dev-toolkit hook runs first. The forgeplan-workflow hook detects dev-toolkit is installed and skips (exit 0) to avoid double-checking.

### Disabling a hook temporarily

Hooks cannot be disabled per-session. To disable a plugin's hooks, uninstall the plugin:
```
/plugin uninstall <plugin-name>@ForgePlan-marketplace
```

---

## Recommended Stacks

| Stack | Plugins | Best for |
|-------|---------|----------|
| **Minimal** | dev-toolkit | Any project, zero dependencies |
| **Frontend** | dev-toolkit + laws-of-ux | Frontend/UI development |
| **FPF Thinker** | dev-toolkit + fpf | Architecture, decisions, reasoning |
| **Forgeplan User** | forgeplan-workflow + fpf | Forgeplan CLI users |
| **Full Stack** | all 5 plugins | ForgePlan power users with Orchestra |

---

## Dependency Requirements

| Plugin | Required | Optional |
|--------|----------|----------|
| laws-of-ux | None | — |
| dev-toolkit | None | Hindsight MCP (for /recall memory), forgeplan CLI (for /sprint scale detection) |
| fpf | None | forgeplan CLI (for artifact suggestions) |
| forgeplan-workflow | forgeplan CLI | dev-toolkit (shared safety hooks) |
| forgeplan-orchestra | forgeplan CLI + Orchestra MCP | Hindsight MCP (for /session memory recall) |

---

## Troubleshooting

### Plugins not loading after install

```
/reload-plugins
/doctor          # check for errors
```

### Hooks are noisy (showing messages on every edit)

Update to v1.1.1+: hooks use `type: "command"` (silent scripts) instead of `type: "prompt"`.

```
/plugin marketplace update ForgePlan-marketplace
/plugin install <plugin>@ForgePlan-marketplace
/reload-plugins
```

### Marketplace name error on macOS

Use exact case: `ForgePlan/marketplace` (capital F and P). macOS APFS case-insensitive + Node.js fs.rename requires matching case.
