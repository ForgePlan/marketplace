# slopocop

**Slop cop for text.** Detects AI slop and humanizes it — Russian and English. Split from the
broader `antislop` bundle to do one thing well: text, not design or animation.

## What it does

- **Detect** AI tells in prose (hard-banned phrases, em-dash abuse, copula avoidance, false ranges,
  rule-of-three, sycophancy, boilerplate rhythm) and score cleanliness 0–100.
- **Humanize** — rewrite AI-flat text into a specific human voice: opinion, uneven rhythm, concrete
  detail. A fact-lock forbids inventing numbers or citations.
- **Enforce** — a hook nudges you toward an audit after you write prose, and the `slop-cop` agent
  reviews text on demand.

## Components

| Kind | Name | Purpose |
|------|------|---------|
| Skill | `humanizer-ru` | Russian text: 54 patterns, HARD BANS, fact-lock, deterministic `scan.py` scorer (0–100) |
| Skill | `slop-humanizer` | English text: de-slop synthesized from 5 humanizer repos |
| Command | `/slop-audit` | Read-only detection pass. Auto-routes RU/EN, runs the scanner for Russian, no rewrite |
| Command | `/slop-humanize` | Full humanization. Auto-routes RU→humanizer-ru, EN→slop-humanizer |
| Agent | `slop-cop` | Hook-triggered / on-demand prose reviewer |
| Hook | `PostToolUse:Write\|Edit\|MultiEdit` | Silent for code; hints on `.md`/`.txt`/`.mdx` edits |

## Install (marketplace)

```
/plugin marketplace add ForgePlan/marketplace
/plugin install slopocop@ForgePlan-marketplace
```

## Use

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

- `humanizer-ru` — [ilyautov/humanizer-ru](https://github.com/ilyautov/humanizer-ru) (MIT)
- `slop-humanizer` — [humanizer-tools/slop-humanizer](https://github.com/humanizer-tools/slop-humanizer) (MIT)

Changes on repackaging: `slop-humanizer` gained a YAML frontmatter header (the original had none, so
the skill would not trigger); `humanizer-ru` Python scripts had indentation restored and were verified
by tests. No behavioral changes to the pattern catalogs.
