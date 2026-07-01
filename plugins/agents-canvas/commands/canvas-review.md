---
name: canvas-review
description: CANVAS post-export code + UX gate. Wraps /laws-of-ux:ux-review on the generated Storybook / component code in the project's resolved framework (native single-framework by default; Web Components only when that's the declared stack) and adds CANVAS-specific lenses (token-fork detection, framework-residue detection, composition semantics, visual-oracle coverage, optional framework parity). Bucketed findings with file:line + before/after. Used at Gate Code (Assemble); Gate Parity (Spread) only when the optional multi-framework wrapper path is invoked.
---

# /canvas-review — post-export code + UX gate

You are running the CANVAS¹ **code-boundary** gate. The `laws-of-ux` hook keys on frontend file edits via
`Write`/`Edit`, so it **never fires on `.pen`** design edits (done via `mcp__pencil__*`). `/canvas-review`
is therefore where UX-law enforcement meets the **generated** code — in whichever framework the CANVAS
pipeline's Step 0 resolved for this project (React, Vue, Svelte, Angular, Solid, or Web Components only
when the project's stack genuinely IS Web Components) — plus the token-tool theme output and the
`*.stories.ts` files. It **wraps** `/laws-of-ux:ux-review` and layers the CANVAS contract checks on top.

Run this at **Gate Code**, over the native Assemble output for the resolved framework. **Gate Parity**
(over per-framework Spread output) only applies when the optional multi-framework wrapper path was
explicitly invoked — that path is out-of-default (see future ADR-016); skip Gate Parity on a normal
single-framework run. It does not replace the independent `Task` reviewers (`code-reviewer` + `tester` +
`laws-of-ux:ux-reviewer`) — it is the consolidated UX + contract lens the gate also applies.

¹ CANVAS is the proper name of this design-system→code methodology; see the `canvas-conventions` skill
for the phase breakdown.

## Step 1 — confirm the resolved framework (do not assume Web Components)

CANVAS generates **natively** in one resolved framework — the framework is an INPUT decided upstream
(the CANVAS pipeline's Step 0: detected from `AGENTS.md` / `CLAUDE.md` / `package.json`, announced or
force-asked when ambiguous), never a fixed topology. Confirm what was resolved for this project, don't
assume:
- Check `AGENTS.md` / `CLAUDE.md` for a recorded framework decision.
- Cross-check `package.json` for the dependency that names the actual UI framework (`react`, `vue`,
  `svelte`, `@angular/core`, `solid-js`) — or `lit` **only** if the project genuinely declared Web
  Components as its stack.
- If the two sources disagree, or nothing is recorded, force-ask rather than default to Lit/Web
  Components.
- Note the resolved framework in the report header.

