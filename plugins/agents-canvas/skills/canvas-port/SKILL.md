---
name: canvas-port
description: "CANVAS porting playbook — Pencil design system -> Storybook (web-components) -> framework code. The shared contract read by canvas-porter-storybook (Vectorize), canvas-coder (Assemble), and canvas-porter-framework (Spread). Covers the Style-Dictionary token contract (single tokens.json -> CSS custom properties for the Web Component shadow DOM), the per-component story spec (variant matrix + slot map + descendant-override points), the visual oracle (reference screenshots -> visual-regression via Playwright / Storybook test-runner), and React/Vue/Svelte/Angular/Solid wrapper parity over the canonical Lit base. Use when porting a Pencil DS to tokens/Storybook/components, writing *.stories.ts, wiring visual tests, or building framework wrappers. Triggers on: port manifest, token contract, Style-Dictionary, tokens.json, CSS custom properties, web components, Lit element, Storybook web-components, story spec, variant matrix, slot map, visual regression, reference screenshots, framework parity, React Vue Svelte Angular Solid wrapper, design tokens to code."
---

# canvas-port — Pencil DS -> Storybook -> framework code

The porting half of CANVAS (phases **V**ectorize, **A**ssemble, **S**pread). It turns an **approved**
Pencil design system (post Gate A+N) into:

1. a **token contract** — one `tokens.json` (mirrors Pencil `variables`) compiled by **Style-Dictionary**
   into CSS custom properties + JS token exports, consumed by the Web Component shadow DOM;
2. a **Storybook port manifest** — per-component story spec (variant matrix + slot map +
   descendant-override points) on the **`web-components`** Storybook framework;
3. a **visual oracle** — reference screenshots per component+variant, asserted by visual-regression;
4. **framework parity** — thin React/Vue/Svelte/Angular/Solid wrappers over the canonical **Lit** base,
   never forking token values.

This skill is **agentic RAG**: this file is the nav-map; load only the section you need for the current
phase. It is shared by three agents — read it from the role you are playing:

| You are... | Phase | Read first | Then |
|---|---|---|---|
| `canvas-porter-storybook` (MAIN, Pencil read) | **V** Vectorize | `01-token-contract` + `02-story-spec` + `03-visual-oracle` | produce the port manifest |
| `canvas-coder` (SUB) | **A** Assemble | `01-token-contract` + `02-story-spec` + `03-visual-oracle` | implement Lit components + `*.stories.ts` + visual tests |
| `canvas-porter-framework` (SUB) | **S** Spread | `04-framework-parity` (+ `01` for the token contract it must NOT fork) | wrap the WC base per framework + parity tests |

## Section INDEX

| # | Section | What it covers | Primary reader |
|---|---------|----------------|----------------|
| 01 | [token-contract](sections/01-token-contract/_index.md) | Single `tokens.json` (mirrors Pencil `variables`) -> Style-Dictionary -> CSS custom properties + JS exports; `Mode:Light` / `Mode:Dark` theme axes; consumed by the WC shadow DOM. The C5 unlock artifact. | porter-storybook, coder |
| 02 | [story-spec](sections/02-story-spec/_index.md) | Storybook `web-components` framework; one component -> one story file; the variant matrix, the slot map, and the descendant-override points; CSF + `args`/`argTypes`. | porter-storybook, coder |
| 03 | [visual-oracle](sections/03-visual-oracle/_index.md) | Reference screenshots (per component+variant) as the source of truth for visual-regression via Playwright / the Storybook test-runner `postVisit` hook. | porter-storybook, coder |
| 04 | [framework-parity](sections/04-framework-parity/_index.md) | Canonical Lit WC + thin React/Vue/Svelte/Angular/Solid wrappers; per-framework WC-interop gotchas (props vs attributes, events, refs, SSR); never fork token values. | porter-framework |

## context7 is MANDATORY for every library touch (LOCKED DECISION 7b)

Before writing **any** Style-Dictionary config, Lit component, Storybook story, test-runner hook, or
framework wrapper, the porting agents **MUST** consult the **context7 MCP**:

```
resolve-library-id("<library>")  ->  query-docs(<id>, "<specific question>")
```

for **Storybook**, **Lit**, **Style-Dictionary**, **React**, **Vue**, **Svelte**, **Angular**, and
**Solid**. Training-data API shapes drift between major versions (Style-Dictionary v4 changed the JS API
and hooks; Storybook moved to CSF + the `web-components` renderer; Lit 3 changed decorators). Verify the
current API with context7 first. Also **prompt the user to use context7** whenever a library/version
question surfaces (per the global context7 rule). The leaf sections show illustrative shapes — they are
starting points to confirm against context7, never a substitute for it.

## The single source-of-truth invariant (CANVAS #1 anti-pattern)

There is exactly **one** token source: `tokens.json`. Style-Dictionary compiles it once into CSS custom
properties; the Lit base consumes those vars in its shadow DOM; **every** framework wrapper consumes the
**same** custom elements and the **same** compiled vars. No wrapper redeclares a hex value, a spacing
step, or a font token. A forked token value is a CRITICAL finding at Gate Parity. If a wrapper "needs" a
value the contract does not have, the fix is to add it to `tokens.json` and recompile — never to inline it.

## Where the manifest lives

The porter-storybook writes the port manifest under `packages/design-system/.canvas-port/` (token
contract draft + per-component story specs + the reference screenshot set). Writes to
`packages/design-system/**` source are **blocked by the `canvas-gate.sh` PreToolUse hook until the tokens
RFC is active** (hook-gate=YES, C5). The `.canvas-port/` manifest directory and the `.canvas-scratch/`
spike segment are the always-allowed exceptions — author the contract there, get Gate V to PASS, let the
orchestrator activate the tokens RFC, and only then is the Coder unblocked to write component source.

## HARD RULES (porting discipline)

1. **One token source, never forked.** `tokens.json` -> Style-Dictionary -> CSS vars. No wrapper or
   component inlines a raw value. Add-to-contract-and-recompile, never inline.
2. **context7 before code.** Resolve + query Storybook / Lit / Style-Dictionary / framework docs before
   writing config or components; prompt the user to use context7 on any version question.
3. **The story is the behavioural contract.** Every variant in the Pencil DS is a story; framework
   wrappers achieve parity against the **stories**, not against a re-reading of the design.
4. **Reference screenshots are the visual oracle.** Visual-regression asserts against the porter's
   captured screenshots; an un-snapshotted variant is an untested variant.
5. **No component source before the tokens RFC is active.** The port manifest goes under `.canvas-port/`;
   `packages/design-system/**` source stays blocked until C5 unlock. Never flip the gate by hand.
6. **Never `Read`/`Grep` a `.pen` file.** It is encrypted — read the design only via Pencil MCP
   (`export_nodes` / `batch_get` / `get_variables` / `get_screenshot`) or via the exported snapshot.

## Related

- `/canvas` — the methodology entry; `sections/01-pipeline` + `sections/02-gates` for where V/A/S sit.
- `canvas-design` — the Pencil-side DS organization + tokens-theming this port reads from.
- `canvas-conventions` (Guardian) + `canvas-truth-map` (Tester) — the Gate A+N this port follows.
- Agents: `canvas-porter-storybook` (V), `canvas-coder` (A), `canvas-porter-framework` (S).
- `/canvas-review` — the post-export code + UX gate over the generated `*.ts/*.css`.
</content>
</invoke>
