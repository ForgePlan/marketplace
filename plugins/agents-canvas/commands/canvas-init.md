---
name: canvas-init
description: One-time per-branch setup for the CANVAS tokens-gate. Initialises the per-branch state file the canvas-gate.sh PreToolUse hook reads (phase, guarded package globs, tokens-RFC + active flag). Without it the gate is dormant and design-system writes are unguarded. Usage: /canvas-init [guarded-globs]
---

# /canvas-init — arm the CANVAS tokens-gate for this branch

`/canvas` enforces "no design-system source before the token contract is active" with the
`canvas-gate.sh` PreToolUse hook (hook-gate=YES, spec section 9 LOCKED DECISION 5). That hook
hard-blocks `Write`/`Edit`/`MultiEdit` to `packages/design-system/**` (and the framework wrapper
packages) **until the tokens RFC is active**. To do that it needs a per-branch **state file** —
`.forgeplan/canvas/state-<branch-slug>.json`. This command creates it. Run it **once per branch**
before the first `/canvas` cycle (re-run to change the guarded globs).

## Why this is required

The hook cannot call MCP — it must read state fast and locally. With no state file the gate treats
CANVAS as **inactive on this branch and allows everything** (zero enforcement). The state file is the
per-branch binding that turns the methodology into a concrete fail-closed gate. It is the C5
enforcement lever of the AD/AID-PDLC sub-cycle contract (ADR-010): the `canvas-coordinator` writes
phase + tokens transitions through `canvas-lib.sh`; the hook only reads them.

## Procedure

### Step 1 — confirm the guarded package paths

The default guarded globs cover the canonical design-system package plus the framework wrapper
packages (pipe-delimited; a trailing `/**` marks a subtree):

```
packages/design-system/**|packages/design-system-*/**|packages/canvas-*/**|packages/*-canvas/**
```

Confirm against the real repo layout (LOCKED DECISION 6 default is `packages/design-system`). If the
React/Vue/Svelte/Angular/Solid wrappers live elsewhere (e.g. `packages/ui-react/**`), pass an explicit
override as the argument. Over-guarding is the safe direction — the gate fail-closes on a guarded path.

### Step 2 — write the per-branch state

```bash
LIB="${CLAUDE_PLUGIN_ROOT}/hooks/scripts/canvas-lib.sh"
SLUG="$(bash "$LIB" slug)"

# default guarded globs:
bash "$LIB" init "$SLUG"
# OR explicit override:
bash "$LIB" init "$SLUG" "packages/design-system/**|packages/ui-*/**"
```

This writes `.forgeplan/canvas/state-<slug>.json` at `phase: "design"`, `tokens_active: false`.
**From this point the gate is armed**: any write to a guarded path is denied until the tokens RFC is
active.

### Step 3 — show the result + next step

```bash
bash "$LIB" get "$SLUG"
```

Tell the user CANVAS is armed: run `/canvas` (or route a design-system slice through `/smith`) to start
the Capture -> Audit -> Norm-check -> Vectorize -> Assemble -> Spread walk. The gate stays closed on
`packages/design-system/**` until Gate V passes and the tokens RFC is activated — at which point the
`canvas-coordinator` runs `canvas-lib.sh set-tokens <slug> RFC-NNN true` to unlock the Coder.

## State shape

```json
{
  "phase": "design",
  "tokens_rfc": "",
  "tokens_active": false,
  "guarded_globs": "packages/design-system/**|packages/*-canvas/**",
  "override": false,
  "started_at": "2026-06-26T00:00:00Z",
  "phase_entered_at": "2026-06-26T00:00:00Z"
}
```

- `tokens_active` — the C5 lever. `false` blocks every guarded write; `true` unlocks them. Only the
  `canvas-coordinator` flips it to `true`, and only after Gate V PASS + the tokens RFC is `active` in
  ForgePlan. Never flip it by hand to "move things along" — that defeats the gate.
- `guarded_globs` — the package subtrees the gate protects. Pipe-delimited; trailing `/**` = subtree.
- `override` — a logged human escape hatch for legitimate non-design-system edits.

## State CLI (the canvas-coordinator uses these; the hook only reads)

```bash
bash "$LIB" init <slug> [guarded_globs]      # arm the gate (phase=design, tokens inactive)
bash "$LIB" set-phase <slug> <phase>          # design|audit|port|tokens-pending|assemble|spread|done
bash "$LIB" set-tokens <slug> RFC-NNN true    # C5 UNLOCK — only after Gate V PASS + RFC active
bash "$LIB" set-override <slug> true|false     # log a human override
bash "$LIB" get <slug> [field]                # read state
```

## Escape hatches (bounded, audited)

- **Throwaway spikes:** write under a `.canvas-scratch/` segment (gitignored) — always allowed, even
  before the tokens RFC is active. It is never the committed design-system.
- **Legitimate non-DS edit:** set a logged override — `CANVAS_GATE_OVERRIDE=1` (env) or
  `bash "$LIB" set-override <slug> true` — recorded in state for audit. Never use it to write actual
  design-system source early; that defeats C5.

## HARD RULES

1. **Run once per branch before `/canvas`.** No state file -> the gate is dormant -> no enforcement.
2. **Confirm the guarded globs against the real repo layout.** A wrong glob either over-blocks
   (annoying but safe) or under-blocks (silently unguards the design-system — the gate's whole job).
3. **Never hand-edit `tokens_active` to `true`.** Only the `canvas-coordinator` flips it, and only on
   Gate V PASS with the tokens RFC `active`. The flag is the contract's enforcement lever.
4. **This command does not start a cycle** — it only arms the gate. `/canvas` does the walk.

## Related

- `/canvas` — the methodology walk this gate enables (`skills/canvas/SKILL.md`).
- `canvas-coordinator` agent — the master that writes phase + tokens transitions.
- `hooks/scripts/canvas-gate.sh` + `hooks/scripts/canvas-lib.sh` — the C5 enforcement layer.
- RFC-021 (the CANVAS spec, FR-5/FR-6), ADR-010 C5 (the enforcement element), ADR-012 (the hook-gate test).
