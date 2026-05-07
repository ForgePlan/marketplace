[English](MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md) | [Русский](MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS-RU.md)

# Migration: `dev-toolkit` → `fpl-skills`

A 15-minute, low-risk migration guide. Read it once, decide, then execute. **No `forgeplan` artifacts are touched, no code is changed**, only your local Claude Code plugin set and any references to it in your project's `CLAUDE.md`.

> [!IMPORTANT]
> Don't tell Claude "migrate me from dev-toolkit to fpl-skills" without first reading this guide. Claude can do most of the steps but the **scope of changes** is the part that matters — once you understand it, the actual execution is mechanical.

---

## TL;DR

- `fpl-skills` is a superset of `dev-toolkit` — same `/audit` and `/sprint`, plus 13 more skills, plus `/fpl-init`.
- The migration is **side-by-side compatible**: install `fpl-skills`, verify it works, then uninstall `dev-toolkit` (or keep both during a transition).
- Slash command names overlap (`/audit`, `/sprint`). Claude Code resolves the conflict by namespacing: `/dev-toolkit:audit` vs `/fpl-skills:audit`. Your project `CLAUDE.md` may reference the namespaced form — those references need updating.
- Your `.forgeplan/` directory and any artifact you produced with `forgeplan` are **untouched**.
- Rollback = `/plugin install dev-toolkit@ForgePlan-marketplace`. The plugin is still in the catalog (soft-deprecated, not removed).

---

## What stays the same

| | dev-toolkit | fpl-skills |
|---|---|---|
| `/audit` (multi-expert review) | ✅ | ✅ same name |
| `/sprint` (wave-based execution) | ✅ | ✅ same name |
| `/recall` (session restore) | ✅ `/recall` | ✅ renamed to `/restore` (see below) |
| `/report` (structured report) | ✅ | ⏳ not yet ported — install `dev-toolkit` alongside if you rely on it |
| Safety hooks (block destructive git/bash) | ✅ | ✅ |
| Test reminder hook | ✅ | ✅ |
| `dev-advisor` agent | ✅ | ⏳ not ported — fpl-skills has its own advisors |

## What's different

| | dev-toolkit | fpl-skills |
|---|---|---|
| Total commands | 4 | **15** |
| `/fpl-init` (project bootstrap) | — | ✅ NEW |
| `/research` (5-agent parallel) | — | ✅ NEW |
| `/refine` (interview-driven plan polishing) | — | ✅ NEW |
| `/diagnose` (6-phase debug loop) | — | ✅ NEW |
| `/autorun` (overnight autopilot) | — | ✅ NEW |
| `/do` (interactive autopilot) | — | ✅ NEW |
| `/build` (execute IMPLEMENTATION-PLAN.md) | — | ✅ NEW |
| `/rfc` (create/read/update RFCs) | — | ✅ NEW |
| `/briefing` (tracker overview) | — | ✅ NEW |
| `/setup` (docs/agents wizard) | — | ✅ NEW |
| `/bootstrap` (CLAUDE.md template) | — | ✅ NEW |
| `/team` (multi-agent foundation) | — | ✅ NEW |
| Forgeplan CLI required | NO | **YES** |

