# slopocop-design

**Slop cop for design.** Stops UI from looking AI-generated. The design counterpart to
[`slopocop`](../slopocop) (text) — same cop shape, different beat.

## What it does

- **Detect** templated, generated-looking design — default fonts, the generic
  hero → 3-feature → CTA → footer rhythm, italic headers, invented metrics, re-drawn browser/phone
  chrome, mobile failures — via hallmark's 58-gate slop-test.
- **Redesign** — a fresh visual take that reads as *made*: new section rhythm, heading placement, and
  component voice, while preserving routes, copy, brand, and logic.
- **Review** — an on-demand `design-cop` agent that runs the slop-test and reports a ranked punch list.

## Components

| Kind | Name | Purpose |
|------|------|---------|
| Skill | `hallmark` | Anti-AI-slop design engine: 58-gate slop-test, 21 macrostructures, 50 components, audit/redesign/study |
| Skill | `frontend-design` | Anthropic's frontend aesthetics skill — deliberate design direction, live typography |
| Skill | `design-taste-frontend` | Landing/portfolio taste — briefs to non-templated interfaces |
| Command | `/design-audit` | Read-only slop-test (58 gates), ranked punch list, no edits |
| Command | `/design-redesign` | Fresh visual take inside existing boundaries — routes/copy/logic preserved |
| Agent | `design-cop` | On-demand design reviewer |

**No hook** — by design. `laws-of-ux` already nudges on frontend edits; a second hook would
double-hint on every `.tsx`/`.vue` edit. slopocop-design triggers on natural language and explicit
commands instead.

## Install (marketplace)

```
/plugin marketplace add ForgePlan/marketplace
/plugin install slopocop-design@ForgePlan-marketplace
```

## Use

Skills trigger on natural language — "build a landing page", "redesign this", "why does this look
generic". Call by name when they don't fire: "run hallmark audit on this".

Explicit commands:

- `/design-audit <file-or-component>` — slop findings, no edits.
- `/design-redesign <file> [--mood <name>]` — redesign inside existing boundaries.

For extracting the DNA of a design you admire (screenshot or URL), use the `hallmark` skill's `study`
verb directly.

## How it relates to laws-of-ux

Complementary, not overlapping:

- **`laws-of-ux`** — usability psychology (Fitts, Hick, Miller). *Is it usable?*
- **`slopocop-design`** — anti-templated aesthetics. *Does it look made or generated?*

Run both on a page for a full pass; they answer different questions.

## Not in scope

Text slop → [`slopocop`](../slopocop). GSAP animation is a separate concern (motion quality, not slop)
and is not bundled here.

## Sources and licenses

slopocop-design repackages upstream work — attribution preserved:

- `hallmark` — [Nutlope/hallmark](https://github.com/Nutlope/hallmark) (MIT)
- `frontend-design` — Anthropic (Apache 2.0 — `skills/frontend-design/LICENSE.txt` kept intact)
- `design-taste-frontend` — [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (MIT)

Changes on repackaging: `hallmark`'s `version` field moved into `metadata` (Claude Code skill
frontmatter shape). Some code-example indentation was lost in the original transfer of hallmark/GSAP
references — it does not affect skill behavior. No changes to the slop-test gates or pattern catalogs.