Then confirm the **token tool** actually in use — `style-dictionary.config.*` is one option, not a
requirement; check `package.json` / build scripts for whichever tool the project chose, and note it too
(the emitted `theme.light.css` / `theme.dark.css`, or that tool's equivalent output).

Storybook config — `.storybook/main.*` (the preset matching the resolved framework; e.g.
`@storybook/web-components-vite` only if the stack IS Web Components), `.storybook/test-runner.*` (the
visual-regression `postVisit` hook).

If the project has no CANVAS-generated design system at all (no Storybook, no token pipeline), say so and
route to plain `/laws-of-ux:ux-review` instead.

## Step 2 — scope the generated files

Review only **generated** code (skip `node_modules`, `dist`, `storybook-static`, `__image_snapshots__`):
- Native components (the one resolved framework): `*.ts` Lit elements under
  `packages/design-system/src/**` only if the resolved stack IS Web Components; otherwise the resolved
  framework's own source files (`*.tsx`/`*.jsx` for React/Solid, `*.vue`, `*.svelte`, `*.ts` for Angular)
  under the same path.
- Theme: the token-tool's CSS output (`theme.*.css` or equivalent) + any component-scoped styles.
- Stories: `*.stories.ts` (or the resolved framework's story format).
- Wrappers (Gate Parity, optional — only present if the multi-framework Spread path was invoked): the
  non-native framework files generated during that pass.
- Tests: `*.spec.ts`, the test-runner hook.

## Step 3 — run the wrapped UX review

Invoke `/laws-of-ux:ux-review` on the scoped files (it loads the `ux-laws` knowledge base and checks the
30 laws — Fitts touch targets, Hick choice count, Miller chunking, Doherty loading states, Von Restorff
one-distinct-CTA, the Gestalt grouping laws, etc.). Carry its Critical/Warning/Suggestion findings into
this report verbatim, with `file:line` + before/after code.

## Step 4 — layer the CANVAS contract checks

Load the `canvas-port` skill (the contract) and add these lenses the generic UX review does not cover:

1. **Token-fork detection (CRITICAL).** Grep the components + wrappers for literal hex / px / rem / font
   values that should be a token var — **regardless of which token tool the project uses** (Style-
   Dictionary is one option, not a requirement). Any hardcoded value that duplicates a `tokens.json`
   token is a forked single-source-of-truth — the #1 CANVAS anti-pattern. Fix: replace with
   `var(--token)` (or add to the contract + recompile). Cite `file:line`.
2. **Framework-residue detection (CRITICAL).** A Lit / Web-Components import (or a thin-wrapper pattern
   around a custom element) is fine **only when the resolved framework from Step 1 IS Web Components**.
   If the resolved framework is native (React, Vue, Svelte, Angular, Solid), any `lit`, `@lit/react`, or
   custom-element residue in the generated code is topology drift, not a valid implementation choice —
   flag it as a BLOCKER and cite the exact import/usage `file:line`.
3. **Composition semantics.** Confirm composition uses the resolved framework's native mechanism (named
   `<slot>` / `::part(...)` for Web Components; `children` / render-props for React/Solid; `<slot>` for
   Vue/Svelte; `ng-content` for Angular) per the component's `spec.yaml` override points — never a
   structural fork (a Pencil detach baked into code). Flag any component that re-arranges a descendant
   instead of composing it natively.
4. **Visual-oracle coverage.** Every canonical variant + state in the variant matrix has a story AND a
   visual-regression assertion, in **both** Light and Dark axes. An un-snapshotted variant is untested
   (WARNING). A suspiciously inflated snapshot `failureThreshold` to mask a diff is a finding (WARNING).
5. **Framework parity (Gate Parity, optional — only if the multi-framework Spread path was invoked; see
   future ADR-016).** No wrapper re-implements a component (it wraps the canonical native element) — a
   re-draw is a topology BLOCKER. Each wrapper handles its interop seam correctly (e.g. WC-interop:
   props-vs-attributes, CustomEvents, `CUSTOM_ELEMENTS_SCHEMA` / `isCustomElement` / `prop:`, when the
   native element being wrapped is a Web Component). The token contract is identical across wrappers (no
   forked values). Skip this lens entirely on a single-framework (default) run — note it as N/A.

## Step 5 — emit the bucketed report

```
# CANVAS Review — <Gate Code | Gate Parity (optional)>

**Resolved framework**: <React | Vue | Svelte | Angular | Solid | Web Components — from Step 1>
**Token tool**: <Style-Dictionary | other — from Step 1>
**Files reviewed**: <count>
**UX laws checked**: 30 (via /laws-of-ux:ux-review)
**CANVAS contract checks**: token-fork | framework-residue | composition-semantics | visual-oracle | framework-parity (N/A unless Spread invoked)
**Verdict**: PASS | CONCERNS | BLOCKER

---

## Critical / BLOCKER (must fix)

### <Law name or CANVAS check> — <category>
- **File**: `path/to/file.ts:42`
- **Issue**: <what violates the law / contract and why it matters>
- **Fix**:
  ```ts
  // Before
  background: #C2410C;
  // After
  background: var(--color-accent-primary);
  ```

---

## Warnings (should fix)
[same format]

---

## Suggestions (nice to have)
[same format]

---

## Summary
- UX laws: <N> findings (<list>)
- CANVAS contract: token-fork <n> | framework-residue <n> | composition <n> | visual-oracle <n> | parity <n or N/A>
- Verdict rationale: <one line>
```

## Notes

- **Verdict mapping for the gate.** Any forked token, any framework residue (Lit/Web-Components code when
  the resolved framework is native), or any wrapper re-implementation (when Gate Parity applies) ->
  **BLOCKER**. Missing visual-oracle coverage or a real UX-law Critical -> **CONCERNS**. Only Suggestions
  -> **PASS**. The coordinator returns CONCERNS/BLOCKER to the producing phase (Assemble, or Spread when
  invoked); on PASS it emits `NEEDS_ACTIVATION` for the generated Storybook / component artifact.
- **Always** give a concrete before/after, never theory. Group multiple hits of the same law/check in one
  file together. Skip files with no findings.
- **Honest tool reporting** — if `/laws-of-ux:ux-review` or a test runner cannot run, report it as
  CONCERNS ("tool unavailable"), never a silent PASS.
- This command is the wrapped, contract-aware lens; the gate still also dispatches the independent
  `Task` reviewers (generator != verifier).