`fpl-skills` requires the [`forgeplan`](https://github.com/ForgePlan/forgeplan) CLI on `$PATH`. If you can't install it, **stay on `dev-toolkit`** — the deprecation is soft and the plugin is still maintained for backward compatibility.

---

## Risk assessment — what could go wrong?

Honest list of failure modes, all easily reversible:

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `/audit` or `/sprint` invocation in `CLAUDE.md` references the wrong namespace after migration | High | Low — command still resolves; might be ambiguous | Update references with `sed`. See [step 4](#step-4--update-claudemd-references). |
| Habit of typing `/recall` (dev-toolkit) instead of `/restore` (fpl-skills) | High | Low — Claude understands intent | Either keep dev-toolkit as backup or remember the rename. Both can coexist. |
| Installation order matters for hooks (PreToolUse:Bash collision) | Low | Low — hooks chain harmlessly per [USAGE-GUIDE.md](USAGE-GUIDE.md#hook-behavior) | If you keep both plugins, dev-toolkit hook runs first; fpl-skills detects and skips. |
| `.forgeplan/` artifacts get touched | **Zero** | — | The migration doesn't run `forgeplan` commands. |
| Local code changes happen | **Zero** | — | The migration is plugin-only. |
| `/fpl-init` accidentally re-runs in an initialized project | Low | Zero — idempotent, exits with "already initialized" | None needed. |

The only genuinely "risky" scenario is **installing fpl-skills without forgeplan CLI** — `/fpl-init` will refuse with install instructions, but `/audit` and `/sprint` work without forgeplan. So even that fails safely.

---

## Migration steps

### Step 1 — Decide your migration mode

Pick one:

**Mode A — Side-by-side (zero risk).** Install `fpl-skills`, keep `dev-toolkit`. Use `fpl-skills` commands; if anything goes wrong, `dev-toolkit` is still there. After a week or two, uninstall `dev-toolkit`. Recommended for first-time migrators.

**Mode B — Clean cut.** Install `fpl-skills`, immediately uninstall `dev-toolkit`. Faster, but no fallback if you hit a blocker. Recommended once you've used `fpl-skills` on at least one other project.

> [!TIP]
> If you have project-level `CLAUDE.md` files referencing `/dev-toolkit:audit` etc., **prefer Mode A** — gives you time to update references without breaking workflows.

### Step 2 — Install `fpl-skills`

In any Claude Code session:

```
/plugin marketplace update ForgePlan-marketplace   # pull latest catalog
/plugin install fpl-skills@ForgePlan-marketplace
/reload-plugins
```

Verify with `/fpl-skills:audit` (namespaced form to disambiguate from dev-toolkit's `/audit`). If you see the audit launch — installation succeeded.

> [!NOTE]
> If you don't have the `forgeplan` CLI installed, do that first:
> `brew install ForgePlan/tap/forgeplan` or `cargo install --git https://github.com/ForgePlan/forgeplan forgeplan-cli`. Without it, `/fpl-init` refuses (the other commands still work).

### Step 3 — Test on one project

Pick a real but non-critical project. In Claude Code (in that project's directory):

```
/fpl-skills:audit          # verify audit works against your codebase
/fpl-skills:restore        # verify session restore (replacement for /recall)
/research <some topic>     # verify a brand-new fpl-skills feature
```

If all three return reasonable output — the migration is safe. If anything errors, see [Troubleshooting](#troubleshooting) below.

### Step 4 — Update `CLAUDE.md` references

If your project's `CLAUDE.md` references namespaced dev-toolkit commands (this is common):

```markdown
- `/dev-toolkit:sprint` — adaptive sprint
- `/dev-toolkit:audit` — multi-expert parallel review
- `/dev-toolkit:recall` — session-context restore
- `/dev-toolkit:report` — card-based reports
```

Rewrite to fpl-skills form:

```markdown
- `/fpl-skills:sprint` — wave-based execution (Tactical/Standard/Deep)
- `/fpl-skills:audit` — multi-expert review (≥4 reviewers)
- `/fpl-skills:restore` — session-context restore (was `/recall` in dev-toolkit)
- `/dev-toolkit:report` — card-based reports (kept; not yet ported to fpl-skills)
```

Quick `sed` for the common replacements:

```bash
# In your project root, dry-run first:
grep -rn '/dev-toolkit:' --include='*.md' .

# Then apply:
sed -i.bak 's|/dev-toolkit:sprint|/fpl-skills:sprint|g; s|/dev-toolkit:audit|/fpl-skills:audit|g; s|/dev-toolkit:recall|/fpl-skills:restore|g' \
  CLAUDE.md docs/**/*.md  # adjust paths to your project

# Review with git diff, then:
rm CLAUDE.md.bak docs/**/*.md.bak
git add -p && git commit -m "chore: migrate dev-toolkit slash command refs to fpl-skills"
```

`/dev-toolkit:report` stays — `fpl-skills` hasn't ported the report skill yet. If you remove `dev-toolkit` and need `/report`, the [`forge-report`](https://github.com/ForgePlan/marketplace/tree/main/plugins/dev-toolkit/skills/forge-report) skill will move to fpl-skills in a future minor version.

### Step 5 — (Mode B only) Uninstall `dev-toolkit`

After 1-2 sessions of comfortable `fpl-skills` use:

```
/plugin uninstall dev-toolkit@ForgePlan-marketplace
/reload-plugins
```

Or — if you opted for Mode A and now want the cleanup — same commands, just delayed.

### Step 6 — (Optional) Run `/fpl-init` on the project

If your project doesn't yet have `.forgeplan/` and `docs/agents/` (i.e. you've been using dev-toolkit only without forgeplan):

```
/fpl-init
```

This is the **only step that touches files** — it creates `.forgeplan/`, `CLAUDE.md`, `docs/agents/`, `.mcp.json`. Safe to skip if you're not adopting forgeplan.

---

## Rollback

Reverse migration is one command:

```
/plugin install dev-toolkit@ForgePlan-marketplace
/reload-plugins
```

If you also want to remove `fpl-skills`:

```
/plugin uninstall fpl-skills@ForgePlan-marketplace
```

`/fpl-init`-created files (`.forgeplan/`, `docs/agents/`, the rendered `CLAUDE.md`) stay — they're useful regardless of which plugin you have installed. Removing them is a separate decision (`rm -rf .forgeplan/`, etc.) and **not part of rollback**.

---

## Troubleshooting

### "I see `/audit` in the palette twice"

Both plugins ship `/audit`. Claude Code namespaces them as `/dev-toolkit:audit` and `/fpl-skills:audit`. Use the namespaced form, or uninstall one of them.

### "Hook output is doubled"

If both plugins are installed, both safety hooks run on `PreToolUse:Bash`. The fpl-skills hook detects dev-toolkit and short-circuits, but you may briefly see two hook prints. Uninstall dev-toolkit to silence.

### "`/fpl-init` refuses with 'forgeplan CLI not found'"

Install the CLI:

```bash
brew install ForgePlan/tap/forgeplan
# or
cargo install --git https://github.com/ForgePlan/forgeplan forgeplan-cli
```

Then re-run `/fpl-init`.

### "After uninstall, `/recall` returns 'unknown command'"

`/recall` is dev-toolkit only — fpl-skills calls it `/restore`. Update your habit and `CLAUDE.md` references.

### "I want both `/recall` and `/restore` for muscle memory"

You can keep `dev-toolkit` installed indefinitely. The deprecation is informational (a flag in plugin.json), not enforced. Catalog v2.0 will eventually remove it, but that's not for at least a minor version cycle (~6 months).

### "I have CI scripts referencing `/audit`"

CI doesn't invoke slash commands. Slash commands run inside an interactive Claude Code session. If your CI runs `claude` headlessly, it'd be invoking by the namespaced form anyway, which still works.

### "Hindsight memory mentions dev-toolkit decisions — should I update?"

No. Hindsight memory records *what was true at a point in time*. Old decisions that referenced dev-toolkit are still valid as historical context. Only update memory if the *current* recommendation has changed.

---

## What this migration does NOT change

To set expectations:

- **Your `.forgeplan/` directory** — not touched.
- **Your project's `CHANGELOG.md`, `package.json`, source code** — not touched.
- **Existing forgeplan artifacts (PRDs, ADRs, etc.)** — not touched.
- **Other Claude Code plugins** (laws-of-ux, fpf, agent packs) — not touched.
- **MCP servers** — not modified (forgeplan MCP gets wired only by `/fpl-init` if you opt in).

The migration is purely about **which plugin provides `/audit`/`/sprint`/etc.** in your Claude Code sessions, plus the optional bonus of bootstrapping a forgeplan workflow if you want one.

---

## Why migrate at all?

If `dev-toolkit` works for you and you don't need any of `fpl-skills`'s 11 additional commands or forgeplan integration — **don't**. Soft deprecation means the plugin keeps working.

Migrate when one of these applies:

- You've started (or want to start) using `forgeplan` for artifact lifecycle.
- You want `/research`, `/refine`, `/diagnose`, or `/autorun`.
- You're starting a new project and want `/fpl-init` to wire everything in one shot.
- A new team member asks "what's our setup?" — `fpl-skills` is the documented standard going forward.

---

## See also

- [DEVELOPER-JOURNEY.md](DEVELOPER-JOURNEY.md) — narrative onboarding "From Zero to Shipping" (the destination of this migration).
- [USAGE-GUIDE.md](USAGE-GUIDE.md) — reference manual for fpl-skills' 15 commands.
- [`plugins/fpl-skills/README.md`](../plugins/fpl-skills/README.md) — full plugin documentation.
- [`plugins/dev-toolkit/README.md`](../plugins/dev-toolkit/README.md) — current state of dev-toolkit (deprecated, but kept).
- [ARCHITECTURE.md § Plugin Map](ARCHITECTURE.md#plugin-map) — where each plugin sits in the 4-system mental model.
