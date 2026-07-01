---
name: canvas-port
description: "CANVAS porting playbook — Pencil design system -> Storybook -> native framework code. Shared contract read by canvas-porter-storybook (Vectorize) and canvas-coder (Assemble); the optional canvas-porter-framework (multi-target port) is dispatched only on an explicit multi-framework request, out of the default pipeline. Step 0 resolves the consuming project's framework as an INPUT — detected from AGENTS.md / CLAUDE.md / package.json, else force-asked — and CANVAS generates natively in that one framework. Lit / Web Components / Shadow DOM are ONE selectable target, used only when the declared stack IS Web Components, not the canon. Covers the token contract (single tokens.json -> CSS custom properties, compiled by the project's token tool — Style-Dictionary is one option), the per-component story spec (variant matrix + slot map + descendant-override points), and the visual oracle (reference screenshots -> visual-regression via Playwright / Storybook test-runner). Use when porting a Pencil DS to tokens/Storybook/components, writing stories, or wiring visual tests. Triggers on: port manifest, token contract, tokens.json, CSS custom properties, Style-Dictionary, framework detection, native framework output, Storybook, story spec, variant matrix, slot map, visual regression, reference screenshots, React Vue Svelte Angular Solid Lit, web components, design tokens to code."
---

# canvas-port — Pencil DS -> Storybook -> native framework code

The porting half of CANVAS (phases **V**ectorize and **A**ssemble; the trailing "S"/Spread is no longer a default phase — "CANVAS" is kept as a proper-noun codename, not a literal acronym expansion). It turns an **approved**
Pencil design system (post Gate A+N) into:

1. a **token contract** — one `tokens.json` (mirrors Pencil `variables`) compiled by the **project's token
   tool** (Style-Dictionary is one option) into CSS custom properties + JS token exports, consumed by the
   resolved framework's components;
2. a **Storybook port manifest** — per-component story spec (variant matrix + slot map +
   descendant-override points) on the resolved framework's Storybook renderer;
3. a **visual oracle** — reference screenshots per component+variant, asserted by visual-regression.

Native single-framework output has **no master and no wrappers**. A multi-framework wrapper port (one
shared base + thin per-framework wrappers) is **optional and out of the default pipeline** — deferred to a
future ADR-016 and dispatched only on an explicit multi-framework request.

This skill is **agentic RAG**: this file is the nav-map; load only the section you need for the current
phase. It is shared by the two default agents (plus an optional third for multi-framework ports) — read it from the role you are playing:

| You are... | Phase | Read first | Then |
|---|---|---|---|
| `canvas-porter-storybook` (MAIN, Pencil read) | **V** Vectorize | `01-token-contract` + `02-story-spec` + `03-visual-oracle` | produce the port manifest (+ `05-missing-master` when a master is absent/partial) |
| `canvas-coder` (SUB) | **A** Assemble | `01-token-contract` + `02-story-spec` + `03-visual-oracle` | implement components in the resolved framework + `*.stories.*` + visual tests |
| `canvas-porter-framework` (SUB, OPTIONAL — off by default) | **S** Spread *(optional multi-target port; only on an explicit multi-framework request)* | `04-framework-parity` (+ `01` for the token contract it must NOT fork) | wrap the shared base per framework + parity tests |

## Section INDEX

| # | Section | What it covers | Primary reader |
|---|---------|----------------|----------------|
| 01 | [token-contract](sections/01-token-contract/_index.md) | Single `tokens.json` (mirrors Pencil `variables`) -> the project's token tool (Style-Dictionary is one option) -> CSS custom properties + JS exports; `Mode:Light` / `Mode:Dark` theme axes; consumed by the resolved framework's components. The C5 unlock artifact. | porter-storybook, coder |
| 02 | [story-spec](sections/02-story-spec/_index.md) | Storybook on the resolved framework's renderer; one component -> one story file; the variant matrix, the slot map, and the descendant-override points; CSF + `args`/`argTypes`. | porter-storybook, coder |
| 03 | [visual-oracle](sections/03-visual-oracle/_index.md) | Reference screenshots (per component+variant) as the source of truth for visual-regression via Playwright / the Storybook test-runner `postVisit` hook. | porter-storybook, coder |
| 04 | [framework-parity](sections/04-framework-parity/_index.md) | **OPTIONAL — out of the default pipeline (deferred to future ADR-016).** A shared base + thin per-framework wrappers; per-framework interop gotchas (props vs attributes, events, refs, SSR); never fork token values. Dispatched only on an explicit multi-framework request. | porter-framework (optional) |
| 05 | [missing-master](sections/05-missing-master/_index.md) | The no-fabrication loop: a scope-required component/variant with no portable Pencil master -> a `missing-master` forgeplan PROBLEM (owner `canvas-designer`) + keep porting the independent components + a `## Blocked components` handoff; partial master -> port what exists, ticket what's missing. | porter-storybook |

