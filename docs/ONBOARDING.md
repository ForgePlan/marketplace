[English](ONBOARDING.md) | [Русский](ONBOARDING-RU.md)

# Onboarding — your first hour with ForgePlan Marketplace

> The pocket guide. Get from zero to autonomous agent dispatch in 30-60 minutes.

> **Process reference**: Once you're past the basic setup, see [Process Reference (EN)](process-from-idea-to-delivery-EN.md) / [(RU)](process-from-idea-to-delivery-RU.md) - the canonical end-to-end guide covering all agent profiles, artifact kinds, and methodology routing.

## What this is

You're about to wire up three things to your Claude Code: a **marketplace** (a catalog of plugins, like a package registry for Claude), **smith** (a master-orchestrator that reads your project and tells you what to do next), and **Hindsight** (a memory layer so agents don't forget after each session ends). Together they turn Claude Code from a clever assistant into something that can run a real engineering loop.

The vocabulary in two lines:

- **forgeplan** — the artifact engine. It stores your PRDs, RFCs, ADRs, evidence, and decisions as typed structured records (not loose Markdown files). Every artifact has status, links, and a quality score.
- **smith** — a routing agent. You tell it "I want to build X" or "the prod is on fire" and it picks the right methodology (out of 14 pre-built ones), names which specialist agents to dispatch, and in what order. It never writes code itself — it routes.

Don't try to memorize this — by the end of this guide, smith will be running things and you'll see what each piece does.

## Prerequisites

- Claude Code installed (latest version recommended)
- A terminal you're comfortable in
- 30-60 minutes of focus
- (Optional) a side project to use as a sandbox — a fresh empty directory works fine

## Step 1 — Install the marketplace (1 minute)

Inside Claude Code, add the ForgePlan marketplace as a catalog source, then install the two plugins you need to start: `fpl-skills` (the flagship workflow toolkit) and `agents-pro` (which ships the `smith` agent).

```bash
# Add the catalog
/plugin marketplace add ForgePlan/marketplace

# Install the two essentials
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install agents-pro@ForgePlan-marketplace
```

After each `/plugin install`, you should see a short confirmation like `Installed fpl-skills v1.31.1` and a hint that some new slash commands are now available. Type `/` in the chat and you'll see `/smith`, `/forge-cycle`, `/audit` and others in the menu.

> [!TIP]
> If `/plugin install` says "already installed" but you don't see new commands → run `/plugin uninstall <name>` then re-install. This is a cache invalidation quirk in Claude Code; the workaround is reliable. Always re-run `/plugin install` after a `/plugin marketplace update` to pick up the new version.

## Step 2 — Set up Hindsight memory (2 minutes)

Hindsight is your **agents' long-term memory**. Facts learned in one session — design decisions, naming conventions, lessons from a tricky bug — get auto-saved and replayed before every prompt in the next session. Without it, agents start cold every time.

It runs as a small local server in Docker. No external API keys needed — Hindsight uses your Claude subscription for fact extraction.

```bash
# 1. Start the Hindsight server (one-time, runs in background)
docker run -d --name hindsight -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=claude-code \
  ghcr.io/vectorize-io/hindsight:latest

# 2. Install the plugin (wires up the auto-hooks + helper skills)
/plugin install fpl-hsmem@ForgePlan-marketplace

# 3. Verify it's healthy
/fpl-hsmem:status
```

`/fpl-hsmem:status` should print something like `bank: <your-project-name>`, `memories: 0`, `mental_models: 0`. A fresh empty bank is exactly what you want on a new project.

Three things now happen automatically:

- **Before each prompt** — relevant past learnings are pulled and silently injected as context (auto-recall)
- **After each response** — the conversation is saved if it crossed the retain threshold (auto-retain)
- **At session end** — a final flush captures whatever came up in the last few turns

You don't have to think about it. It just works.

> [!TIP]
> Each project gets its own memory bank, keyed off the current working directory. Switch to a different repo → memory automatically switches too. Banks never bleed across projects.

> [!WARNING]
> If `/fpl-hsmem:status` errors with "connection refused", the Docker container isn't running. Check with `docker ps | grep hindsight`. If it's missing, re-run the `docker run` command from above.

## Step 3 — Your first project (5 minutes)

Time to actually use it. Pick a directory — empty or with some code already — and let smith bootstrap your forgeplan workspace.

```bash
# Create a sandbox if you don't have one
mkdir my-app && cd my-app && git init

# Open Claude Code in this directory, then in the chat:
/smith-bootstrap
```

Smith runs a short interview — no more than 5 short questions. Typical flow:

