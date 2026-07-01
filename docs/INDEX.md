# Repository Index — where everything lives

**Purpose**: the single navigation map for this repo. An agent (or human) reading `CLAUDE.md` or `AGENTS.md` lands here to find *what lives where* and jump straight to it. Paths are repo-relative unless marked otherwise. When a count or path matters, **verify against disk** — this index is re-derived from `marketplace.json` + the tree, but the source of truth is always the file system + `.claude-plugin/marketplace.json`.

This is **ForgePlan/marketplace** — the Claude Code plugin marketplace for the ForgePlan engineering ecosystem (19 plugins: 10 workflow + 8 agent packs + 1 memory plugin). Install: `/plugin marketplace add ForgePlan/marketplace` → `/plugin install <plugin>@ForgePlan-marketplace`.

---

## 1. Start here (auto-loaded context)

| File | What it is | Read it for |
|---|---|---|
| [`CLAUDE.md`](../CLAUDE.md) | The operational rulebook (Claude Code) | the 4-layer pipeline (S10–S13), Git/PR rules, branch protection, CI, the discipline gates (FPF ADI / BMAD review / OpenSpec delta / ground-truth), version-bump rules, smith section, plugin-version table |
| [`AGENTS.md`](../AGENTS.md) | Cross-CLI context shim (CLI-agnostic) | project overview, architecture reading-order, smith 14-row routing, MCP wiring per CLI, git workflow, the 3 orchestrator entrypoints |
| [`README.md`](../README.md) / [`README-RU.md`](../README-RU.md) | Human landing page | install, plugin catalog, the docs links table, agent-pack overview |
| **this file** `docs/INDEX.md` | Repository map / file-RAG | where any plugin / agent / skill / hook / doc / artifact lives + a "how to find X" lookup |

---

## 2. Top-level layout

```
forgeplan-marketplace/
├── .claude-plugin/marketplace.json   # the catalog — single source of truth for plugins + versions + profiles
├── CLAUDE.md  AGENTS.md  README.md  README-RU.md  CHANGELOG.md  CONTRIBUTING.md
├── plugins/            # the 19 plugins (workflow + agent packs + memory) — §3
├── docs/               # all guides + this index — §6
├── scripts/            # validate-all-plugins.sh + scripts/ci/ gates — §5
└── .github/workflows/  # CI (validate-plugins.yml), auto-add-to-project, sync-standalone-skills
```

> **forgeplan artifacts (PRD/RFC/ADR/EVID/NOTE) are NOT in this git repo** — they live in the parent workspace at `../.forgeplan/` (the marketplace repo is a child directory of the workspace). See §7.

---

## 3. Plugins (`plugins/<name>/`)

