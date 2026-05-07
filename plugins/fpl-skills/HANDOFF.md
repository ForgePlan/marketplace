# fpl-skills — handoff for the next session

This document is meant to be loaded at the start of a new Claude Code session
working on this plugin (e.g. `cd ~/Work/Skills/forgeplan-marketplace`,
`claude`, then paste this file or reference it). It captures everything the
next session needs to continue the work without re-reading the chat log.

> Generated 2026-05-07 by the session that migrated fpl-skills from
> `~/Work/ExtraBoostLessons/CC-templates` (the "lab") into this marketplace.

---

## Where you are

**Repo**: `~/Work/Skills/forgeplan-marketplace` (the ForgePlan marketplace
monorepo — this is the publish location, not the lab).

**Branch**: `feat/fpl-skills-plugin` — created for the migration commit
(`5a54d23`). Not yet pushed; not yet PR'd.

**This plugin**: `plugins/fpl-skills/` — 14 skills, plugin manifest, hooks,
README. Validated by the marketplace's local validator
(`scripts/validate-all-plugins.sh` reported `OK: fpl-skills validated` and
`No command collisions`).

---

## What was done before this session (history outside this repo)

The plugin was authored in a separate "lab" repo
(`~/Work/ExtraBoostLessons/CC-templates`) over 14 commits. The lab was
created to iterate quickly on skill content without bouncing PRs through the
marketplace for every edit. Notable history (not preserved as commits in
this repo, only as a single import commit):

- Renamed skills from descriptive names (multi-agent-research, wave-sprint-execution,
  task-orchestrator, agent-team-orchestration, daily-briefing, restore-context,
  rfc-document, multi-expert-audit, build-from-research,
  bootstrap-claude-project, setup-cc-templates) to short imperative names
  (research, sprint, do, team, briefing, restore, rfc, audit, build, bootstrap,
  setup). 11 renames, all cross-references updated, no build-time collisions.
- De-genericified: skills no longer hardcode `apps/pipeline/...`, `@gerts/...`,
  pnpm filters, etc. Project-specific config now lives in `docs/agents/*.md`
  written by /setup at project setup time. Skills read via `@docs/agents/...`
  imports.
- Translated all SKILL.md and reference templates from Russian to English
  while preserving bilingual triggers (Russian phrases inside quoted strings
  in `description:` and "When to use" examples — these are user-input
  matchers, not prose).
- Added three new skills adapted from mattpocock/skills: `/refine` (was
  grill-with-docs), `/diagnose` (6-phase debug loop), `/autorun` (autopilot
  orchestrator with red-line stops and ADI on blockers).
- Wrote a universal CLAUDE.md template with stack-detection
  ({{IF_LANG_TS}}, {{IF_LANG_RS}}, {{IF_LANG_PY}}, {{IF_LANG_GO}}, plus
  {{IF_MONOREPO}}, {{IF_PUBLIC_PACKAGE}}, {{IF_PRE_COMMIT_HOOK}}).
  /bootstrap renders it.
- Wrote scripts/build-fpl-skills.sh (in the lab) which originally copied
  files lab → marketplace; obsolete now that we live here directly.

The lab repo (CC-templates) remains. After this migration it holds only
personal authoring history, the original Russian guides under guides/ (with
.ru.md suffix — those are intentionally Russian), and personal prompts under
prompts/ (gitignored). It's archived in spirit; mark it deprecated in the
lab's README.

---

## Plan that's still in motion

A 5-phase plan was agreed in the previous session. Two phases are done; three
remain:

### ✅ Phase 1 — plugin skeleton (done in lab, migrated here)
- `.claude-plugin/plugin.json` declaring 14 skills, forgeplan as required CLI,
  `supersedes: dev-toolkit (<=1.6.1)`.
- `hooks/hooks.json` + `hooks/scripts/session-start.sh` for SessionStart greet.
- `README.md` describing the plugin.

