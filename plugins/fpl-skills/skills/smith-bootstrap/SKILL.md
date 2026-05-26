---
name: smith-bootstrap
description: |
  Greenfield-project onboarding skill. For a fresh repo (no CLAUDE.md, no forgeplan, no AGENTS.md), runs two pre-flight gates (MUST plugins enabled + `.mcp.json` wired) → pre-flight detection → forgeplan init → CLAUDE.md scaffold → AGENTS.md scaffold → plugin install recommendations → first Brief via brief-intake agent → first PRD via specification agent. Output: bootstrap checklist artifact + a confirmed greenfield project ready for the canonical /forge-cycle pipeline.

  Triggers: "smith bootstrap", "/smith-bootstrap", "bootstrap project", "новый проект", "fresh start", "greenfield onboarding", "init this project"
---

# /smith-bootstrap — greenfield onboarding

You bootstrap a fresh (greenfield) project into the ForgePlan canonical pipeline. The procedure is one-time: **Step 0 pre-flight gates (plugins + `.mcp.json`)** → pre-flight detection → forgeplan init → CLAUDE.md + AGENTS.md scaffold → MUST/SHOULD plugin recommendations → first Brief → first PRD. End state: project is ready for `/forge-cycle` on the first PRD.

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

## Step 0 — Pre-flight gates (halt-and-instruct)

**Two hard gates before any scaffolding.** Both fail-fast with explicit instructions — `/smith-bootstrap` does **not** install plugins or wire `.mcp.json` itself. If either gate fails, print the instruction block and exit. The user runs one command, then re-invokes `/smith-bootstrap`.

Why fail-fast (not soft-fallback):

- **Plugin fallback is invisible**. If `agents-sparc` is not enabled, Step 6 silently falls back to `agents-pro:artifact-author` (generic Profile A) — the PRD lands but misses the SPARC Specification contract (SMART AC, ADI hypothesis structure). User finds out only at the next `/methodology-check` or guardian gate, after a re-run is more expensive than the install would have been.
- **`.mcp.json` is the contract** between Claude Code and the forgeplan MCP server. Without it, every `mcp__forgeplan__*` deferred tool surface in this skill is unavailable — the brief-intake and specification agents will silently shell-fall-back, producing degraded artifacts. `/fpl-init` is the canonical wiring skill; do not reinvent it here.

### Gate A — MUST plugins enabled

Required plugins for greenfield bootstrap (matches Step 4 MUST tier):

```bash
REQUIRED=(fpl-skills agents-pro agents-sparc agents-core forgeplan-workflow)

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

MISSING=()
for plugin in "${REQUIRED[@]}"; do
    echo "$ENABLED_LIST" | grep -q "^${plugin}@" || MISSING+=("$plugin")
done
```

**If `MISSING` is non-empty — HALT.** Print:

```
✗ Bootstrap halted — required plugins are not enabled (Gate A):

  <list of missing plugins>

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

Why agents-sparc is MUST, not SHOULD: Step 6 dispatches agents-sparc:specification for the first PRD.
Without it, the dispatch falls back to agents-pro:artifact-author (generic Profile A) — the PRD lands
but misses SPARC Specification's contract (SMART AC + ≥3 hypotheses via forgeplan_reason). Halting up
front is cheaper than a re-run after /methodology-check flags the gap.
```

**If `MISSING` is empty** — print one line and continue to Gate B:

```
✓ Gate A: 5/5 MUST plugins enabled (fpl-skills, agents-pro, agents-sparc, agents-core, forgeplan-workflow)
```

### Gate B — `.mcp.json` wired with forgeplan block

Required: `.mcp.json` at repo root contains `mcpServers.forgeplan` (with `args: ["serve"]`, not `["mcp"]` — see `/fpl-init` Step 5 for the historic bug). Without this, the brief-intake and specification agents dispatched at Steps 5/6 cannot reach forgeplan MCP tools and will degrade to shell fallback or fail outright.

