---
name: migrate-from-dev-toolkit
description: One-command migration from dev-toolkit to fpl-skills. Probes installed plugins, scans CLAUDE.md and project docs for /dev-toolkit:* references, offers Mode A (side-by-side, zero risk) or Mode B (clean cut), executes the steps from docs/MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md. Triggers (EN/RU) — "migrate from dev-toolkit", "switch to fpl-skills", "переедь на fpl-skills", "переехать с dev-toolkit", "перейти на fpl-skills", "/migrate-from-dev-toolkit".
disable-model-invocation: true
allowed-tools: Read Write Edit Bash(grep *) Bash(sed *) Bash(ls *) Bash(test *) Bash(find *) Bash(cat *) Bash(command *) Bash(diff *) Bash(cp *) Bash(mv *) Bash(rm *) Bash(echo *)
---

# migrate-from-dev-toolkit — automated `dev-toolkit` → `fpl-skills` migration

Wraps the manual steps from
[`docs/MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md`](../../../../docs/MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md)
into a single guided flow. Probes the host state, scans the project for
references that need updating, asks one approval question, executes the
file-level steps, and tells the user exactly which `/plugin` commands to
run. **The skill never invokes `/plugin install` itself** — that's a
host-level operation; it only orchestrates everything around it.

---

## When to use

- User explicitly types `/migrate-from-dev-toolkit` or asks "migrate from dev-toolkit", "переедь на fpl-skills", "переехать с dev-toolkit".
- User has been using `dev-toolkit` and wants to adopt `fpl-skills`.
- User wants a guided, low-risk procedure rather than reading the migration guide and executing manually.

## When NOT to use

- The user has neither plugin installed yet — route them to `/fpl-init` instead.
- The user has only `fpl-skills` and never had `dev-toolkit` — nothing to migrate; tell them so and exit.
- The cwd is the marketplace repo or a plugin source. Migration is a project-level operation; refuse.
- The user wants to migrate something other than dev-toolkit (e.g. another plugin) — this skill is dev-toolkit-specific.

---

## Process

### 1. Orient

Probe state in parallel:

```bash
# Plugin install status
ls ~/.claude/plugins/cache/marketplaces/ForgePlan-marketplace/plugins/dev-toolkit 2>/dev/null
ls ~/.claude/plugins/cache/marketplaces/ForgePlan-marketplace/plugins/fpl-skills 2>/dev/null

# forgeplan CLI
command -v forgeplan

# Project signals
pwd
test -f CLAUDE.md && echo "CLAUDE.md present" || echo "no CLAUDE.md"
test -d .claude-plugin && echo "REFUSE: this is a plugin source" || true
test -d plugins && echo "POSSIBLY-REFUSE: marketplace?"

# References to /dev-toolkit:* anywhere in the project
grep -rn '/dev-toolkit:' --include='*.md' . 2>/dev/null | head -20
```

Decide:

| State | Action |
|---|---|
| `REFUSE: plugin source` | Refuse, route to a project repo. |
| Neither plugin installed | Route to `/fpl-init`. |
| Only fpl-skills installed (no dev-toolkit, no `/dev-toolkit:` refs) | Tell user "no migration needed" and exit. |
| dev-toolkit installed (any other state) | Continue. |

If the host doesn't have `forgeplan` CLI, **note it but don't refuse** — `fpl-skills` requires it for `/fpl-init`, but the migration itself doesn't need it. Print the install instructions and continue.

### 2. Inventory references

Build a list of files containing `/dev-toolkit:` patterns:

```bash
grep -rln '/dev-toolkit:' \
  --include='*.md' \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=.forgeplan \
  --exclude-dir=plugins \
  . 2>/dev/null
```

Then for each file, count and show a sample:

```bash
for f in $(grep -rln '/dev-toolkit:' --include='*.md' \
  --exclude-dir={node_modules,.git,.forgeplan,plugins} . 2>/dev/null); do
  echo "$f:"
  grep -n '/dev-toolkit:' "$f"
done
```

Common command renames to apply:

| Old | New |
|---|---|
| `/dev-toolkit:audit` | `/fpl-skills:audit` |
| `/dev-toolkit:sprint` | `/fpl-skills:sprint` |
| `/dev-toolkit:recall` | `/fpl-skills:restore` (note: `/recall` was renamed to `/restore` in fpl-skills) |
| `/dev-toolkit:report` | use `forge-report` skill (no `/report` command in fpl-skills) |

The `/report` case is special — there's no `/fpl-skills:report` command. Replace `/dev-toolkit:report` references with prose like "use the `forge-report` skill" since fpl-skills is skills-only (no commands directory).

### 3. Plan + ask once

Display a clear plan before taking any action:

```
migrate-from-dev-toolkit plan for $(basename "$PWD"):

  Host state:
    dev-toolkit:       ✅ installed
    fpl-skills:        ✅ installed (or "❌ not installed — you'll need /plugin install")
    forgeplan CLI:     ✅ on $PATH (or warning if missing)

  Project state:
    CLAUDE.md:         present, 4 /dev-toolkit:* references
    Other docs:        2 files with /dev-toolkit:* references
                       - docs/onboarding.md (3 refs)
                       - docs/team-conventions.md (1 ref)

  Choose migration mode:
    Mode A — side-by-side (zero risk, recommended for first-time)
      • install fpl-skills if missing
      • update /dev-toolkit:* refs to /fpl-skills:* (or to /fpl-skills:restore for /recall)
      • test /fpl-skills:audit works
      • leave dev-toolkit installed; uninstall later when comfortable

    Mode B — clean cut
      • install fpl-skills if missing
      • update /dev-toolkit:* refs
      • test /fpl-skills:audit works
      • uninstall dev-toolkit immediately

  Pick mode [A / B / cancel]:
```

If cancel — exit cleanly, no files touched.

### 4. Execute — Mode A (side-by-side)

If `fpl-skills` is not installed yet, **stop and tell the user to install it manually**:

```
Run this in Claude Code (the skill cannot run /plugin commands itself):

  /plugin marketplace update ForgePlan-marketplace
  /plugin install fpl-skills@ForgePlan-marketplace
  /reload-plugins

Once installed, re-invoke /migrate-from-dev-toolkit to continue.
```

Wait for the user to confirm they've done it (re-probe state at next invocation; idempotent).

If `fpl-skills` is already installed, proceed:

1. **Update CLAUDE.md and project doc references** (with backup):
   ```bash
   # For each file with /dev-toolkit:* refs:
   for f in $LIST; do
     cp "$f" "$f.bak.fpl-migrate"
     sed -i.tmp \
       -e 's|/dev-toolkit:audit|/fpl-skills:audit|g' \
       -e 's|/dev-toolkit:sprint|/fpl-skills:sprint|g' \
       -e 's|/dev-toolkit:recall|/fpl-skills:restore|g' \
       "$f"
     rm "$f.tmp"
   done
   ```

   **Don't auto-substitute `/dev-toolkit:report`** — leave it as a comment for the user to manually decide:
   ```bash
   # Add a hint above each /dev-toolkit:report line
   sed -i.tmp '/\/dev-toolkit:report/i\
<!-- MIGRATION NOTE: /report command is not in fpl-skills. Use the `forge-report` skill (auto-triggered or invoked by name). -->' "$f"
   ```

2. **Show the diff** for user review:
   ```bash
   for f in $LIST; do
     diff "$f.bak.fpl-migrate" "$f"
   done
   ```

3. **Smoke test** — ask the user to run `/fpl-skills:audit` (or `/fpl-skills:restore`) interactively and confirm it works.

4. **Cleanup backups** after user confirms:
   ```bash
   rm $LIST.bak.fpl-migrate 2>/dev/null
   ```

### 5. Execute — Mode B (clean cut)

Same as Mode A steps 1-3, then:

5. **Tell user to uninstall dev-toolkit**:
   ```
   Final step — run this in Claude Code:

     /plugin uninstall dev-toolkit@ForgePlan-marketplace
     /reload-plugins
   ```

6. Wait for user confirmation that uninstall succeeded. Re-probe state.

### 6. Verify

Run final checks:

```bash
# No /dev-toolkit:* refs remaining (other than /report markers)
grep -rln '/dev-toolkit:[a-z]' --include='*.md' \
  --exclude-dir={node_modules,.git,.forgeplan,plugins} . | head -5
# Should return empty (or only files with the migration note about /report)

# fpl-skills install state
ls ~/.claude/plugins/cache/marketplaces/ForgePlan-marketplace/plugins/fpl-skills 2>/dev/null

# dev-toolkit absence (Mode B only)
ls ~/.claude/plugins/cache/marketplaces/ForgePlan-marketplace/plugins/dev-toolkit 2>/dev/null
```

### 7. Report

Final summary:

```
✓ Plugin state:        fpl-skills installed (and dev-toolkit removed, in Mode B)
✓ CLAUDE.md:           N references updated to /fpl-skills:*
✓ Other docs:          M files updated, K backups removed
✓ Smoke test:          /fpl-skills:audit works
⏳ Manual review:      P /dev-toolkit:report references flagged with migration notes
                      (review them and decide whether to keep them, replace with
                      "use forge-report skill", or delete)

Next steps:
  • Run /fpl-init in any project not yet bootstrapped (creates .forgeplan/ + CLAUDE.md + docs/agents/)
  • Try /fpl-skills:research <topic> — the most under-used new skill
  • See plugins/fpl-skills/README.md for the full command list

Migration complete.
```

If anything failed in steps 1-6, the report should reflect:
- ✗ for the failed step
- backup files (`.bak.fpl-migrate`) NOT cleaned up
- explicit recovery instructions

---

## Idempotency

Re-running `/migrate-from-dev-toolkit` should be safe:
- Step 1 detects current state. If fully migrated (`fpl-skills` only, no `/dev-toolkit:` refs) → exits with "nothing to do".
- Otherwise picks up where it left off.

If a previous run left `.bak.fpl-migrate` files, the new run can:
- Offer to restore from backup (if user wants to undo)
- Offer to clean up backups (if migration was successful)

---

## Errors and recovery

| Symptom | Cause | Fix |
|---|---|---|
| `grep -r .` exits non-zero on `node_modules/` permission | Some directories are unreadable | Already excluded via `--exclude-dir`; if it still happens, narrow to `--include='*.md'` only |
| `sed -i.tmp` doesn't work on Linux without empty argument | macOS vs GNU sed difference | Use `sed -i.tmp -e '...'` consistently — the `.tmp` suffix is portable |
| User cancels mid-flow | Plan accepted but step failed midway | Stop. `.bak.fpl-migrate` files preserve original state — guide user to restore them with `for f in *.bak.fpl-migrate; do mv "$f" "${f%.bak.fpl-migrate}"; done`. |
| User forgets `/reload-plugins` after install | Plugin not visible in current session | Tell them to run `/reload-plugins` and re-invoke the skill |
| Both plugins installed for a long time | Hooks fire twice (no break, just doubled output) | Mode B (clean cut) silences this |

---

## Anti-patterns

- ❌ **Don't run `/plugin install` from inside the skill.** It's a host-level command; the skill only orchestrates around it.
- ❌ **Don't auto-substitute `/dev-toolkit:report`.** There's no `/report` command in fpl-skills — substitution would create dead references. Leave a migration note for human review.
- ❌ **Don't touch `.forgeplan/` artifacts during migration.** They're not affected by plugin changes; reading them is fine, modifying them isn't part of this flow.
- ❌ **Don't proceed without backup.** Always create `.bak.fpl-migrate` before sed-replacing. Cleanup only after user confirms.
- ❌ **Don't auto-uninstall in Mode A.** That's the entire point of Mode A — leave dev-toolkit alone.
- ❌ **Don't fabricate the smoke test result.** Ask the user to invoke `/fpl-skills:audit` (or similar) and confirm it works. The skill cannot test it itself reliably.

---

## Related

- [`docs/MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md`](../../../../docs/MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md) — narrative guide that this skill automates.
- [`/fpl-init`](../fpl-init/SKILL.md) — for projects without any plugin yet (route there if migration check finds neither plugin installed).
- [`/restore`](../restore/SKILL.md) — `/recall` was renamed to this in fpl-skills.
- [`forge-report`](../forge-report/SKILL.md) — the dev-toolkit `/report` command's underlying skill, ported in fpl-skills v1.1.0.