## context7 is MANDATORY for every library touch (LOCKED DECISION 7b)

Before writing **any** token-tool config, framework component, Storybook story, or test-runner hook, the
porting agents **MUST** consult the **context7 MCP** — and **first resolve the consuming project's
framework** (Step 0: detect from AGENTS.md / CLAUDE.md / package.json, else force-ask) so the docs pulled
are for the framework CANVAS will actually generate:

```
resolve-library-id("<library>")  ->  query-docs(<id>, "<specific question>")
```

for **Storybook**, the **resolved framework** (React / Vue / Svelte / Angular / Solid / Lit — whichever
Step 0 resolved), and the **project's token tool** (e.g. Style-Dictionary). Training-data API shapes drift
between major versions (Style-Dictionary v4 changed the JS API and hooks; Storybook moved to CSF +
per-renderer frameworks; the framework's own component API may have changed). Verify the current API with
context7 first — mandatory before any generation. Also **prompt the user to use context7** whenever a library/version
question surfaces (per the global context7 rule). The leaf sections show illustrative shapes — they are
starting points to confirm against context7, never a substitute for it.

## The single source-of-truth invariant (CANVAS #1 anti-pattern)

There is exactly **one** token source: `tokens.json`. The project's token tool compiles it once into CSS
custom properties; the resolved framework's components consume those vars; **every** component consumes the
**same** compiled vars. No component redeclares a hex value, a spacing step, or a font token. A forked
token value is a CRITICAL finding at Gate V / Gate Code (and, in an optional multi-framework port, at Gate
Parity). If a component "needs" a value the contract does not have, the fix is to add it to `tokens.json`
and recompile — never to inline it.

## Where the manifest lives

The porter-storybook writes the port manifest under `packages/design-system/.canvas-port/` (token
contract draft + per-component story specs + the reference screenshot set). Writes to
`packages/design-system/**` source are **blocked by the `canvas-gate.sh` PreToolUse hook until the tokens
RFC is active** (hook-gate=YES, C5). The `.canvas-port/` manifest directory and the `.canvas-scratch/`
spike segment are the always-allowed exceptions — author the contract there, get Gate V to PASS, let the
orchestrator activate the tokens RFC, and only then is the Coder unblocked to write component source.

## HARD RULES (porting discipline)

1. **One token source, never forked.** `tokens.json` -> the project's token tool -> CSS vars. No component
   inlines a raw value. Add-to-contract-and-recompile, never inline.
2. **context7 before code.** Resolve the project's framework (Step 0) first, then resolve + query Storybook /
   the resolved framework / the project's token tool docs before writing config or components; prompt the
   user to use context7 on any version question.
3. **The story is the behavioural contract.** Every variant in the Pencil DS is a story; the resolved
   framework's components are built against the **stories**, not against a re-reading of the design.
4. **Reference screenshots are the visual oracle.** Visual-regression asserts against the porter's
   captured screenshots; an un-snapshotted variant is an untested variant.
5. **No component source before the tokens RFC is active.** The port manifest goes under `.canvas-port/`;
   `packages/design-system/**` source stays blocked until C5 unlock. Never flip the gate by hand.
6. **Never `Read`/`Grep` a `.pen` file.** It is encrypted — read the design only via Pencil MCP
   (`export_nodes` / `batch_get` / `get_variables` / `get_screenshot`) or via the exported snapshot.

## Related

- `/canvas` — the methodology entry; `sections/01-pipeline` + `sections/02-gates` for where V/A sit (Spread is optional, out of default).
- `canvas-design` — the Pencil-side DS organization + tokens-theming this port reads from.
- `canvas-conventions` (Guardian) + `canvas-truth-map` (Tester) — the Gate A+N this port follows.
- Agents: `canvas-porter-storybook` (V), `canvas-coder` (A); `canvas-porter-framework` (S) is OPTIONAL — dispatched only on an explicit multi-framework request.
- `/canvas-review` — the post-export code + UX gate over the generated `*.ts/*.css`.
</invoke>