```bash
python3 - <<'PY'
import json, pathlib, sys
p = pathlib.Path(".mcp.json")
if not p.exists():
    print("ABSENT")
    sys.exit(0)
try:
    d = json.loads(p.read_text())
except Exception as e:
    print(f"INVALID: {e}")
    sys.exit(0)
fp = d.get("mcpServers", {}).get("forgeplan")
if not fp:
    print("MISSING-FORGEPLAN-BLOCK")
elif fp.get("args") == ["mcp"]:
    print("STALE-ARGS")  # buggy v1.6.0 init output — fpl-init upgrades to ["serve"]
else:
    print("OK")
PY
```

**If output is `OK` — continue to Pre-flight detection.** Print:

```
✓ Gate B: .mcp.json wired (forgeplan MCP server reachable)
```

**Any other output — HALT.** Print:

```
✗ Bootstrap halted — .mcp.json is not wired for forgeplan (Gate B): <reason from probe>

Run /fpl-init first — it is the canonical wiring skill. It will:
  • verify forgeplan CLI is on $PATH
  • run `forgeplan init` (creates .forgeplan/)
  • merge .mcp.json with the forgeplan MCP server block (and preserve any existing entries)
  • inject the forgeplan operating contract into CLAUDE.md
  • offer the docs/agents/ setup wizard

After /fpl-init reports success, re-invoke /smith-bootstrap to continue with greenfield-specific
steps (brief-intake → specification → first PRD).

Why /smith-bootstrap doesn't do this itself: /fpl-init already does it, idempotently, with .mcp.json
merge that preserves existing entries (hindsight, orch, ...). Reinventing the merge here would either
duplicate /fpl-init logic or risk overwriting unrelated MCP servers. One skill, one job.
```

Acceptance for Step 0: both gates print `✓` lines. If either prints `✗`, the skill exits without writing any files.

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
- `forgeplan list --kind=note` shows ≥1 new artifact.
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

Verify:
- `forgeplan list --kind=prd` shows ≥1 new artifact.
- PRD body has FR, NFR, AC, Out-of-scope sections.
- PRD links to BRIEF via `informs` relation (`forgeplan_get PRD-NNN` shows the link).
- PRD is in `draft` status (NOT activated yet).

---

## Acceptance criteria

Bootstrap is complete when ALL the following hold:

- [ ] Step 0 Gate A passed (5 MUST plugins enabled — fpl-skills, agents-pro, agents-sparc, agents-core, forgeplan-workflow)
- [ ] Step 0 Gate B passed (`.mcp.json` has `mcpServers.forgeplan` with `args: ["serve"]`)
- [ ] `forgeplan health` returns "healthy" (exit 0)
- [ ] `CLAUDE.md` present at repo root, ≥40 lines, first line is `# <Project Name> — Claude Code Configuration`
- [ ] `AGENTS.md` present at repo root, ≥30 lines, contains smith pointer + MCP servers section
- [ ] `.mcp.json` present at repo root with at least the `forgeplan` MCP server registered (already verified at Step 0 Gate B)
- [ ] At least one Brief NOTE artifact in forgeplan (`forgeplan list --kind=note` shows ≥1)
- [ ] At least one PRD in draft (`forgeplan list --kind=prd --status=draft` shows ≥1)
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
| Step 0 Gate A halt (plugins missing) | Print the install block, exit cleanly without writing files. User runs the `/plugin install` commands, then re-invokes `/smith-bootstrap`. Do not silent-fallback to non-MUST agents. |
| Step 0 Gate B halt (`.mcp.json` not wired) | Print the "run `/fpl-init` first" block, exit cleanly without writing files. After `/fpl-init` succeeds, user re-invokes `/smith-bootstrap`. Do not attempt to write `.mcp.json` from this skill — `/fpl-init` owns that merge logic. |
| `forgeplan init` fails with "command not found" | Check `which forgeplan` and `forgeplan --version`. If absent, instruct user to install forgeplan CLI first (per forgeplan README). Do not proceed without it. |
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
