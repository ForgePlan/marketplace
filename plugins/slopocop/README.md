# slopocop

**Clear development replies and text humanization.** Palych governs working communication;
the two humanizers edit explicitly targeted prose in Russian and English. Not design or code cleanup.

## What it does

- **Communicate** — Palych keeps replies, questions and progress updates concise and technically
  precise, explains new complex terms at first use, and distinguishes changed from verified.
- **Detect** AI tells in prose (hard-banned phrases, em-dash abuse, copula avoidance, false ranges,
  rule-of-three, sycophancy, boilerplate rhythm) and score cleanliness 0–100.
- **Humanize** — rewrite AI-flat text into a specific human voice: opinion, uneven rhythm, concrete
  detail. A fact-lock forbids inventing numbers or citations.
- **Enforce** — a hook nudges you toward an audit after you write prose, and the `slop-cop` agent
  reviews text on demand.

## Components

| Kind | Name | Purpose |
|------|------|---------|
| Skill | `palych` | RU/EN development communication; requested artifacts keep their genre and depth |
| Skill | `humanizer-ru` | Russian text: 54 patterns, HARD BANS, fact-lock, deterministic `scan.py` scorer (0–100) |
| Skill | `slop-humanizer` | English text: de-slop synthesized from 5 humanizer repos |
| Command | `/slop-audit` | Read-only detection pass. Auto-routes RU/EN, runs the scanner for Russian, no rewrite |
| Command | `/slop-humanize` | Full humanization. Auto-routes RU→humanizer-ru, EN→slop-humanizer |
| Agent | `slop-cop` | Hook-triggered / on-demand prose reviewer |
| Hook | Claude `SessionStart` / Codex trusted hooks | Load Palych and persist explicit on/off commands; no per-reply audit |
| Hook | `PostToolUse:Write\|Edit\|MultiEdit` | Silent for code; hints on `.md`/`.txt`/`.mdx` edits |
| Extension | OMP `omp/palych.mjs` | Load the same core automatically after native plugin installation |
| Installer | `scripts/activate.py` | Enable the profile through any agent's explicitly selected startup instruction file |

## Install (Claude Code marketplace)

```
/plugin marketplace add ForgePlan/marketplace
/plugin install slopocop@ForgePlan-marketplace
```

## Use

### Development communication

Palych is a host-independent profile, not a Claude-specific writing style. Choose
**one** activation route below; installing a discoverable skill alone is not always-on.
All activation routes read or generate instructions from `skills/palych/SKILL.md`.

#### Any agent with startup instructions

Install the plugin payload, then run this once from the consuming project:

```bash
SLOPOCOP_PLUGIN=/path/to/installed/slopocop
python3 "$SLOPOCOP_PLUGIN/scripts/activate.py" install --instructions ./AGENTS.md
python3 "$SLOPOCOP_PLUGIN/scripts/activate.py" check --instructions ./AGENTS.md
```

Use the file **your agent actually loads**: for example `AGENTS.md`, an existing
`AGENTS.override.md` that takes precedence, `CLAUDE.md`, `GEMINI.md`, or another
Markdown startup instruction file. The installer is not tied to those filenames
or to a model/provider. It requires POSIX and Python ≥3.9 only during installation.
The resulting instructions need neither Python, skill discovery nor a plugin hook
at runtime. Start a new conversation; no repeated “load palych” request is needed.

The explicit target is required: no personal configuration is discovered or edited.
Other content and file permissions are preserved; existing files are backed up in
`.palych-backups/`. Reinstall is idempotent; edited managed blocks and linked files
are refused rather than overwritten. Re-run `install` after plugin updates; `check`
detects an outdated generated block. To disable this route for future conversations:

```bash
python3 "$SLOPOCOP_PLUGIN/scripts/activate.py" uninstall --instructions ./AGENTS.md
```

Only the managed Palych block is removed. “Turn off palych” / “Отключи Палыча” applies
to the current conversation; the instruction-file route does not implement a native
mode-state store. A client that reads neither startup instructions nor skills needs
its own supported integration; copying a plugin folder cannot force it to load rules.

#### OMP native plugin

```bash
omp plugin marketplace add ForgePlan/marketplace
omp plugin install slopocop@forgeplan-marketplace
```

The installed package declares `omp.extensions`; the extension loads Palych
automatically without calling the skill. It preserves other system instructions,
does no audit/network call, and records explicit ON/OFF on the active OMP session
branch, not in personal settings. New sessions default to ON. “Turn off palych” /
“Отключи Палыча” and “Enable palych” / “Включи Палыча” switch the current branch.
OMP controls journal persistence; its extension API does not confirm durable writes.
The extension therefore does not claim a confirmed disk save from a session filename.