Source of truth: [`.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json). Each plugin: `.claude-plugin/plugin.json` (manifest) + `commands/` `agents/` `skills/` `hooks/` as applicable.

### Workflow plugins (10) + memory (1)
| Plugin | Path | One-line |
|---|---|---|
| **fpl-skills** | `plugins/fpl-skills/` | flagship — 40 engineering skills + dev-advisor agent + hooks; hosts **smith** routing brain (`skills/smith/`) |
| **fpl-hsmem** | `plugins/fpl-hsmem/` | Hindsight v2 cross-session memory (auto UserPromptSubmit/Stop/SessionEnd hooks) |
| **forgeplan-workflow** | `plugins/forgeplan-workflow/` | `/forge-cycle`, `/forge-audit` — the reactive 4-layer enforcer |
| **forgeplan-orchestra** | `plugins/forgeplan-orchestra/` | Orchestra ↔ forgeplan task sync |
| **forgeplan-brownfield-pack** | `plugins/forgeplan-brownfield-pack/` | Discover Agent — brownfield onboarding (`agents/discover/`) |
| **fpf** | `plugins/fpf/` | First Principles Framework — `/fpf-decompose`/`-evaluate`/`-reason` |
| **laws-of-ux** | `plugins/laws-of-ux/` | 30 UX laws + `/ux-review` + ux-reviewer agent (CANVAS code-gate dependency) |
| **agentic-rag** | `plugins/agentic-rag/` | agentic-RAG knowledge plugin |
| **fp-cookbook** | `plugins/fp-cookbook/` | forgeplan MCP + CLI cookbook |
| **cc-best** | `plugins/cc-best/` | Claude Code best-practice reference (claude-md / plugins / agents / hooks / mcp / anti-patterns) |
| **dev-toolkit** | `plugins/dev-toolkit/` | ⚠️ soft-deprecated (ADR-003) — migrate to fpl-skills |

### Agent packs (8) — see §4 for the agents inside
| Pack | Path | Agents | Focus |
|---|---|---|---|
| **agents-core** | `plugins/agents-core/` | 11 | coder, code-reviewer, tester, debugger, planner, … |
| **agents-domain** | `plugins/agents-domain/` | 11 | language/framework specialists (typescript-pro, golang-pro, nextjs, …) |
| **agents-pro** | `plugins/agents-pro/` | 30 | smith, guardian, adr-architect, architect-reviewer, artifact-*, security-expert, … |
| **agents-github** | `plugins/agents-github/` | 7 | PR / issues / releases / workflows |
| **agents-sparc** | `plugins/agents-sparc/` | 5 | SPARC instance #3 (sparc-orchestrator + phase agents) |
| **agents-tdd** | `plugins/agents-tdd/` | 4 | TDD instance #1 (tdd-orchestrator + RED/GREEN + validator) |
| **agents-bmad** | `plugins/agents-bmad/` | 1 | BMAD instance #2 (bmad-orchestrator persona-walk) |
| **agents-canvas** | `plugins/agents-canvas/` | 8 | CANVAS instance #5 — design-system→code (canvas-coordinator + 7 roles) |

---

## 4. AD/AID-PDLC sub-cycle instances (ADR-010) — where each lives

| # | Methodology | Master agent | Plugin | Entry | hook-gate |
|---|---|---|---|---|---|
| 1 | **TDD** | `tdd-orchestrator` | `plugins/agents-tdd/` | `/tdd` | Yes (`hooks/tdd-gate.sh`) |
| 2 | **BMAD** | `bmad-orchestrator` | `plugins/agents-bmad/` | `/bmad` | Yes (`hooks/bmad-gate.sh`) |
| 3 | **SPARC** | `sparc-orchestrator` | `plugins/agents-sparc/` | `/sparc` | No |
| 4 | **RIPER** | (main session) | `plugins/fpl-skills/skills/riper/` | `/riper` | No |
| 5 | **CANVAS** | `canvas-coordinator` | `plugins/agents-canvas/` | `/canvas` | Yes (`hooks/scripts/canvas-gate.sh`) |

CANVAS agents (`plugins/agents-canvas/agents/`): `canvas-coordinator` (master) · `canvas-designer` (Capture) · `canvas-guardian` (Audit C4) · `canvas-tester` (Norm-check C4) · `canvas-porter-storybook` (Vectorize) · `canvas-coder` (Assemble) · `canvas-storybook-validator` (Gate Storybook C4) · `canvas-porter-framework` (Spread — optional multi-framework wrapper fan-out, out-of-default; default CANVAS pipeline is native single-framework, C-A-N-V-A five phases, target framework resolved via Step 0). Skills: `skills/canvas` (entry), `canvas-design`, `canvas-conventions`, `canvas-port`, `canvas-truth-map`, `canvas-storybook-test`. Hook: `hooks/scripts/canvas-gate.sh` + `canvas-lib.sh`. Tests: `tests/test-canvas-gate.sh`. Spec: `../.forgeplan/rfcs/RFC-021-*` (+ EVID-178..184).

---

## 5. Skills, hooks, scripts, CI

- **fpl-skills skills (40)** — `plugins/fpl-skills/skills/<name>/SKILL.md` (agentic-RAG: `sections/*/_index.md` per skill). Notable: `smith/` (the 14-row routing brain + `routing-map.md`), `forge-cycle`, `autorun`, `audit`, `research`, `sprint`, `methodology-check`, `forge-heal`, `riper`, `conformance-vectors`.
- **Authoring contract** — `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` (agent frontmatter, Profile A/B/C/D, LR-8 denylist canon, Step 11 affected_files, ground-truth Step 4.5).
- **Validation** — [`scripts/validate-all-plugins.sh`](../scripts/validate-all-plugins.sh) (run before every PR; `<plugin>` arg for one).
- **CI gates** (`scripts/ci/`, run by the script + GH Actions): `catalog-check.js` (doc counts vs disk, `--write` autosync) · `cross-ref-check.js` (dangling agent/skill refs) · `check-unicode-safety.js` · `validate-no-personal-paths.js` · `validate-workflow-security.js` · `validate-install-manifests.js`.
- **GH Actions** — `.github/workflows/validate-plugins.yml` (job `validate`, on PR to main/dev) + `auto-add-to-project.yml` + `sync-standalone-skills.yml`.

---

## 6. Docs (`docs/`) — by purpose

| Doc | Purpose |
|---|---|
| [`ONBOARDING.md`](ONBOARDING.md) (+RU) | **read first** — zero→autonomous in 30-60 min |
| [`DEVELOPER-JOURNEY.md`](DEVELOPER-JOURNEY.md) (+RU) | 30-min walkthrough, 4 personas |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) (+RU) | 4-layer mental model — Orchestra · Forgeplan · FPF · SPARC |
| [`METHODOLOGIES.md`](METHODOLOGIES.md) (+RU) | what's built in (BMAD/SPARC/RIPER/CANVAS/ADI/…) vs external |
| [`SMITH.md`](SMITH.md) (+RU) | the 14-row routing matrix, human guide |
| [`process-from-idea-to-delivery-EN.md`](process-from-idea-to-delivery-EN.md) (+RU) | full idea→commit process; §3.0 = the ADR-010 contract + 5 instances |
| [`USAGE-GUIDE.md`](USAGE-GUIDE.md) (+RU) | command reference, hooks, agent activation, troubleshooting |
| [`PLAYBOOK.md`](PLAYBOOK.md) (+RU) | which command for which scenario |
| [`BROWNFIELD-GUIDE.md`](BROWNFIELD-GUIDE.md) (+RU) | existing codebases — Discover Agent, Strangler Fig |
| [`SETUP-GUIDE-NEW-REPO.md`](SETUP-GUIDE-NEW-REPO.md) | bootstrap a new ForgePlan repo (~20 min) |
| [`CROSS-CLI.md`](CROSS-CLI.md) | running across Claude Code / Cursor / Gemini / Codex / Goose |
| [`GITHUB-PROJECTS.md`](GITHUB-PROJECTS.md) (+RU) | board sync (project 5) |
| [`AI-SDLC-MAPPING.md`](AI-SDLC-MAPPING.md) (+RU), [`UPSTREAM-METHODOLOGIES.md`](UPSTREAM-METHODOLOGIES.md) (+RU), [`AUTORESEARCH-INTEGRATION.md`](AUTORESEARCH-INTEGRATION.md) (+RU), [`TRACKER-INTEGRATION.md`](TRACKER-INTEGRATION.md) (+RU), [`FORGEPLAN-WEB.md`](FORGEPLAN-WEB.md) (+RU), [`MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md`](MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md) (+RU) | topical references |
| [`c4/`](c4/) | C4 architecture diagrams (per-ADR) |
| `SESSION-CHECKPOINT-SCHEMA.md`, `SESSION-RESUME-PROMPT.md`, `*-SPRINT-*.md`, `POST-325-ACTIONS.md` | session/sprint operational records |

Root: [`CHANGELOG.md`](../CHANGELOG.md) · [`CONTRIBUTING.md`](../CONTRIBUTING.md) (how to add a plugin).

---

## 7. Forgeplan artifacts — in the **parent workspace**, not this repo

The governance graph lives at **`../.forgeplan/`** (workspace root `~/Work/ForgePlanMarketplace/.forgeplan/`), reachable via the forgeplan MCP/CLI — NOT committed to this git repo.

- `../.forgeplan/{prds,rfcs,adrs,epics,evidence,notes,problems,solutions}/` — the artifacts; `state/` — per-artifact lifecycle.
- **Architecture reading order** (from AGENTS.md): PRD-024 → PRD-025 → RFC-002 → RFC-003 → ADR-005 → NOTE-004 → NOTE-005.
- **Methodology contract**: ADR-010 (sub-cycle contract) + ADR-012 (hook-gate realization tier) + ADR-009 (generator≠verifier) + NOTE-027 (program closure + CANVAS amendment); instances RFC-012/013/016/018/021.
- Access: `mcp__forgeplan__forgeplan_get/list/...` (MCP) or `forgeplan` CLI. Do not assume `.forgeplan/` is inside the git repo.

---

## 8. How to find X (quick lookup)

| I need… | Go to |
|---|---|
| the plugin catalog + versions | `.claude-plugin/marketplace.json` |
| which methodology for a task | `/smith` → `plugins/fpl-skills/skills/smith/routing-map.md` (14 rows) |
| how to author an agent | `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` |
| the rules I must follow | `CLAUDE.md` (discipline gates + Git/PR + version-bump) |
| cross-CLI / MCP wiring | `AGENTS.md` §"Cross-CLI compatibility" |
| a specific agent's behavior | `plugins/<pack>/agents/<agent>.md` (packs in §3) |
| a skill's procedure | `plugins/<plugin>/skills/<skill>/SKILL.md` |
| a methodology instance (TDD/BMAD/SPARC/RIPER/CANVAS) | §4 above |
| validate before PR | `./scripts/validate-all-plugins.sh` |
| a PRD/RFC/ADR/EVID | `../.forgeplan/` via forgeplan MCP/CLI (§7) |
| how to add a new plugin | `CONTRIBUTING.md` + the Route→Shape→Build→Audit→Publish flow |