1. "What are we building?" — one sentence
2. "Who is it for?" — target user or system
3. "What does success look like?" — measurable outcome
4. "Any existing code I should look at?" — paths, or "none"
5. "Constraint or non-goal worth flagging up front?" — optional

While you answer, smith dispatches a series of specialists in the background — `brief-intake` writes the Brief, `goal-planner` drafts a PRD, `adr-architect` checks if any decision is heavy enough to need an ADR. You see one structured summary at the end, not the intermediate dispatch noise.

When it finishes you'll have:

- A `.forgeplan/` directory with your first Brief and PRD
- A `CLAUDE.md` scaffolded for the project
- A clear "next step" recommendation (usually: review the PRD, then activate it)

That's the greenfield path. If you already had code in the directory, smith would have routed you to a brownfield onboarding instead (Strangler Fig + DDD), but you'd still answer roughly the same questions.

> [!IMPORTANT]
> Smith never activates artifacts or writes code itself — it routes and recommends. The actual writing is done by specialist agents under its direction. This is intentional: orchestration logic stays separate from execution. You can audit the dispatch log if anything looks off.

## Step 4 — Daily workflow

### Morning

```bash
/smith
```

Smith reads your forgeplan state — active artifacts, blocked items, stale drafts — plus recent git activity and Hindsight memory. You get a one-screen status like: "3 active PRDs, 1 stale draft (PRD-007, untouched 6 days), recommend continuing PRD-005 (currently at Audit phase) or starting Brief for the billing feature you mentioned yesterday."

### When you have a new task

```bash
/smith-plan "<task description>"
```

Two real examples:

```bash
# A feature
/smith-plan "add Stripe webhook handler with retry-with-backoff and idempotency"
# → Row 3 (new feature in existing service). Methodology: SPARC + Hexagonal.
#   Dispatch: specification → architecture → coder → tester → code-reviewer → guardian.

# A bug
/smith-plan "users report intermittent 504 on the /sync endpoint, started yesterday"
# → Row 4 (non-trivial production bug). Methodology: RIPER-5 + 5 Whys.
#   Dispatch: debugger → coder → tester → guardian. Evidence: reproducer + root cause.

# A design system → code port
/smith-plan "port the Pencil design system to Storybook + React/Vue/Svelte wrappers"
# → Row 14 (design system to code). Methodology: CANVAS (hook-gate=Yes — tokens before code).
#   Dispatch: canvas-coordinator → designer → guardian/tester → porter-storybook → coder → porter-framework.
```

Smith picks **exactly one** of the 14 methodology rows — it doesn't blend them. The output is a structured plan you can read in 30 seconds.

### When the prod is on fire

```bash
/smith-plan "API returning 500 on /checkout, customers can't pay"
```

This hits row 12 (live incident). You get a two-phase response:

- **Phase 1 — stabilize**: rollback / kill switch / feature flag — whatever stops the bleeding fastest. Smith names which agent to dispatch first.
- **Phase 2 — post-mortem**: only after stable, run the blameless 5 Whys, produce an EVIDENCE artifact, decide if it warrants an ADR.

You stay in command; smith just removes the "what do I dispatch first" hesitation.

### Overnight autonomy

```bash
/autorun
```

Set this running before bed. It picks unblocked artifacts from your forgeplan graph, drives each through the full pipeline (Brief → Shape → Build → Audit → Evidence → Activate), and stops only when (a) everything is closed, (b) it hits a `NEED_USER_INPUT` sentinel, or (c) a security gate flags a critical finding. In the morning, `/smith` gives you the handoff summary.

> [!WARNING]
> `/autorun` is autonomous but bounded — it cannot push to `main`, cannot deploy, cannot merge PRs. It works on artifacts and feature branches only. Cross-system effects still need your hand.

## Step 5 — Command cookbook

If you want to do X, run Y:

| Situation | Command | What happens |
|---|---|---|
| I just opened a session, what do I do? | `/smith` | Status + recommend next step |
| I'm starting from zero on a new repo | `/smith-bootstrap` | Greenfield onboarding interview |
| I have a task in mind | `/smith-plan "<task>"` | Plan + dispatch sequence + methodology |
| Compare BMAD vs SPARC vs other | `/smith-routing` | Educational walkthrough of all 14 rows |
| Standard cycle: feature → activate | `/forge-cycle <PRD-NNN>` | Reactive 4-layer enforcer through to activation |
| Run everything that's unblocked | `/autorun` | Autonomous loop until done or blocked |
| Audit code or sprint | `/audit` | Multi-expert parallel review (4-6 agents) |
| What's blocking me? | `/forge-progress` | Real-time per-artifact progress |
| Clean up stale drafts | `/forge-cleanup` | Health restore, removes orphan drafts |
| Review a PR | `/code-review` or `/audit <branch>` | Critical review with findings |
| 4-Layer pipeline coverage check | `/methodology-check <ID>` | Per-layer score + concrete gaps |
| Make an architecture decision | `/decision <topic>` | ADR-light or full, with delta-spec |
| Supersede an old ADR | `/supersede ADR-NNN` | Delta-spec workflow (ADDED/MODIFIED/REMOVED) |
| Track decay (issues, dates, metrics) | `/decay-watch` | Trigger scanner for deferred items |
| End of session — save context | `/smith handoff` | Summary for next time |

