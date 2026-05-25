# Smith Bootstrap Template

> Output template for `/smith-bootstrap`. Greenfield onboarding checklist for fresh repos.
> **Hard limit**: ≤300 lines. Run top-to-bottom; mark `[x]` as each step lands.

---

# Smith Bootstrap: <project name>

| Field | Value |
|---|---|
| Status | Draft |
| Date | YYYY-MM-DD |
| Repo path | <absolute path, e.g., /Users/you/Work/MyNewProject> |
| Target stack | <if known: e.g., "Node.js + TypeScript + React", "Python + FastAPI", "Go service"; else "TBD"> |

## Pre-flight checks

Verify the repo is genuinely greenfield. If any check fails, switch to `forgeplan-brownfield-pack` discover agent instead.

- [ ] Git initialized (`git status` returns clean tree or "no commits yet")
- [ ] No `CLAUDE.md` present (or detected — decide: extend existing vs scaffold fresh)
- [ ] No `AGENTS.md` present
- [ ] No `.mcp.json` present
- [ ] Forgeplan not initialised (no `.forgeplan/` directory)
- [ ] No `package.json` / `pyproject.toml` / `go.mod` already declaring a stack (if present, capture and adapt below)

If ≥3 checks fail → **STOP**. This is brownfield, not greenfield. Dispatch `forgeplan-brownfield-pack:discover` instead of continuing this template.

## Step 1: forgeplan init

Run the exact command:

```bash
cd <repo path>
forgeplan init -y
```

Verify:

- [ ] `.forgeplan/` directory created
- [ ] `forgeplan health` returns healthy (zero artifacts is expected for fresh init)

## Step 2: AGENTS.md scaffold

Cross-CLI manifest at repo root. Acts as a shim pointing Claude Code, Gemini CLI, Codex, and other MCP-aware clients to the same context.

Write `AGENTS.md` with at minimum:

```markdown
# Agents Manifest

Cross-CLI context shim. Source of truth: `CLAUDE.md`.

## Active agents
- (none yet — populate after first plugin install)

## MCP servers
- forgeplan (project artifacts)
- hindsight (cross-session memory, if installed)

## Conventions
See `CLAUDE.md` for full project conventions.
```

Verify:

- [ ] `AGENTS.md` written at repo root

## Step 3: CLAUDE.md scaffold

Minimal version for fresh project. Will be extended as the project matures.

Write `CLAUDE.md` with at minimum:

```markdown
# <Project Name> — Claude Code Configuration

**Purpose**: <one-sentence purpose>
**Stack**: <target stack from header>
**Status**: Greenfield bootstrap

## Quick Start
(populate after first commands land)

## Conventions
- Commits: conventional-commit prefixes (`feat`, `fix`, `docs`, `chore`)
- Branches: `feat/*`, `fix/*`, `docs/*`, `chore/*`
- PRs required for `main` (configure branch protection after first push)

## Forgeplan
This project uses forgeplan for structured artifacts (PRD/RFC/ADR/Evidence).
Run `forgeplan health` to see current state.

## Plugin recommendations
See "Plugin install recommendations" below.
```

Verify:

- [ ] `CLAUDE.md` written at repo root
- [ ] First line is `# <Project Name> — Claude Code Configuration`

## Step 4: Plugin install recommendations

Install the canonical baseline via `/plugin install` in a Claude Code session:

- [ ] `/plugin install fpl-skills@ForgePlan-marketplace` — core skills (smith, decision, decay-watch, methodology-check, …)
- [ ] `/plugin install fpf@ForgePlan-marketplace` — First Principles Framework (ADI, reasoning, decomposition)
- [ ] `/plugin install forgeplan-workflow@ForgePlan-marketplace` — `/forge-cycle`, `/forge-audit`, guardian agent
- [ ] `/plugin install agents-core@ForgePlan-marketplace` — coder, code-reviewer, tester, planner, debugger
- [ ] `/plugin install agents-pro@ForgePlan-marketplace` — adr-architect, specification, architecture, guardian, security-expert, brief-intake, evidence-recorder, …

Optional (install on demand):

- `fpl-hsmem` — cross-session memory via Hindsight (recommended for projects >1 week)
- `agents-github` — PR/issue/release automation
- `agents-sparc` — SPARC methodology pack
- `forgeplan-brownfield-pack` — only if you later import legacy code

Verify:

- [ ] At least the 5 baseline plugins installed (`/plugin list` shows them enabled)

## Step 5: First Brief

Dispatch `agents-pro:brief-intake` (Profile A) to capture the project idea into a structured Brief artifact.

```text
Task(subagent_type="agents-pro:brief-intake",
     prompt="Capture the project idea for <project name>. Stack: <target stack>. Goal: <one-line goal>. Constraints: <known constraints>. Output: Brief artifact in forgeplan.")
```

Verify:

- [ ] Brief artifact created in forgeplan (`forgeplan list --kind=note`)
- [ ] Brief has problem statement, target users, success criteria, non-goals

## Step 6: First PRD

Dispatch `agents-sparc:specification` (Profile A) to convert the Brief into a Standard-depth PRD.

```text
Task(subagent_type="agents-sparc:specification",
     prompt="Read Brief BRIEF-001. Produce PRD with FR/NFR, AC (SMART), out-of-scope. Depth: Standard. Output: PRD artifact in forgeplan.")
```

Verify:

- [ ] PRD artifact created in draft status (`forgeplan list --kind=prd`)
- [ ] PRD links to BRIEF-001 via `informs` relation
- [ ] PRD body has FR, NFR, AC, Out-of-scope sections

## Acceptance criteria

Bootstrap is complete when ALL of the following are true:

- [ ] `CLAUDE.md` present at repo root with project header
- [ ] `AGENTS.md` present at repo root with MCP servers section
- [ ] `forgeplan init` done (`.forgeplan/` exists, `forgeplan health` healthy)
- [ ] At least one Brief artifact captured (`forgeplan list --kind=note` shows ≥1)
- [ ] At least one PRD in draft (`forgeplan list --kind=prd --status=draft` shows ≥1)
- [ ] At least 5 baseline plugins installed (fpl-skills, fpf, forgeplan-workflow, agents-core, agents-pro)

When all `[x]` — bootstrap done. Next dispatch: `/forge-cycle PRD-NNN` to start the FPF → BMAD → OpenSpec → Forgeplan pipeline on the first PRD.

---

## How to use this template

1. Run `/smith-bootstrap` — smith fills this template with project-specific values from your prompt.
2. Work top-to-bottom. Each step has a verify checkbox; mark `[x]` as it lands.
3. If a pre-flight check fails, STOP and route to `forgeplan-brownfield-pack:discover` instead.
4. After "Acceptance criteria" is fully `[x]`, hand-off to `/forge-cycle` on the first PRD.
5. Save a copy of this filled template as `.forgeplan/notes/bootstrap-<date>.md` for traceability.