### ✅ Phase 2 — universal CLAUDE.md template (done in lab, migrated here)
- `skills/bootstrap/resources/templates/CLAUDE.md.template` — full template
  with conditional blocks.
- `skills/bootstrap/SKILL.md` — updated with stack-detection step (Step 3 in
  the workflow), placeholder mapping table, and conditional-block rules.

### ⏳ Phase 3 — `/fpl-init` skill (NEXT)
One-command project setup. New skill `skills/fpl-init/SKILL.md` that wraps:

1. Probe `forgeplan` in `$PATH`. If absent: refuse with install instructions
   (`brew install ForgePlan/tap/forgeplan` or
   `cargo install --git https://github.com/ForgePlan/forgeplan forgeplan-cli`).
2. If `.forgeplan/` doesn't exist, run `forgeplan init` (non-interactive: `-y`).
3. Wire `.mcp.json` (add a `forgeplan` server entry). Don't overwrite an
   existing entry; merge instead.
4. Wire `.claude/settings.json` (PreToolUse hook for forgeplan safety, if
   not present already). Merge, don't overwrite.
5. Run `/bootstrap` flow (CLAUDE.md from template with stack detection).
6. Run `/setup` flow (interactive wizard for `docs/agents/*.md`).
7. Recommend companion plugins (fpf, laws-of-ux if frontend, agents-core,
   forgeplan-workflow, forgeplan-orchestra). Don't install — just print
   commands.
8. Verification: `forgeplan health`, `ls docs/agents/`, `cat CLAUDE.md | head -20`.
9. Print "Next steps: try /research, /refine, /sprint, /audit, /autorun".

Add `fpl-init` to plugin.json `components.skills`.

Update README.md and create GETTING-STARTED.md (Phase 3 deliverable —
docs the same flow for human readers).

### ⏳ Phase 4 — marketplace publish
- Run `scripts/validate-all-plugins.sh` again after Phase 3.
- Push branch: `git push -u origin feat/fpl-skills-plugin`.
- Open PR: `gh pr create --base main --title "feat: add fpl-skills v1.0.0 plugin" --body "..."`
- After merge, the plugin is live: users get
  `/plugin install fpl-skills@ForgePlan-marketplace`.

### ⏳ Phase 5 — dev-toolkit soft sunset
- Edit `plugins/dev-toolkit/.claude-plugin/plugin.json`: add `"deprecated": true`
  and `"supersededBy": "fpl-skills"`.
- Add a deprecation note at the top of `plugins/dev-toolkit/README.md`
  pointing to fpl-skills.
- Don't remove the plugin from marketplace.json — backward compat. A future
  v2.0 release can drop it.

---

## How to start the next session (paste-friendly)

When you start `claude` in `~/Work/Skills/forgeplan-marketplace/`:

```
Continue work on the fpl-skills plugin. Branch feat/fpl-skills-plugin,
import commit 5a54d23. Read plugins/fpl-skills/HANDOFF.md for full
context. Start with Phase 3 — create the /fpl-init skill at
plugins/fpl-skills/skills/fpl-init/SKILL.md per the plan in HANDOFF.md.
```

That's enough context for the new session to understand the state.

---

## Files inventory (what's in this plugin)

