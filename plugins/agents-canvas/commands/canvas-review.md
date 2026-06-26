---
name: canvas-review
description: CANVAS post-export code + UX gate. Wraps /laws-of-ux:ux-review on the generated Storybook / Web Component / framework-wrapper code and adds CANVAS-specific lenses (token-fork detection, slot/part semantics, visual-oracle coverage, framework parity). Bucketed findings with file:line + before/after. Used at Gate Code (Assemble) and Gate Parity (Spread).
---

# /canvas-review — post-export code + UX gate

You are running the CANVAS **code-boundary** gate. The `laws-of-ux` hook keys on frontend file edits via
`Write`/`Edit`, so it **never fires on `.pen`** design edits (done via `mcp__pencil__*`). `/canvas-review`
is therefore where UX-law enforcement meets the **generated** code: the Lit Web Components, the
Style-Dictionary theme, the `*.stories.ts`, and the React/Vue/Svelte/Angular/Solid wrappers. It **wraps**
`/laws-of-ux:ux-review` and layers the four CANVAS contract checks on top.

Run this at **Gate Code** (over the Assemble output) and again at **Gate Parity** (over each framework's
Spread output). It does not replace the independent `Task` reviewers (`code-reviewer` + `tester` +
`laws-of-ux:ux-reviewer`) — it is the consolidated UX + contract lens the gate also applies.

## Step 1 — detect the stack

Scan to confirm the locked CANVAS topology (do not assume):
- `package.json` — `@storybook/web-components` (the framework), `lit`, `style-dictionary`, and any
  framework wrapper deps (`@lit/react`, `vue`, `svelte`, `@angular/core`, `solid-js`).
- Storybook config — `.storybook/main.*` `framework: '@storybook/web-components-vite'` (or equivalent),
  `.storybook/test-runner.*` (the visual-regression `postVisit` hook).
- Token build — `style-dictionary.config.*`, the emitted `theme.light.css` / `theme.dark.css`.
- Note the detected stack in the report header. If the stack is NOT the CANVAS topology (e.g. a React
  component library with no Web Components), say so and route to plain `/laws-of-ux:ux-review` instead.

## Step 2 — scope the generated files

Review only **generated** code (skip `node_modules`, `dist`, `storybook-static`, `__image_snapshots__`):
- Web Components: `*.ts` Lit elements under `packages/design-system/src/**`.
- Theme: `theme.*.css` + any component `static styles`.
- Stories: `*.stories.ts`.
- Wrappers (Gate Parity): `*.tsx` (React/Solid), `*.vue`, `*.svelte`, `*.ts` (Angular).
- Tests: `*.spec.ts`, the test-runner hook.

## Step 3 — run the wrapped UX review

Invoke `/laws-of-ux:ux-review` on the scoped files (it loads the `ux-laws` knowledge base and checks the
30 laws — Fitts touch targets, Hick choice count, Miller chunking, Doherty loading states, Von Restorff
one-distinct-CTA, the Gestalt grouping laws, etc.). Carry its Critical/Warning/Suggestion findings into
this report verbatim, with `file:line` + before/after code.

## Step 4 — layer the four CANVAS contract checks

Load the `canvas-port` skill (the contract) and add these lenses the generic UX review does not cover:

1. **Token-fork detection (CRITICAL).** Grep the components + wrappers for literal hex / px / rem / font
   values that should be a token var. Any hardcoded value that duplicates a `tokens.json` token is a
   forked single-source-of-truth — the #1 CANVAS anti-pattern. Fix: replace with `var(--token)` (or add
   to the contract + recompile). Cite `file:line`.
2. **Slot / part / override semantics.** Confirm composition uses named `<slot>`, CSS custom properties,
   or `::part(...)` per the component's `spec.yaml` override points — never a structural fork (a Pencil
   detach baked into code). Flag any component that re-arranges a descendant instead of slotting it.
3. **Visual-oracle coverage.** Every canonical variant + state in the variant matrix has a story AND a
   visual-regression assertion, in **both** Light and Dark axes. An un-snapshotted variant is untested
   (WARNING). A suspiciously inflated snapshot `failureThreshold` to mask a diff is a finding (WARNING).
4. **Framework parity (Gate Parity only).** No wrapper re-implements a component (it wraps the canonical
   element) — a re-draw is a topology BLOCKER. Each framework handles its WC-interop seam correctly
   (props-vs-attributes, CustomEvents, `CUSTOM_ELEMENTS_SCHEMA` / `isCustomElement` / `prop:`). The token
   contract is identical across wrappers (no forked values).

## Step 5 — emit the bucketed report

```
# CANVAS Review — <Gate Code | Gate Parity>

**Stack**: <Storybook web-components + Lit + Style-Dictionary [+ wrappers]>
**Files reviewed**: <count>
**UX laws checked**: 30 (via /laws-of-ux:ux-review)
**CANVAS contract checks**: token-fork | slot/part | visual-oracle | framework-parity
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
- CANVAS contract: token-fork <n> | slot/part <n> | visual-oracle <n> | parity <n>
- Verdict rationale: <one line>
```

## Notes

- **Verdict mapping for the gate.** Any forked token or any wrapper re-implementation -> **BLOCKER**.
  Missing visual-oracle coverage or a real UX-law Critical -> **CONCERNS**. Only Suggestions -> **PASS**.
  The coordinator returns CONCERNS/BLOCKER to the producing phase (Assemble or Spread); on PASS it emits
  `NEEDS_ACTIVATION` for the Storybook / framework artifact.
- **Always** give a concrete before/after, never theory. Group multiple hits of the same law/check in one
  file together. Skip files with no findings.
- **Honest tool reporting** — if `/laws-of-ux:ux-review` or a test runner cannot run, report it as
  CONCERNS ("tool unavailable"), never a silent PASS.
- This command is the wrapped, contract-aware lens; the gate still also dispatches the independent
  `Task` reviewers (generator != verifier).
