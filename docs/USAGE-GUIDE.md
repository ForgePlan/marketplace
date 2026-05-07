[English](USAGE-GUIDE.md) | [Русский](USAGE-GUIDE-RU.md)

# ForgePlan Marketplace — Usage Guide

Reference manual for the marketplace. **If you're new, start with [DEVELOPER-JOURNEY.md](DEVELOPER-JOURNEY.md)** — a 30-minute walkthrough from zero to your first shipped feature. This guide is for lookup, not onboarding.

## Contents

- [Installation](#installation)
- [Recommended stacks (by persona)](#recommended-stacks-by-persona)
- [Quick reference (all commands)](#quick-reference-all-commands)
- [Daily workflow](#daily-workflow)
- [Agent activation rules](#agent-activation-rules)
- [Hook behavior](#hook-behavior)
- [Plugin reference](#plugin-reference)
- [Troubleshooting](#troubleshooting)

---

## Installation

### Step 1 — Add the marketplace (once per machine)

```
/plugin marketplace add ForgePlan/marketplace
```

> [!NOTE]
> Marketplace name is case-sensitive in install commands: `ForgePlan-marketplace` (capital F and P).

### Step 2 — Pick your stack and install

See [Recommended stacks](#recommended-stacks-by-persona) below. Most users want:

```
/plugin install fpl-skills@ForgePlan-marketplace   # flagship — 15 commands, /fpl-init
/reload-plugins
```

### Step 3 — Bootstrap a project

In your project root:

```
/fpl-init
```

End-to-end bootstrap: `forgeplan init`, MCP wiring, CLAUDE.md, docs/agents/. See [DEVELOPER-JOURNEY.md](DEVELOPER-JOURNEY.md) for the walkthrough.

### Updating

```
/plugin marketplace update ForgePlan-marketplace
/plugin install <plugin>@ForgePlan-marketplace   # reinstall to pick up new version
/reload-plugins
```

---

## Recommended stacks (by persona)

Mirror of root [README.md](../README.md) "Where to Start?" matrix, with cross-links to per-persona Day 0 walkthroughs in [DEVELOPER-JOURNEY.md](DEVELOPER-JOURNEY.md).

| Persona | Stack | Day 0 walkthrough |
|---|---|---|
| 🟢 Forgeplan user / solo dev | `fpl-skills` | [Solo developer](DEVELOPER-JOURNEY.md#-solo-developer) |
| 🎨 Frontend dev | `fpl-skills` + `laws-of-ux` + `agents-domain` | [Frontend developer](DEVELOPER-JOURNEY.md#-frontend-developer) |
| 🏛 Architect / tech lead | `fpl-skills` + `fpf` + `agents-sparc` + `agents-pro` | [Architect / tech lead](DEVELOPER-JOURNEY.md#-architect--tech-lead) |
| 👥 Multi-session / team | `fpl-skills` + `forgeplan-orchestra` | [Team with Orchestra](DEVELOPER-JOURNEY.md#-team-with-orchestra) |
| 🏚 Brownfield migration | `fpl-skills` + `forgeplan-brownfield-pack` | (Brownfield-pack README has the playbook recipes) |
| 🔧 Any developer (no forgeplan) | `dev-toolkit` + `agents-core` | (Legacy stack — `dev-toolkit` is soft-deprecated; prefer `fpl-skills` if you can install the forgeplan CLI) |

> [!IMPORTANT]
> `fpl-skills` requires the [`forgeplan`](https://github.com/ForgePlan/forgeplan) CLI on `$PATH`. If you can't install it, use `dev-toolkit` (soft-deprecated but still maintained for backward compatibility).

---

## Quick reference (all commands)

15 commands across 5 plugins. `fpl-skills` provides the bulk; companion plugins add specialised commands.

### From `fpl-skills` (flagship)

| Command | What it does |
|---|---|
| `/fpl-init` | One-shot project bootstrap — forgeplan init + MCP wiring + CLAUDE.md + docs/agents/. Idempotent. |
| `/restore` | Session-context recall: branch, dirty state, recent commits, stash, memory snippets. |
| `/briefing` | Tracker overview — Orchestra/GitHub Issues/Linear/Jira or local TODO files. |
| `/research <topic>` | Deep multi-agent research (5 parallel: code · docs · status · references · memory) → `research/reports/`. |
| `/shape <idea>` | Interview-from-scratch — turns a fuzzy idea into a draft PRD via 8-12 focused questions. Front-end of the lifecycle (write the plan WITH you). |
| `/ddd-decompose` | Interview-driven Domain-Driven Design decomposition — bounded contexts, ubiquitous language, aggregates, domain events. Outputs context map (Markdown + Mermaid) plus optional Epic + per-context PRDs + Spec via forgeplan. |
| `/c4-diagram` | Interactive C4 architecture diagram generator — Context, Container, Component levels with Mermaid. Maps to forgeplan via c4-to-forge.yaml. |
| `/riper` | RIPER orchestrator (Research → Innovate → Plan → Execute → Review) — thin wrapper that delegates each phase to the right existing skill. Use when team uses RIPER terminology; otherwise prefer `/forge-cycle`. |
| `/refine <plan>` | Interview-driven refinement of an existing plan — sharpens terminology, surfaces contradictions, lazy-creates ADRs. Polish what you already wrote. |
| `/rfc <action>` | Create/read/update RFCs and ADRs (canonical structure, phase progress). |
| `/sprint <feature>` | Wave-based execution with strict file ownership; auto-detects Tactical/Standard/Deep depth. |
| `/audit` | Multi-expert review (≥4 reviewers — logic, architecture, types, security; +ux-reviewer if installed). |
| `/diagnose <bug>` | 6-phase disciplined debug loop. Phase 1 ("build a feedback loop") is the entire skill. |
| `/autorun <task>` | Autopilot orchestrator — research → sprint → audit → report end-to-end, no approval pauses. |
| `/do <task>` | Interactive variant of `/autorun` (pauses for approval at each step). |
| `/build` | Execute an existing IMPLEMENTATION-PLAN.md from a research report (wave-by-wave). |
| `/setup` | Interactive wizard — writes `docs/agents/{issue-tracker,build-config,paths,domain}.md`. |
| `/bootstrap` | Drops the universal CLAUDE.md template (stack-detected) into the current project. |
| `/team` | Foundation for multi-agent teams — TeamCreate vs sub-agents, file ownership, recipes. |
| `/migrate-from-dev-toolkit` | Automates the dev-toolkit → fpl-skills migration. Probes state, scans CLAUDE.md for `/dev-toolkit:*` refs, offers Mode A (side-by-side) or Mode B (clean cut), executes the file-level steps. See [MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md](MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md). |

### From companion plugins

| Command | Plugin | What it does |
|---|---|---|
| `/fpf` | fpf | Universal router: `/fpf decompose`, `/fpf evaluate`, `/fpf reason`, `/fpf lookup`. |
| `/fpf-decompose` | fpf | Bounded contexts, roles, interfaces. |
| `/fpf-evaluate` | fpf | F-G-R scoring + ADI reasoning. |
| `/fpf-reason` | fpf | 3+ hypotheses → test → conclude. |
| `/ux-review` | laws-of-ux | UX audit against 30 Laws of UX. |
| `/ux-law <name>` | laws-of-ux | Look up a specific UX law. |
| `/forge-cycle` | forgeplan-workflow | Tighter forgeplan-only cycle (alternative to `/sprint` for forgeplan power users). |
| `/forge-audit` | forgeplan-workflow | 6-agent forgeplan-aware audit. |
| `/sync` | forgeplan-orchestra | Bidirectional sync Forgeplan ↔ Orchestra. |
| `/session` | forgeplan-orchestra | Session Start Protocol with Inbox Pattern. |

### Legacy commands (dev-toolkit, deprecated)

| Command | What it does |
|---|---|
| `/recall` | Replaced by `/restore` in fpl-skills. |
| `/audit`, `/sprint` | Same names as fpl-skills — don't install both plugins together. |
| `/report` | dev-toolkit's slash command. The underlying `forge-report` skill is now in fpl-skills (invoke by name; auto-triggers via hooks). |

---

## Daily workflow

The full lifecycle, threaded through `fpl-skills` commands:

```
Morning      → /restore (or /session if Orchestra installed)
             → /briefing
Pick task    → forgeplan route "task"  (decide Tactical/Standard/Deep)
Discovery    → /research <topic>       (gap analysis, prior art)
             → /refine <plan>          (sharpen)
             → /rfc create             (if Standard+, formalise)
Execute      → /sprint <feature>       (interactive)
             → /do <task>              (interactive with checkpoints)
             → /autorun <task>         (overnight, no approval)
Verify       → /audit                  (multi-expert review)
             → /diagnose <bug>         (when something breaks)
Ship         → forgeplan new evidence "..." && forgeplan link && forgeplan score
             → forgeplan activate <id>
             → gh pr create
End of day   → memory_retain (if using Hindsight)
```

For a worked example (`add user authentication` end-to-end), see [DEVELOPER-JOURNEY.md § Day 1](DEVELOPER-JOURNEY.md#day-1--first-feature-add-user-authentication).

---

## Agent activation rules

Most agents activate based on context — you don't manually invoke them.

| Trigger | Agent | Plugin |
|---|---|---|
| Files changed without tests | `dev-advisor` (suggests tests) | dev-toolkit / fpl-skills |
| `/sprint` detects Deep task **and** agents-sparc installed | `sparc-orchestrator` + `specification` + `pseudocode` + `architecture` + `refinement` | agents-sparc |
| `/audit` runs **and** frontend files in changeset **and** laws-of-ux installed | `ux-reviewer` | laws-of-ux |
| Architecture/decision keywords detected (e.g. "decompose", "evaluate alternatives") | `fpf-advisor` (suggests `/fpf`) | fpf |
| `forgeplan new` or `forgeplan activate` runs **and** forgeplan-orchestra installed | `orchestra-advisor` (suggests `/sync`) | forgeplan-orchestra |
| Editing `.html`/`.css`/`.jsx`/`.tsx`/`.vue` | UX hint hook | laws-of-ux |
| Routing/evidence keywords detected | `forge-advisor` | forgeplan-workflow |

You can also invoke a specific agent explicitly:

> "Use the security-expert agent to review this auth code"
> "Spawn typescript-pro for this refactoring"
> "Run the debugger agent on this stack trace"

For the SPARC methodology details (when `agents-sparc` activates inside `/sprint`), see [ARCHITECTURE.md § SPARC](ARCHITECTURE.md#layer-4-sparc-structured-coding).

### How `/audit` composes agents

```
/audit
├─ logic            (built-in)
├─ architecture     (built-in)
├─ types            (built-in)
├─ security         (built-in)
├─ security-expert  (if agents-pro installed)
├─ ux-reviewer      (if laws-of-ux installed AND changeset is frontend)
└─ architect-review (if agents-pro installed AND changes touch architecture)
```

The base 4 reviewers always run. Additional reviewers join based on installed plugins and changeset content. Findings are aggregated, deduplicated, and reported as CRITICAL / HIGH / MEDIUM / LOW with file:line references.

---

## Hook behavior

When you install multiple plugins their hooks stack — each fires independently.

### What fires when

| Event | Plugin | Hook | What it does |
|---|---|---|---|
| `SessionStart` | fpl-skills | `session-start.sh` | Probes `.forgeplan/`, `docs/agents/`, `CLAUDE.md`; prints context-aware next-step hint (e.g. "Run /fpl-init" for fresh repos). |
| `PreToolUse:Bash` | dev-toolkit | `safety-hook.sh` | Blocks `git push --force`, `git reset --hard`, `rm -rf /`, `DROP TABLE`. |
| `PreToolUse:Bash` | forgeplan-workflow | `forge-safety-hook.sh` | Delegates to dev-toolkit hook if installed; otherwise runs own checks. |
| `PreToolUse:Write\|Edit` | forgeplan-workflow | `pre-code-check.sh` | Warns if no active PRD (cached, 5-min TTL). |
| `PostToolUse:Write\|Edit` | dev-toolkit | `test-hint.sh` | Suggests tests when new public functions are added. |
| `PostToolUse:Write\|Edit` | laws-of-ux | `ux-hint.sh` | Suggests UX review when frontend files are modified. |
| `PostToolUse:Bash` | forgeplan-orchestra | `forge-sync-hint.sh` | Suggests Orchestra sync after `forgeplan activate`/`new`. |

### Disabling a hook temporarily

Hooks cannot be disabled per-session. To stop them, uninstall the plugin:

```
/plugin uninstall <plugin-name>@ForgePlan-marketplace
```

---

## Plugin reference

Brief overview. For full READMEs see `plugins/<name>/README.md`.

### `fpl-skills` — Flagship workflow plugin

15 engineering skills built on top of forgeplan's artifact lifecycle. **Replaces `dev-toolkit` for forgeplan users.** See [plugins/fpl-skills/README.md](../plugins/fpl-skills/README.md).

**Requires**: forgeplan CLI on `$PATH`.

### `fpf` — First Principles Framework

Structured reasoning for decompose / evaluate / reason / lookup. 224 FPF spec sections + 4 applied patterns. Pairs with `/refine` and `/diagnose`. See [plugins/fpf/README.md](../plugins/fpf/README.md).

**Requires**: nothing.

### `laws-of-ux` — Frontend UX review

`/ux-review` against 30 Laws of UX. `ux-reviewer` agent auto-spawns from `/audit` on frontend changesets. Auto-hint hook on `.html`/`.css`/`.jsx`/`.tsx`/`.vue` edits. See [plugins/laws-of-ux/README.md](../plugins/laws-of-ux/README.md).

**Requires**: nothing.

### `forgeplan-workflow` — Forgeplan-only cycle

`/forge-cycle` and `/forge-audit` — tighter forgeplan-only loop. Alternative entry point if you don't want fpl-skills' broader bundle. See [plugins/forgeplan-workflow/README.md](../plugins/forgeplan-workflow/README.md).

**Requires**: forgeplan CLI.

### `forgeplan-orchestra` — Multi-session coordination

`/sync` (Forgeplan ↔ Orchestra) and `/session` (Inbox Pattern). For team / multi-session work. See [plugins/forgeplan-orchestra/README.md](../plugins/forgeplan-orchestra/README.md).

**Requires**: forgeplan CLI + Orchestra MCP server.

### `forgeplan-brownfield-pack` — Legacy ingest

Mappings + playbooks for brownfield migration (Obsidian, MADR, ad-hoc markdown → forgeplan graph). Composes `c4-architecture`, `autoresearch`, `ddd-expert`, `feature-dev`. See [plugins/forgeplan-brownfield-pack/README.md](../plugins/forgeplan-brownfield-pack/README.md).

**Requires**: forgeplan CLI v0.25+.

### `dev-toolkit` — Universal toolkit (deprecated)

> [!CAUTION]
> Soft-deprecated, superseded by `fpl-skills`. Existing installs keep working; new installs should prefer `fpl-skills` if forgeplan CLI is available.

`/audit`, `/sprint`, `/recall`, `/report`, `dev-advisor` agent, safety hook, test reminder. See [plugins/dev-toolkit/README.md](../plugins/dev-toolkit/README.md).

**Requires**: nothing.

### Agent packs (5 plugins, 55 agents)

Specialised subagents that `/audit`, `/sprint`, and other commands compose when relevant.

| Pack | Agents | Focus |
|---|:---:|---|
| `agents-core` | 11 | Debugger, code-reviewer, planner, tester, TDD, production-validator |
| `agents-domain` | 11 | TypeScript, Go, React, Next.js, Electron, mobile, WebSocket |
| `agents-pro` | 21 | Security, architecture, DDD, creative, research, infrastructure |
| `agents-github` | 7 | PR, issues, releases, multi-repo, project boards, workflows |
| `agents-sparc` | 5 | SPARC methodology — orchestrator + 4 phase specialists |

Install only what you use. `/audit` and `/sprint` automatically draw from whichever packs are present.

---

## Troubleshooting

### Plugins not loading after install

```
/reload-plugins
/doctor          # check for errors
```

### Marketplace "not found" error in CLI

Use exact case: `ForgePlan-marketplace` (capital F and P). The CLI is case-sensitive.

```bash
# Wrong:
claude plugin marketplace update forgeplan-marketplace

# Right:
claude plugin marketplace update ForgePlan-marketplace
```

### `/fpl-init` refuses with "forgeplan CLI is required"

Install the CLI:

```bash
brew install ForgePlan/tap/forgeplan
# Or:
cargo install --git https://github.com/ForgePlan/forgeplan forgeplan-cli

# Then verify:
forgeplan --version
```

Re-run `/fpl-init` after installation.

### `/fpl-init` says "this is a plugin source — refuse"

You're inside the marketplace repo or a plugin source directory. `/fpl-init` is for project repos, not plugin authoring locations. Move to a real project repo and re-run.

### `/fpl-init` already-initialized but I want to redo CLAUDE.md

Delete `CLAUDE.md` (the other baseline files stay) and re-run `/fpl-init`. It detects only the missing piece and runs only that step.

### Both `dev-toolkit` and `fpl-skills` installed — duplicate `/audit` etc.

The two plugins overlap on `/audit` and `/sprint`. Uninstall one:

```
/plugin uninstall dev-toolkit@ForgePlan-marketplace
```

Existing dev-toolkit users can keep using it — but for new projects prefer `fpl-skills`.

### `forgeplan health` reports stubs / orphans / duplicates

These are pre-existing artifacts in your `.forgeplan/` that need attention. See `forgeplan deprecate <id>` and `forgeplan supersede <id> --by <new-id>`. Don't auto-fix unless that's the explicit task.

### Hooks are too noisy

If hook output bloats your sessions:

1. Update plugins to the latest version (`marketplace update` + reinstall).
2. If a specific hook is unwanted, uninstall its parent plugin.

Hooks are not configurable per-session — disabling means uninstalling.

### Need to upgrade after a marketplace bump

```
/plugin marketplace update ForgePlan-marketplace
/plugin install fpl-skills@ForgePlan-marketplace   # reinstall to get new version
/reload-plugins
```

For specific plugins, replace `fpl-skills` with the plugin name.

---

## See also

- [DEVELOPER-JOURNEY.md](DEVELOPER-JOURNEY.md) — narrative onboarding (start here if you're new).
- [PLAYBOOK.md](PLAYBOOK.md) — use-case matrix (which command for which scenario).
- [METHODOLOGIES.md](METHODOLOGIES.md) — what's built into forgeplan (BMAD, OpenSpec, ADI, F-G-R, DDR) vs external.
- [MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md](MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md) — moving from `dev-toolkit` to `fpl-skills`.
- [TRACKER-INTEGRATION.md](TRACKER-INTEGRATION.md) — per-tracker recipes (Orchestra, GitHub Issues, Linear, Jira, local).
- [FORGEPLAN-WEB.md](FORGEPLAN-WEB.md) — `@forgeplan/web` browser viewer for time-travel and graph exploration.
- [ARCHITECTURE.md](ARCHITECTURE.md) — 4-layer mental model (Orchestra, Forgeplan, FPF, SPARC).
- [CONTRIBUTING.md](../CONTRIBUTING.md) — adding a new plugin to the marketplace.
- [CHANGELOG.md](../CHANGELOG.md) — release history.
- Per-plugin READMEs in `plugins/<name>/README.md`.
- `plugins/fpl-skills/skills/bootstrap/resources/guides/CLAUDE-MD-GUIDE.ru.md` — CLAUDE.md best practices.
- `plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md` — `.forgeplan/` setup contract.