```
plugins/fpl-skills/
├── HANDOFF.md                   ← this file (delete after Phase 5)
├── README.md                    ← user-facing intro + install
├── .claude-plugin/
│   └── plugin.json              ← manifest
├── hooks/
│   ├── hooks.json               ← SessionStart
│   └── scripts/session-start.sh ← prints status + next-step hint
└── skills/
    ├── README.md                ← skill folder convention notes
    ├── audit/SKILL.md
    ├── autorun/SKILL.md
    ├── bootstrap/
    │   ├── SKILL.md
    │   ├── examples/full-setup.md
    │   └── resources/
    │       ├── guides/{CLAUDE-MD-GUIDE.ru.md, GIT-FLOW-GUIDE.ru.md, INDEX.md.template}
    │       └── templates/CLAUDE.md.template
    ├── briefing/SKILL.md
    ├── build/SKILL.md
    ├── diagnose/SKILL.md
    ├── do/SKILL.md
    ├── refine/
    │   ├── SKILL.md
    │   └── references/{CONTEXT-FORMAT.md, ADR-FORMAT.md}
    ├── research/SKILL.md
    ├── restore/SKILL.md
    ├── rfc/SKILL.md
    ├── setup/
    │   ├── SKILL.md
    │   └── references/{BUILD-CONFIG-TEMPLATE.md, CONTEXT-TEMPLATE.md, ISSUE-TRACKER-TEMPLATE.md, PATHS-TEMPLATE.md}
    ├── sprint/
    │   ├── SKILL.md
    │   └── references/{OUTPUT-FORMATS.md, SPRINT-TEMPLATE.md}
    └── team/SKILL.md
```

14 skills, 9 reference docs, 4 bootstrap resources (2 guides + 1 INDEX
template + 1 CLAUDE.md template), 1 hook, 1 manifest.

---

## Decisions already made (don't re-litigate)

- **Plugin name**: `fpl-skills` (fits the fpl- family with forgeplan,
  forgeplan-workflow, forgeplan-orchestra).
- **Collision strategy with dev-toolkit**: declared as superseded; user
  installs one or the other.
- **SessionStart hook**: yes (already wired).
- **Companion plugins to recommend**: fpf, laws-of-ux (when frontend),
  agents-core, forgeplan-workflow, forgeplan-orchestra.
- **Guide location**: `GETTING-STARTED.md` in plugin root (Phase 3).
- **Repo strategy**: this monorepo is the home; lab archived.
- **Language**: English everywhere except .ru.md guides and bilingual
  triggers in skill descriptions.
- **forgeplan CLI is required** (declared in plugin.json `requires.cli`,
  `/fpl-init` will refuse if absent).
- **One universal CLAUDE.md template** with conditional blocks (not separate
  CLAUDE.ts.md / CLAUDE.rs.md / etc.).

---

## Open questions for the next session

These were noted but not resolved; revisit as needed:

1. **GETTING-STARTED.md format** — short (10 mins) or full walkthrough? My
   recommendation: short version in plugin README, full in GETTING-STARTED.md.

2. **`/fpl-init` and approval pauses** — should it stop and ask between
   substeps (forgeplan init / wire .mcp.json / /bootstrap / /setup) or
   run end-to-end with one final confirmation? My take: end-to-end with
   verification at the end, since each substep is itself fail-safe.

3. **Companion plugin install** — should `/fpl-init` actually run
   `/plugin install ...` for fpf/laws-of-ux/agents-core, or just print the
   commands for the user to run manually? My take: print, don't install.
   /plugin install is host-level and may need user approval anyway.

4. **dev-toolkit deprecation timing** — Phase 5 marks soft-deprecated; when
   to hard-deprecate (remove from marketplace.json)? Open. Recommend after
   one minor version cycle.

5. **Universal validate** — `scripts/validate-all-plugins.sh` worked locally
   but the CI workflow (`.github/workflows/validate-plugins.yml`) might
   have stricter checks. Run a dry CI before merging the PR.

---

## Quick verification (do this when starting the next session)

```bash
cd ~/Work/Skills/forgeplan-marketplace
git status                                  # should be: branch feat/fpl-skills-plugin, clean
git log --oneline -3                        # should show 5a54d23 at top
ls plugins/fpl-skills/skills/               # should show 14 skill folders
./scripts/validate-all-plugins.sh           # should report fpl-skills OK
python3 -c "import json; json.load(open('plugins/fpl-skills/.claude-plugin/plugin.json'))"  # should be silent (valid JSON)
```

If any of those fail — something's drifted; re-read this file and the
import commit (`git show 5a54d23`).
