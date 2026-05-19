# Getting Started — End-to-End Walkthrough

> **Audience**: New user who just discovered ForgePlan and wants to verify everything works from scratch on their own machine.
>
> **Time budget**: ~30 minutes for a full hands-on walkthrough. Skip to "Smoke results" at the bottom if you just want proof that things work.
>
> **Test environment for this guide**: macOS Darwin 25.1.0, Claude Code 2.1.143, forgeplan CLI v0.31.0, catalog v1.43.0, session 2026-05-19.
>
> **Verified state**: 68 marketplace agents 0 errors 0 warns, 100 forgeplan artifacts in test workspace, `forgeplan_health` verdict `healthy`.

---

## TL;DR — what you'll have at the end

After this walkthrough, you'll have:

1. A `.forgeplan/` workspace in your project directory (LanceDB + markdown projections)
2. A first PRD that went through the full lifecycle (draft → validate → evidence → activate, R_eff=1.0 grade A)
3. Memory wired (Hindsight) — facts retained across Claude Code sessions
4. 13 marketplace plugins installed and verified — 0 lint errors, 0 lint warnings
5. Confidence that the pipeline doesn't lie to you

---

## Prerequisites

```bash
# 1. forgeplan CLI installed
brew install forgeplan        # or download from releases
forgeplan --version            # should print 0.31.0+

# 2. Claude Code installed
# Download from https://claude.ai/download

# 3. (Optional) gh CLI for GitHub Projects integration
brew install gh && gh auth login
```

---

## Step 1 — Install marketplace plugins

In Claude Code:

```
/plugin marketplace add ForgePlan/marketplace
```

Then install the flagship plugins:

```
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install fpl-hsmem@ForgePlan-marketplace
/plugin install forgeplan-workflow@ForgePlan-marketplace
/plugin install agents-core@ForgePlan-marketplace
/plugin install agents-pro@ForgePlan-marketplace
/plugin install agents-sparc@ForgePlan-marketplace
```

**Verify** (in Claude Code, run a quick check):
- Type `/help` — you should see `/fpl-init`, `/forge-cycle`, `/forge-audit` listed
- Or check `~/.claude/plugins/marketplaces/ForgePlan-marketplace/.claude-plugin/marketplace.json` for catalog v1.43.0

> ⚠️ **Plugin cache gotcha**: if `/plugin install` says "already installed" but you don't see the latest version, run `/plugin marketplace update ForgePlan-marketplace` first. Catalog metadata version controls when updates pull.

---

## Step 2 — Bootstrap a new project

```bash
mkdir -p ~/my-project && cd ~/my-project
```

In Claude Code, in that directory:

```
/fpl-init
```

This will (one shot):

| Step | What happens |
|------|-------------|
| Probe | Checks for forgeplan CLI on `$PATH` and your existing project state |
| `forgeplan init` | Creates `.forgeplan/` with LanceDB index + 13 artifact-kind subdirs (prds/, rfcs/, adrs/, evidence/, notes/, problems/, solutions/, specs/, refresh/, discovery/, epics/, memory/, lance/) |
| `.mcp.json` | Wires `forgeplan` MCP server (and `hindsight` if you have it) |
| `.claude/settings.json` | Local Claude Code settings |
| CLAUDE.md | Universal template (via `/bootstrap` skill) |
| **Operating contract v3** | Injects the v3 marker block into CLAUDE.md — tells future agents to use forgeplan MCP-first, dispatch canonical B2 agents, and which 16/22 fpl-skills are MCP-first vs Tier B no-forgeplan |
| `docs/agents/` | Setup wizard fills in tracker / build / paths / glossary |
| Canonical layer (v2.0 step 8.5) | Scaffolds `project-agent-matrix.yaml` + `project-config.yaml` if you opt in |

**Verify**:

```bash
ls -la .forgeplan/
# should show: config.yaml, lance/, prds/, rfcs/, adrs/, evidence/, notes/, problems/, solutions/, specs/, refresh/, discovery/, epics/, memory/, .gitignore

grep -c "forgeplan-operating-contract:v3" CLAUDE.md
# should output: 1
```

---

## Step 3 — Manual CLI sanity check

Outside Claude Code, verify the raw CLI works:

```bash
cd ~/my-project
forgeplan init -y      # non-interactive; -y skips prompts
forgeplan new prd "My first feature"
forgeplan validate PRD-001
forgeplan list
```

Expected output:

```
ID       Kind  Status  Title
PRD-001  prd   draft   My first feature

  1 artifact(s) total
```

If you see this, the CLI surface works. **MCP server reuses the same `.forgeplan/` LanceDB** when launched from this directory, so artifacts created via either path are unified.

---

