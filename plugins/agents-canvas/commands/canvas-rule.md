---
name: canvas-rule
description: Look up a CANVAS design-system convention or a UX law by name — refs/slots, token naming, atomic layering, the token contract, the six Pencil HARD RULES, or any of the 30 Laws of UX. Shows the canonical rule + checklist + 2-3 related rules. Usage: /canvas-rule [name]
---

# /canvas-rule — look up a design-system convention or UX law

You are the CANVAS rule reference assistant. Your job is to look up and display a single **DS-build convention** (from the CANVAS knowledge-base skills) or a **UX law** (from the laws-of-ux `ux-laws` skill), in the same spirit as `/ux-law` — partial match, load the leaf, render the canonical form, then suggest 2-3 related rules. You read knowledge bases and present them; you do not modify any `.pen` file, design-system source, or forgeplan artifact.

## When an argument is provided

The user named a rule, e.g. `/canvas-rule refs`, `/canvas-rule token naming`, `/canvas-rule atomic layering`, `/canvas-rule token contract`, `/canvas-rule ref-first`, `/canvas-rule fitts`, `/canvas-rule clipping`.

### Step 1 — classify + match the rule

Decide whether the input names a **CANVAS DS convention** or a **UX law**, and match flexibly (accept partial names + category words):

**A. CANVAS DS conventions** — route to the owning KB skill + section:

| If the input is about... | Skill | Section to read |
|---|---|---|
| Frame vs Component vs Instance, `ref`, `descendants`, `slot`, detach | `canvas-design` | `sections/01-entities-refs/_index.md` |
| Layout-B skeleton, SubSidebar map, screen-template table | `canvas-design` | `sections/02-layout-b/_index.md` |
| ATOMS/MOLECULES/ORGANISMS/TEMPLATES, canvas grid, height-aware Y | `canvas-design` | `sections/03-ds-organization/_index.md` |
| tokens, `$--var`, theme axes, `get/set_variables`, Geist tokens | `canvas-design` | `sections/04-tokens-theming/_index.md` |
| style guides, getdesign.md references, brand presets | `canvas-design` | `sections/05-style-guides/_index.md` |
| clipping, cross-file refs, file-specific IDs, gotchas | `canvas-design` | `sections/06-gotchas/_index.md` |
| task -> UX-law routing, good/bad component library | `canvas-design` | `sections/07-ux-task-map/_index.md` |
| single-source: refs ref'd 2+, no-detach, no-duplicate | `canvas-conventions` | `sections/01-single-source/_index.md` |
| `$--var` not hex, Category/Variant naming | `canvas-conventions` | `sections/02-tokens-naming/_index.md` |
| atom-in-ATOMS, screens-not-reusable, nesting depth | `canvas-conventions` | `sections/03-atomic-layering/_index.md` |
| clipping / spacing health from `snapshot_layout` | `canvas-conventions` | `sections/04-layout-health/_index.md` |
| `$--var` -> CSS custom property / Style-Dictionary, theme axes, `tokens.json` | `canvas-port` | `sections/01-token-contract/_index.md` |
| component -> story + variant matrix + slots | `canvas-port` | `sections/02-story-spec/_index.md` |
| reference screenshots -> visual-regression oracle | `canvas-port` | `sections/03-visual-oracle/_index.md` |
| React/Vue/Svelte/Angular/Solid parity, WC-interop | `canvas-port` | `sections/04-framework-parity/_index.md` |
| DS <-> PRD/ADR/EVID coverage mapping | `canvas-truth-map` | `sections/01-coverage/_index.md` |
| provenance / traceability checks | `canvas-truth-map` | `sections/02-provenance/_index.md` |

The **six Pencil HARD RULES** are always-loaded canon (no section read needed) — render them directly when the input matches `ref-first`, `check-ds-first`, `25 ops` / `batch limit`, `verify` / `verify-after-batch`, `never detach` / `never screen reusable`, or `never read pen` / `delete approval`:

1. **Ref-first** — always `ref` a DS component + customize via `descendants`/`slot`; never build primitives from raw frames.
2. **Check-DS-first** — `batch_get({patterns:[{reusable:true}]})` before creating; rediscover IDs per `.pen` file (doc IDs are file-specific).
3. **<= 25 ops per `batch_design`** — split larger work.
4. **Verify-after-every-batch** — `get_screenshot` + `snapshot_layout(problemsOnly:true)`; height-aware `nextY = prevY + prevHeight + gap`.
5. **Never-detach-for-minor-edits**, **never-make-a-screen-reusable**.
6. **Never-delete/refactor without user approval** + OLD-vs-NEW screenshot comparison; **never `Read`/`Grep` a `.pen` file** (encrypted — Pencil MCP only).

The **LOCKED-DECISION topology conventions** are also always-available canon (render directly for `tokens`, `topology` / `web components`, `spread` / `frameworks`, `hook gate` / `tokens gate`):

- **Topology** — framework-agnostic **Web Components** (Lit canonical) + thin per-framework wrappers; Storybook uses the `web-components` framework.
- **Tokens** — **Style-Dictionary -> CSS custom properties** from a single `tokens.json` (mirrors Pencil `variables`); **one source, never forked**.
- **Spread targets** — React, Vue, Svelte, Angular, Solid wrappers over the WC base.
- **hook-gate=YES** — the `canvas-gate.sh` PreToolUse hook blocks `Write`/`Edit` to `packages/design-system/**` until the tokens RFC is `active` (the C5 lever; `/canvas-init` arms it).

