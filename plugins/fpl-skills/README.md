[English](README.md) | [Русский](README-RU.md)

# fpl-skills

> Flagship workflow plugin for the [ForgePlan](https://github.com/ForgePlan/forgeplan) ecosystem. One install bundles 15 engineering skills built on top of forgeplan's artifact lifecycle.

Install `fpl-skills` + the `forgeplan` CLI and you have everything you need for the full **route → shape → build → audit → activate** loop. Replaces the older `dev-toolkit` plugin (which is now soft-deprecated).

> [!WARNING]
> Requires the [`forgeplan`](https://github.com/ForgePlan/forgeplan) CLI on your `$PATH`. Install via `brew install ForgePlan/tap/forgeplan` or `cargo install --git https://github.com/ForgePlan/forgeplan forgeplan-cli`.

## Quick Start

```bash
/plugin install fpl-skills@ForgePlan-marketplace   # install
/fpl-init                                          # bootstrap a project (one-shot)
/restore                                           # any subsequent session
```

For a fresh repo from zero see [`GETTING-STARTED.md`](./GETTING-STARTED.md).

## Usage Examples

### `/fpl-init` — one-command project bootstrap

```
> /fpl-init

fpl-init plan for my-new-project:
  • forgeplan init                    ← .forgeplan/ missing
  • wire .mcp.json                    ← add forgeplan MCP server
  • wire .claude/settings.json        ← add forgeplan PreToolUse safety hook
  • /bootstrap                        ← create CLAUDE.md from template (stack-detected)
  • /setup                            ← interactive wizard for docs/agents/

Companion plugins to consider after (NOT installed by this command):
  fpf, agents-core, forgeplan-workflow, forgeplan-orchestra
  laws-of-ux (only if this repo has frontend)

Proceed? [y/n]
```

End-to-end with one confirmation. Verifies with `forgeplan health`, prints the next-steps block.

### `/research` — deep multi-agent research

```
> /research streaming uploads vs presigned URLs

Spawning 5 parallel agents...

Code         ████████████  4 findings   (existing upload paths in src/api/)
Docs         ██████░░░░░░  2 findings   (no ADR yet — design space open)
Status       ████████░░░░  3 findings   (issue #87, RFC-014 in flight)
References   ████████████  6 findings   (S3, GCS, Cloudflare R2 patterns)
Memory       ██████░░░░░░  2 findings   (prior decision in PRD-024)

Synthesis written to research/reports/uploads/REPORT.md
Next: /refine to lock terminology, then /rfc create
```

### `/audit` — multi-expert code review

```
> /audit

Launching reviewers (4 base + ux-reviewer because this PR touches frontend)...

Logic           ████████░░  3 findings
Architecture    ████████████  0 findings
Types           ██████████  2 findings (1 HIGH)
Security        ████████░░  4 findings
UX              ██████░░░░  2 findings (Hick's Law on the new menu)

11 findings: 1 HIGH, 5 MEDIUM, 5 LOW
Fix HIGH issues now? [y/n]
```

## What's Included

| Component | Description |
|-----------|-------------|
| `/fpl-init` | One-command bootstrap: forgeplan init, MCP wiring, CLAUDE.md, docs/agents/. Start here on any new repo. |
| `/research` | 5-agent parallel research (code · docs · status · references · memory) → `research/reports/`. |
| `/refine` | Interview-driven refinement of plans/RFCs — sharpens terminology, surfaces contradictions, lazy-creates CONTEXT.md/ADRs. |
| `/rfc` | Create / read / update RFCs and ADRs (canonical structure, phase progress, ADR format). |
| `/sprint` | Wave-based feature execution with strict file ownership and inter-wave dependencies. |
| `/audit` | Multi-expert code review (≥4 reviewers — logic, architecture, types, security; +ux-reviewer if installed). |
| `/diagnose` | 6-phase disciplined debug loop. Phase 1 ("build a feedback loop") is the entire skill. |
| `/autorun` | Autopilot orchestrator — research → sprint → audit → report end-to-end. For overnight runs. |
| `/do` | Interactive variant of `/autorun` (pauses for approval at each step). |
| `/build` | Execute an existing IMPLEMENTATION-PLAN.md from a research report (wave-by-wave). |
| `/restore` | Session-context recall from git + working copy + (optional) persistent memory. |
| `/briefing` | Daily morning briefing of tasks/messages from your tracker (Orchestra/Linear/Jira/GitHub) or local TODO files. |
| `/setup` | Interactive wizard that configures the current project for fpl-skills (writes `docs/agents/*.md`). |
| `/bootstrap` | Drops the universal CLAUDE.md template into a new or existing project (stack-aware). |
| `/team` | Foundation for multi-agent teams — TeamCreate vs sub-agents, file ownership, recipes, cleanup. |
| **SessionStart hook** | Probes `.forgeplan/`, `docs/agents/`, `CLAUDE.md` and prints a context-aware next-step hint. |

## Lifecycle integration

Every skill delegates artifact lifecycle to `forgeplan`:

| Phase | Skill | What it produces |
|-------|-------|-------------------|
| Observe | `/restore`, `/briefing`, SessionStart hook | Branch/PR snapshot, tracker overview, blind-spot dashboard |
| Route | `/fpl-init`, `/setup` | Decide depth (Tactical/Standard/Deep/Critical) |
| Shape | `/refine`, `/rfc`, `/research` | PRD, RFC, ADR, Evidence drafts |
| Build | `/sprint`, `/build`, `/do`, `/autorun`, `/team` | Implementation with file-ownership and waves |
| Prove | `/audit`, `/diagnose` | Multi-expert reviews, 6-phase debug evidence |
| Ship | (forgeplan CLI directly) | `forgeplan activate <id>`, `gh pr create` |

## Companion plugins

Print-and-paste, never auto-installed by `/fpl-init`:

| Plugin | When to add |
|---|---|
| [`fpf`](../fpf/) | First Principles Framework — pairs with `/refine` and `/diagnose` for hypothesis generation. |
| [`agents-core`](../agents-core/) | 11 baseline subagents — `/audit` and `/sprint` use them when present. |
| [`forgeplan-workflow`](../forgeplan-workflow/) | Tighter forgeplan-only loop via `/forge-cycle` and `/forge-audit`. Compatible with fpl-skills. |
| [`forgeplan-orchestra`](../forgeplan-orchestra/) | Multi-session coordination via `/sync` and `/session`. |
| [`laws-of-ux`](../laws-of-ux/) | Frontend reviewer — `/audit` will spawn `ux-reviewer` when changesets are frontend-heavy. |
| [`dev-toolkit`](../dev-toolkit/) | **Deprecated**, superseded by `fpl-skills`. Don't install both. |

## Resource guides

Two reference docs ship inside the plugin (`skills/bootstrap/resources/guides/`):

- [`CLAUDE-MD-GUIDE.ru.md`](skills/bootstrap/resources/guides/CLAUDE-MD-GUIDE.ru.md) — why `CLAUDE.md` is structured the way it is (U-curve attention, ≤7 red lines, primacy/reference/recency zones).
- [`FORGEPLAN-SETUP.md`](skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md) — canonical `.forgeplan/` setup contract: gitignore, secrets layout (12-factor `api_key_env` pattern), env var overrides, anti-patterns.

## Credits

Built on top of [`forgeplan`](https://github.com/ForgePlan/forgeplan) and the [Claude Code](https://claude.com/claude-code) plugin v2 schema. Skills adapted in part from [mattpocock/skills](https://github.com/mattpocock/skills) (engineering/diagnose, engineering/grill-with-docs).

## License

MIT