For a local checkout use `omp plugin link "$SLOPOCOP_PLUGIN" --scope project`.
In OMP 18.11.1, `--plugin-dir` alone discovers Claude-style resources, **not** the
package's extension entrypoint. For a one-shot local run also pass
`--extension "$SLOPOCOP_PLUGIN/omp/palych.mjs"`, or use the startup-instruction route.
`--no-extensions` / disabling the extension prevents native activation.

#### Codex native plugin

```bash
codex plugin marketplace add ForgePlan/marketplace
codex plugin add slopocop@forgeplan-marketplace
```

Review and trust the plugin hooks through Codex `/hooks`, then start a new session.
Installation without hook trust does not establish automatic loading. The Codex
manifest selects `hooks/codex-hooks.json`; it shares the Python adapter and core
with Claude Code but keeps state in `~/.local/state/palych/codex/state.json`.
The vendored adapter has one documented fix: an enabled fork gets its own
mode-changing helper metadata without repeating the parent's core.
Requires POSIX and Python ≥3.9 at runtime. If hook trust or the required host events
are unavailable, use the startup-instruction route instead; do not bypass trust.

#### Claude Code native plugin

Installation enables Palych in the next session when plugin hooks run. Requires
POSIX and Python ≥3.9 at runtime, standard library only. `SessionStart` restores
the core after compaction; ordinary prompts do not reload it or change saved mode.
State stays in `~/.local/state/palych/claude-code/state.json`.

The **Claude/Codex hook adapters** support these standalone prompts:

- `Отключи Палыча` / `Turn off palych` — off for this conversation.
- `Включи Палыча` / `Enable palych` — on for this conversation.
- `Отключи постоянное включение Палыча` / `Disable palych always-on` — default off for new conversations.
- `Включи Палыча всегда` / `Enable palych always` — default on for new conversations.

Session overrides survive default changes. Quotes/task data cannot change mode.
User instructions/settings are not edited by native adapters; a hook error is not
confirmed activation. Default-changing prompts are not a persistence API for OMP
or the generic instruction route.

Do not combine activation routes, a separate Palych installation, or a second
global block. The OMP extension defers to a managed startup block if it is present;
Claude/Codex hooks should not be combined with that block. Portable skill discovery
through `.agents/skills/palych` remains available for clients that prefer explicit loading.

### Editing prose

The humanizer rules apply to the target text or requested prose, not to the coding agent's
ongoing working voice. `/slop-audit` and `/slop-humanize` keep their report/artifact formats;
Palych governs surrounding communication without shortening a requested detailed explanation
or formal document.

Skills trigger on natural language — "humanize this", "de-slop", "очеловечь", "убери канцелярит".
Call by name when they don't fire: "run humanizer-ru on this".

Explicit commands:

- `/slop-audit <file-or-paste>` — detection report, no rewrite.
- `/slop-humanize <file-or-paste>` — rewrite. Add `casual` / `professional` to set tone.

## Optional: the Russian scanner

The `humanizer-ru` audit has a deterministic half — `scripts/scan.py`. It needs two pip packages:

```
pip install razdel pymorphy3
python3 <plugin>/skills/humanizer-ru/scripts/scan.py draft.txt
```

It prints a 0–100 cleanliness score, HARD BANS with line numbers, marker density, sentence rhythm,
and the noun/verb ratio. Exits non-zero when HARD BANS are present — wire it into pre-commit to keep
slop out of the repo. Without the packages the skill still works; the audit falls back to the pattern
catalog with no machine metrics.

## Not in scope

Design slop (templated layouts) and GSAP animation live outside slopocop — that split was
deliberate. If you need them, they belong in a separate design-focused plugin.

## Sources and licenses

slopocop repackages upstream MIT work — attribution preserved:

- `palych` and `hooks/session_hook.py` — [ponomr/palych](https://github.com/ponomr/palych)
  at `3d6509a606ac5567d5b354c41d2b04af3c194adf` (MIT); notice in
  `skills/palych/LICENSE`, path mapping and local adaptation in
  `skills/palych/references/sources.md`. The core adds only `Development replies`;
  the adapter includes a documented Codex fork-metadata isolation fix. Examples
  load only when needed; runtime makes no network downloads.
- `humanizer-ru` — [ilyautov/humanizer-ru](https://github.com/ilyautov/humanizer-ru) (MIT)
- `slop-humanizer` — [humanizer-tools/slop-humanizer](https://github.com/humanizer-tools/slop-humanizer) (MIT)

Changes on repackaging: `slop-humanizer` gained a YAML frontmatter header (the original had none, so
the skill would not trigger); `humanizer-ru` Python scripts had indentation restored and were verified
by tests. No behavioral changes to the pattern catalogs.