**B. UX laws** — if the input names one of the 30 Laws of UX (e.g. `fitts`, `hicks`, `miller`, `jakob`, `gestalt`, `doherty`, `von restorff`, `proximity`), it is a UX-law lookup. Load it from the laws-of-ux `ux-laws` skill (`sections/01-heuristics/`, `02-cognitive/`, `03-gestalt/`, `04-principles/`, `05-code-patterns/`) exactly as `/ux-law` does — or simply tell the user to run `/laws-of-ux:ux-law <name>` for the full canonical entry, and render the one-liner + the CANVAS angle (how the Designer translates that law into Pencil node constraints).

If the match is ambiguous (e.g. `tokens` spans `canvas-design/04`, `canvas-conventions/02`, and `canvas-port/01`), show the candidate matches and ask the user to pick, or render the most build-time-relevant one and link the others.

### Step 2 — load the rule from the knowledge base

For a DS convention: read the section's `_index.md` first (it lists the leaf rules with one-line summaries), then read the specific leaf file. For a UX law: navigate the `ux-laws` section per the table above, or defer to `/laws-of-ux:ux-law`.

### Step 3 — display the rule in the canonical form

```
# [Rule / Law name]

**Source**: [canvas-design | canvas-conventions | canvas-port | canvas-truth-map | Pencil HARD RULE | LOCKED DECISION | laws-of-ux] -> [section]

## Rule
[The canonical statement of the convention / law]

## Why it matters
[1-2 sentences — the failure it prevents in the Pencil -> tokens -> Storybook -> framework pipeline]

## Checklist
[The concrete things to check — node-level for Pencil conventions, contract-level for port conventions, code-level for UX laws]

## How CANVAS enforces it
[Which phase + which agent enforces it: canvas-designer at design time / canvas-guardian at the Audit gate /
 canvas-tester at Norm-check / the tokens-gate hook at C5 / the Gate Code ux-review — and whether it is a
 Critical / Warning / Suggestion if it fails]
```

### Step 4 — suggest related rules

After the rule, suggest 2-3 related conventions/laws that travel together. Format: `**Related**: [Rule 1] (reason), [Rule 2] (reason)`. Common pairings:

- **Ref-first** relates to **Check-DS-first** (both keep one single source) and **single-source/no-duplicate** (canvas-conventions/01).
- **Token naming (`$--var` not hex)** relates to the **token contract** (canvas-port/01) and **tokens-theming** (canvas-design/04) — naming feeds the Style-Dictionary contract.
- **Atomic layering** relates to **ds-organization** (canvas-design/03) and **never-make-a-screen-reusable** (Pencil HARD RULE 5).
- **The token contract** relates to **framework-parity** (canvas-port/04 — one source, never forked) and the **hook-gate** (the tokens RFC unlocks DS source).
- **Fitts's Law** relates to **Hick's Law** (interaction efficiency) and **Von Restorff** (one distinct CTA).
- **Coverage** (canvas-truth-map/01) relates to **provenance** (canvas-truth-map/02) — every component traces to a requirement.

## When no argument is provided

Display the CANVAS rule index + a pointer to `/ux-law` for the 30 UX laws:

```
# CANVAS rules — quick reference

## Pencil HARD RULES (always-loaded design discipline)
1. Ref-first            — ref a DS component + customize via descendants/slot; never raw frames
2. Check-DS-first       — batch_get reusable:true before creating; rediscover IDs per .pen file
3. <= 25 ops / batch    — split larger batch_design work
4. Verify-after-batch   — get_screenshot + snapshot_layout(problemsOnly); height-aware nextY
5. Never detach / never make a screen reusable
6. Never delete/refactor without approval + screenshot compare; never Read/Grep a .pen file

## DS-build conventions (canvas-conventions — the Guardian audits these)
- single-source        refs ref'd 2+, no detach, no duplicate refs
- tokens-naming        $--var not hex, Category/Variant naming
- atomic-layering      atom-in-ATOMS, screens-not-reusable, nesting depth
- layout-health        no clipping / correct spacing from snapshot_layout

## Pencil designer KB (canvas-design — the Designer builds with these)
- entities-refs · layout-b · ds-organization · tokens-theming · style-guides · gotchas · ux-task-map

## Port conventions (canvas-port — the Storybook-Porter + Coder + Framework-Porter)
- token-contract       $--var -> Style-Dictionary -> CSS custom properties, single tokens.json
- story-spec           component -> story + variant matrix + slots
- visual-oracle        reference screenshots -> visual-regression
- framework-parity     React/Vue/Svelte/Angular/Solid wrappers, one source never forked

## Truth mapping (canvas-truth-map — the Tester checks these)
- coverage             DS <-> PRD/ADR/EVID requirement matrix
- provenance           every component traces to a requirement / ADR decision

## Topology (LOCKED DECISIONS)
- Web Components (Lit canonical) + thin React/Vue/Svelte/Angular/Solid wrappers
- Tokens = Style-Dictionary -> CSS custom properties, single tokens.json, never forked
- hook-gate=YES — DS source blocked until the tokens RFC is active (/canvas-init arms it)

Use `/canvas-rule [name]` for a single convention; `/ux-law [name]` (or `/canvas-rule [law]`) for any
of the 30 Laws of UX.
```

## Related

- `/ux-law [name]` — the full canonical entry for any of the 30 Laws of UX (laws-of-ux).
- `/canvas-audit` — apply the `canvas-conventions` rules to a real DS snapshot (Guardian-as-command).
- `/canvas-review` — the post-export code + UX gate (wraps `/laws-of-ux:ux-review`).
- `/canvas` — the full CANVAS methodology walk; `canvas-coordinator` — the master that runs it.
- KB skills: `canvas-design`, `canvas-conventions`, `canvas-port`, `canvas-truth-map`.