## Step 4 — Full lifecycle via MCP (Claude Code session)

Restart Claude Code in `~/my-project/` (so the MCP server picks up the new `.forgeplan/`).

In your conversation, ask Claude to walk you through a full pipeline. Or do it explicitly:

### 4a. Create + fill a PRD

Either dispatch the `artifact-author` agent (Profile A generic):

```
Task({
  subagent_type: "agents-pro:artifact-author",
  prompt: "Create a PRD for a sample feature 'Add user activity feed to dashboard'. Fill all MUST sections."
})
```

Or use `specification` (SPARC Profile A specialist) for stronger SMART criteria.

Or do it inline:

```
mcp__forgeplan__forgeplan_new(kind="prd", title="Add user activity feed")
mcp__forgeplan__forgeplan_update(id="PRD-002", body="<full body here>")
```

### 4b. Validate

```
mcp__forgeplan__forgeplan_validate(id="PRD-002")
```

Expected: `passed: true`, `error_count: 0`, possibly some SHOULD/COULD warnings. If you see hard errors (`MUST`), fix the body and re-validate.

### 4c. Create evidence

After whatever work proves the PRD's claims (smoke test, audit, benchmark):

```
mcp__forgeplan__forgeplan_new(kind="evidence", title="Activity feed — smoke test results")
mcp__forgeplan__forgeplan_update(id="EVID-001", body="<verdict: PASS, congruence_level: 3, evidence_type: ..., observed: ...>")
```

### 4d. Link informs (CRITICAL — not based_on)

```
mcp__forgeplan__forgeplan_link(source="EVID-001", target="PRD-002", relation="informs")
```

> 🛑 **Gotcha**: use `informs` for evidence-supports-PRD. **Don't use `based_on`** unless the PRD genuinely derives from the evidence — `based_on` incurs CL penalty in R_eff scoring. (See [forgeplan#286](https://github.com/ForgePlan/forgeplan/issues/286) for the proposed unlink primitive to fix mis-typed links.)

### 4e. Score

```
mcp__forgeplan__forgeplan_score(id="PRD-002")
```

Expected for clean evidence:
```json
{
  "r_eff": 1.0,
  "overall_grade": "A",
  "evidence": [{ "id": "EVID-001", "score": 1.0, "verdict": "Supports", "congruence_level": 3 }],
  "weakest_link": null
}
```

### 4f. Activate

```
mcp__forgeplan__forgeplan_activate(id="PRD-002")
```

Expected: `{ "artifact_id": "PRD-002", "message": "Activated PRD-002 (draft → active)" }`.

---

## Step 5 — Canonical agent dispatch (test all 5 profiles)

The marketplace ships 17 forgeplan-aware agents implementing the **B2 paradigm** (`disallowedTools` denylist + MCP propagation). Test each profile:

| Profile | Agent to try | What to ask |
|---|---|---|
| **A** Creator (generic) | `agents-pro:artifact-author` | "Create a NOTE: 'Lessons from first walkthrough'" |
| **A** Creator (kind-specialist) | `agents-pro:adr-architect` | "Create an ADR for choosing PostgreSQL over MySQL" |
| **B** Reviewer (generic) | `agents-pro:artifact-reviewer` | "Audit PRD-002 health — schema, links, freshness" |
| **B** Reviewer (kind-specialist) | `agents-core:code-reviewer` | "Review the latest diff for bugs / style / architecture" |
| **B-gate** | `agents-pro:guardian` | "Should PRD-002 be activated? Render gate verdict from EVID chain" |
| **C** Read-only | `agents-pro:research-analyst` | "What's the current state of forgeplan? Use forgeplan_health + forgeplan_list" |
| **C-coder** | `agents-core:coder` | "Read AGENT-AUTHORING-GUIDE.md and tell me the 5 profiles" |
| **D** Maintainer | `agents-pro:artifact-maintainer` | "Add a link from EVID-001 to NOTE-XXX (informs)" |

Each should:
1. Acknowledge mission
2. Use `mcp__forgeplan__*` tools (proves B2 paradigm works)
3. Stay within profile constraints (e.g., research-analyst cannot create artifacts; coder cannot mutate forgeplan)
4. Return a structured report

---

## Step 6 — Test representative fpl-skills

Run a couple of skills that exercise the MCP-first dispatch + skill chaining:

### `/briefing` — morning standup

```
/briefing
```

Expected: aggregate of overdue / today / @mentions / unread + forgeplan blind-spots + stale evidence. MCP-first per PRD-022.

### `/research` — multi-agent research

```
/research "How does our auth chain work?"
```

Expected: parallel scout agents covering code / docs / RFCs / memory; emits a report to `research/reports/auth-chain/REPORT.md`. Optionally creates a forgeplan note via MCP.