Each command has a longer description in [USAGE-GUIDE.md](USAGE-GUIDE.md). Bookmark that file — it's the reference you'll return to.

## Step 6 — When you're needed (and when you're not)

The system is designed so that you are needed only at decision points. Routine engineering work happens without you. Here's the clear line:

| You ARE needed | You are NOT needed |
|---|---|
| Brief: what / who / success criteria | Brief → PRD conversion (auto) |
| Methodology tie-break (`NEED_USER_INPUT`) | Routing when the row is clear (auto) |
| Business priority calls | Decomposition into tasks (auto) |
| Production deploy approval | Local CI / lint / test runs (auto) |
| Security gate on critical findings | OWASP / STRIDE pre-scans (auto) |
| Merging a PR | Code review + smoke tests (auto) |
| Account / billing / vendor decisions | Plugin install / config updates (auto) |
| Architectural one-way doors (irreversible) | Reversible refactors (auto) |
| Mid-task pivot or scope change | Routine fix / feature / refactor (auto) |

Rule of thumb: smith stops to ask you only when (a) routing is a genuine tie, (b) it's a business decision, (c) a security or compliance gate trips, or (d) an external action is needed (merge / deploy / billing). Otherwise it works and reports.

## Step 7 — If something goes wrong

A short troubleshooting list of the things you'll most likely hit in the first week.

**`forgeplan` command not found**

The forgeplan CLI is separate from the plugin and ships from a different repo. Install it once globally and verify:

```bash
# Install per the forgeplan README; then:
forgeplan --version
```

The plugin uses the MCP server (no CLI needed for most flows), but a few skills shell out to the CLI for journal / activity stats.

**`/smith` doesn't respond or is missing**

Check the plugin is enabled:

```bash
/plugin list
```

`agents-pro` and `fpl-skills` should both show as enabled. If one is missing, `/plugin install <name>@ForgePlan-marketplace` again. If they're listed but commands still don't appear, restart Claude Code.

**Hindsight isn't recalling anything**

```bash
/fpl-hsmem:status
/fpl-hsmem:diagnose
```

`diagnose` runs a 6-step check — server reachable, bank exists, hooks wired, opt-out file absent, MCP block in `.mcp.json`, recent retain activity. The output names the broken step.

**`/smith-plan` classifies the wrong context**

Refine the task description with more specifics — what's already there, what's the constraint, what does "done" look like. If two rows still genuinely tie, smith will surface a `NEED_USER_INPUT` block asking you to pick. That's the design — methodology cocktails are forbidden.

**Agent says "I don't have permission to do X"**

Expected. The orchestrator (Profile B) and most reviewers are read-only by design — they audit, they don't mutate. The follow-up dispatch picks a Profile A creator or Profile C-coder which does have write permission. Don't try to "fix" the permission; check what agent you actually dispatched.

**CI fails with HTTP 403 / "account suspended"**

That's a GitHub account-level issue, not a code or pipeline issue. Contact GitHub support. The marketplace CI workflow can't help here.

> [!TIP]
> When stuck, try `/smith` with no arguments. Whatever state you're in, it will read the situation and propose a concrete next step. It's the universal "where am I" button.

## Where to go next

- Deeper reference: [GETTING-STARTED-E2E.md](GETTING-STARTED-E2E.md) — the longer walkthrough with every flag explained
- Detailed command reference: [USAGE-GUIDE.md](USAGE-GUIDE.md) — what each command does, with real examples
- How smith picks methodologies: [SMITH.md](SMITH.md) + [METHODOLOGIES.md](METHODOLOGIES.md)
- Architecture mental model: [ARCHITECTURE.md](ARCHITECTURE.md)
- Use-case matrix (when to use what): [PLAYBOOK.md](PLAYBOOK.md)
- Cross-CLI manifest (Gemini, Codex, Goose): [../AGENTS.md](../AGENTS.md)

## Credits & License

Friendly onboarding guide for the ForgePlan marketplace. MIT license. Built on top of [Hindsight](https://github.com/vectorize-io/hindsight) and the [Claude Code](https://docs.claude.com/claude-code) plugin platform.