### `/sprint` — wave-based execution

```
/sprint "Build the user activity feed feature"
```

Expected: research → wave plan (5–8 agents in 2–5 waves) → approval gate → wave-by-wave dispatch via TeamCreate. At wave close, automatically emits EvidencePack via forgeplan MCP.

### `/audit` — multi-expert review

```
/audit
```

Expected: 4+ parallel reviewer agents (logic, architecture, security, tests). Records EVIDENCE artifact via MCP at completion.

---

## Step 7 — Hindsight memory wiring

If `fpl-hsmem` plugin is installed, memory tools are available:

```
# Save a fact
mcp__plugin_fpl-hsmem_hindsight__memory_retain(
  content="Decided to use Postgres for activity feed because of LISTEN/NOTIFY semantics",
  context="2026-05-19 walkthrough",
  tags=["decision", "postgres", "activity-feed"]
)

# Later, in a different session
mcp__plugin_fpl-hsmem_hindsight__memory_recall(
  query="activity feed database choice"
)
# → returns the retained content with semantic match
```

Banks are **per-project** — derived from current working directory by default. See `plugins/fpl-hsmem/CONFIGURATION.md` for the 3 activation modes.

---

## Step 8 — Health + lint final check

In the marketplace repo (if you're contributing):

```bash
./scripts/validate-all-plugins.sh
# Expected tail:
#   Scanned: 68 agents (17 forgeplan-aware, 51 legacy)
#   Errors:  0
#   Warns:   0
#   ALL PASSED
```

In your project (any time):

```
mcp__forgeplan__forgeplan_health
# Expected verdict: "healthy"
# 0 orphans, 0 stale, 0 advisory mismatches
```

---

## Common gotchas (verified during this walkthrough)

| Symptom | Cause | Fix |
|---|---|---|
| `forgeplan init` returns "Error: not connected" | Default path expects interactive TUI | Use `-y` non-interactive flag |
| `/plugin install` says "already installed" but no new version | Plugin cache stickiness (catalog version unchanged) | `/plugin marketplace update <name>` first; bump catalog metadata.version when shipping |
| MCP forgeplan tools missing in subagent context | Subagent uses `tools:` allowlist with wildcards → silently strips MCP (Anthropic bug #53865) | Use B2 paradigm — `disallowedTools` denylist instead. See `AGENT-AUTHORING-GUIDE.md` |
| Editing `.forgeplan/<kind>/*.md` frontmatter doesn't change R_eff | Markdown is a projection from LanceDB, not source of truth | Use `forgeplan_update`/`forgeplan_link` via MCP/CLI — LanceDB is canonical |
| `R_eff = 0` despite quality evidence linked | Link relation is `based_on` instead of `informs` — incurs CL penalty cascade | Use `informs` for evidence-supports-PRD. **No unlink primitive yet** — see [forgeplan#286](https://github.com/ForgePlan/forgeplan/issues/286) |
| Discover Agent works only as standalone, not as plugin | Brownfield MCP tools (9 of them) not yet in forgeplan core | Tracking: [forgeplan#287](https://github.com/ForgePlan/forgeplan/issues/287) |
| Sub-agent says it can't load `forgeplan_new` schema | Profile C/Profile B-gate-style intentionally denies forgeplan mutation tools | Working as designed — that profile shouldn't mutate. Dispatch the right profile (A for create, B for review, D for maintain) |

---

## Smoke results (this guide's verification run)

The following was executed end-to-end during this guide's authoring (2026-05-19, marketplace workspace):

### CLI smoke (in `/tmp/forge-e2e-test-*`)

| Step | Command | Result |
|---|---|---|
| 1 | `forgeplan --version` | ✅ `0.31.0` |
| 2 | `forgeplan init -y` | ✅ `.forgeplan/` created with 13 kind dirs + LanceDB |
| 3 | `forgeplan new prd "E2E test — first PRD"` | ✅ PRD-001 created |
| 4 | `forgeplan validate PRD-001` | ✅ PASS (0 errors, 3 SHOULD/COULD warnings on template stub) |
| 5 | `forgeplan list` | ✅ Lists PRD-001 |

### MCP pipeline smoke (marketplace workspace)

| Step | MCP tool | Result |
|---|---|---|
| 1 | `forgeplan_new(kind=prd)` | ✅ PRD-028 created |
| 2 | `forgeplan_update(body=...)` | ✅ Body filled with MUST sections |
| 3 | `forgeplan_validate` | ✅ PASS, 0 errors, 2 SHOULD warnings (orphan FRs/goals — acceptable for smoke fixture) |
| 4 | `forgeplan_new(kind=evidence)` + `forgeplan_update` | ✅ EVID-055 created with verdict=PASS, CL=3 |
| 5 | `forgeplan_link(EVID-055, PRD-028, informs)` | ✅ Linked |
| 6 | `forgeplan_score(PRD-028)` | ✅ **R_eff=1.0, grade A, weakest_link=null** |
| 7 | `forgeplan_activate(PRD-028)` | ✅ `draft → active`, no force |

### Agent dispatch smoke (live, in same session)

| Profile | Agent | Tools verified | Status |
|---|---|---|---|
| B-gate | `guardian` | `mcp__forgeplan__forgeplan_get`, `forgeplan_list` | ✅ Dry-run gate verdict produced, 0 tool errors |
| C read-only | `research-analyst` | `mcp__forgeplan__forgeplan_list`, `forgeplan_health` | ✅ Read access works, mutation correctly denied at protocol layer |
| C-coder | `coder` | `Read` + `mcp__forgeplan__forgeplan_get` | ✅ Source-read works; `forgeplan_new` blocked at deferred-tool list (physical denylist enforcement) |

Static B2 audit of all 17 forgeplan-aware agents (allowlist absent ✅, denylist present ✅, valid model ✅, hex color ✅, denies `forgeplan_activate` ✅): **17/17 PASS**.

### Memory plugin

```
mcp__plugin_fpl-hsmem_hindsight__memory_retain(...)
→ Saved to bank "forge-marketplace". Tokens: n/a
```

✅ Retain works. Recall + reflect tools available, bank derived per-project.

### Final state

```
./scripts/validate-all-plugins.sh
→ Scanned: 68 agents (17 forgeplan-aware, 51 legacy)
  Errors: 0, Warns: 0, ALL PASSED

mcp__forgeplan__forgeplan_health
→ verdict: "healthy", 100 artifacts total
  79 active, 13 draft, 5 deprecated, 3 superseded
  0 orphans, 0 stale, 0 advisory mismatches
```

---

## Where to go next

| If you want to... | Read |
|---|---|
| Author your own agent | `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` |
| Configure memory wiring | `plugins/fpl-hsmem/CONFIGURATION.md` + `GETTING-STARTED.md` |
| Understand the SDLC pipeline | `forgeplan_get PRD-024` (foundation), `PRD-025` (multi-agent extension), `PRD-026` (canonical agent layer) |
| Customise the agent dispatch matrix | `plugins/fpl-skills/templates/project-agent-matrix.yaml` |
| Track work in GitHub Projects | `forgeplan-marketplace/CLAUDE.md` § "GitHub Projects integration" |
| Run brownfield extraction (existing codebase) | `plugins/forgeplan-brownfield-pack/README.md` (currently standalone agent — see [forgeplan#287](https://github.com/ForgePlan/forgeplan/issues/287) for plugin migration tracking) |

---

## Known limitations (as of v2.2.0)

1. **No `forgeplan_unlink` primitive** — mis-typed link relations stay forever. Workaround: use `informs` for evidence; double-check before linking. Tracking: [forgeplan#286](https://github.com/ForgePlan/forgeplan/issues/286).
2. **Brownfield Discover Agent v3.2 is standalone**, not a `/plugin install`able plugin. Blocked on 9 new MCP tools in forgeplan core. Tracking: [forgeplan#287](https://github.com/ForgePlan/forgeplan/issues/287).
3. **MCP server cwd binding** — the forgeplan MCP server is tied to whatever workspace Claude Code launched in. Testing in a different directory via MCP writes to the launched-workspace's `.forgeplan/`, not the new dir. Restart Claude Code in the target directory. CLI doesn't have this constraint.
4. **Subagent MCP propagation** — uses `disallowedTools` denylist, not `tools:` allowlist. Wildcards in `tools:` silently strip MCP server. Already worked around in all 17 forgeplan-aware agents.

---

## Acknowledgements

This guide was authored during the v2.2.0 GA acceptance test (2026-05-19). The walkthrough mirrors the actual smoke verification, not a hypothetical scenario.

- Architectural foundation: PRD-024 (full SDLC pipeline), PRD-025 (multi-agent + cross-CLI), PRD-026 (canonical agent layer)
- Evidence trail: EVID-049..055 (PRD-026 closure + PRD-022 closure + this walkthrough)
- Tracking issues: [forgeplan#286](https://github.com/ForgePlan/forgeplan/issues/286), [forgeplan#287](https://github.com/ForgePlan/forgeplan/issues/287)
- Release: [v2.2.0](https://github.com/ForgePlan/marketplace/releases/tag/v2.2.0)

---

**Русская версия**: [`docs/GETTING-STARTED-E2E-RU.md`](GETTING-STARTED-E2E-RU.md)
