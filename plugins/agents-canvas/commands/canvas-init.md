---
name: canvas-init
description: One-time per-branch setup for the CANVAS tokens-gate. Detects the project framework, derives the per-framework guarded globs, verifies them against disk, and writes the per-branch state file the canvas-gate.sh PreToolUse hook reads. Without it the gate is dormant and design-system writes are unguarded. Usage: /canvas-init [explicit-guarded-globs]
---

# /canvas-init — arm the CANVAS tokens-gate for this branch

`/canvas` enforces "no design-system source before the token contract is active" with the
`canvas-gate.sh` PreToolUse hook (hook-gate=YES, ADR-010 C5). That hook hard-blocks
`Write`/`Edit`/`MultiEdit` to the project's design-system paths **until the tokens RFC is active**.
To do that it needs a per-branch **state file** — `.forgeplan/canvas/state-<branch-slug>.json`.
This command creates it. Run it **once per branch** before the first `/canvas` cycle (re-run to
change the guarded globs or after a framework change).

**RFC-022 change:** the guarded globs are now **derived from the project's resolved framework**
rather than hard-coded to the monorepo wrapper layout. A native React app guards
`src/components/**|app/**|components/**`; Angular guards `src/app/**`; Web-Components projects
keep the original `packages/**` set unchanged. The derivation is confirmed against real on-disk
directories — a zero-match set is refused, never persisted silently (AC-10).

## Why this is required

The hook cannot call MCP — it must read state fast and locally. With no state file the gate treats
CANVAS as **inactive on this branch and allows everything** (zero enforcement). The state file is the
per-branch binding that turns the methodology into a concrete fail-closed gate. It is the C5
enforcement lever of the AD/AID-PDLC sub-cycle contract (ADR-010): the `canvas-coordinator` writes
phase + tokens transitions through `canvas-lib.sh`; the hook only reads them.

## Procedure

### Step 0 — detect the project framework (RFC-022 FR-2′)

Before deriving globs, resolve the framework by reading, in precedence order
(declared-intent first, per RFC-022 ADI H-B):

1. `AGENTS.md` — look for a `stack:` or framework declaration
2. `CLAUDE.md` — look for framework/stack statements
3. `package.json` `dependencies`/`devDependencies` — detect `react`, `next`, `vue`, `nuxt`,
   `@angular/core`, `solid-js`, `svelte`, `lit`, etc.
4. Lockfile / framework-config — `next.config.*`, `vite.config.*`, `angular.json`,
   `svelte.config.*`, etc.

**Always announce** the resolved framework even on a clean single-signal detection:
*"CANVAS Step 0: found framework react (resolved from package.json)."*

Branch logic:
- **Single clear signal** → announce + proceed to Step 1
- **Single tier yields >1 candidate** (e.g. both `react` and `vue` in package.json,
  no AGENTS.md/CLAUDE.md) → announce all + emit `<<NEED_USER_INPUT>>` (never pick silently)
- **Cross-tier conflict** (CLAUDE.md says Angular, package.json has React) → announce both + emit
  `<<NEED_USER_INPUT>>`
- **No framework detected** → emit `<<NEED_USER_INPUT>>` with the supported list:
  `react/next`, `vue/nuxt`, `svelte/sveltekit`, `angular`, `solid`, `web-components/lit`

Record the resolved `FRAMEWORK` value; it feeds Step 1.

### Step 1 — derive and verify the guarded globs (AC-1 / AC-10)

```bash
LIB="${CLAUDE_PLUGIN_ROOT}/hooks/scripts/canvas-lib.sh"
# Preview the derived glob set for the detected framework:
bash "$LIB" derive-globs "$FRAMEWORK"
```

The derivation table (conservative — over-guard, never under-guard):

| Framework | Derived guarded globs |
|---|---|
| `react` / `next` | `src/components/**\|app/**\|components/**` |
| `vue` / `nuxt` | `src/components/**` |
| `svelte` / `sveltekit` | `src/**` |
| `angular` | `src/app/**` |
| `solid` | `src/**` |
| `web-components` / `lit` | `packages/design-system/**\|packages/design-system-*/**\|packages/canvas-*/**\|packages/*-canvas/**` (original set, unchanged) |
| unknown / native | `src/**\|app/**\|components/**` (fail-SAFE catch-all) |

If the conventional path does not exist (non-standard layout, e.g. `app/ui/**`), `init-framework`
will warn + emit `<<NEED_USER_INPUT>>` rather than persisting a zero-match set. In that case pass
an **explicit glob override** to the next step.

### Step 2 — write the per-branch state (AC-1 / AC-9 / AC-10)

```bash
LIB="${CLAUDE_PLUGIN_ROOT}/hooks/scripts/canvas-lib.sh"
SLUG="$(bash "$LIB" slug)"

# Recommended (RFC-022): derive globs from detected framework + zero-match
# self-check + stamp state_schema_version (AC-1 / AC-10 / AC-9):
bash "$LIB" init-framework "$SLUG" "$FRAMEWORK"

# OR explicit glob override (non-conventional layout, e.g. app/ui/**):
bash "$LIB" init "$SLUG" "app/ui/**|src/design-system/**"
```

`init-framework` performs:
1. `derive_guarded_globs FRAMEWORK` → the framework-specific glob set
2. `canvas_verify_globs_on_disk` → counts how many glob-prefix directories exist on disk
   - Zero matches → prints `<<NEED_USER_INPUT>>` and returns without writing state (AC-10)
   - ≥1 match → proceeds
3. Writes `.forgeplan/canvas/state-<slug>.json` with `state_schema_version: "1"` (AC-9) so
   upgrade detection works on future re-inits

**From this point the gate is armed**: any write to a guarded path is denied until the tokens RFC
is active.

### Step 3 — show the result + next step

```bash
bash "$LIB" get "$SLUG"
```

Tell the user CANVAS is armed with the per-framework guarded globs. Run `/canvas` (or route a
design-system slice through `/smith`) to start the Capture → Audit → Norm-check → Vectorize →
Assemble walk. The gate stays closed on the guarded paths until Gate V passes and the tokens RFC
is activated — at which point the `canvas-coordinator` runs
`canvas-lib.sh set-tokens <slug> RFC-NNN true` to unlock the Coder.

## Upgrading from v0.3.0 (pre-RFC-022 installs)

If you have an existing branch with a v0.3.0 state file (wrapper-only
`packages/design-system/**` globs, no `state_schema_version`), the gate will **fail OPEN** for
a native in-app framework — those globs match nothing in `src/components/**` and every guarded
write passes through. Fix by running the migration:

```bash
LIB="${CLAUDE_PLUGIN_ROOT}/hooks/scripts/canvas-lib.sh"
SLUG="$(bash "$LIB" slug)"
# Detect stale state and re-derive to the native glob set:
bash "$LIB" migrate "$SLUG" "$FRAMEWORK"
```

`migrate` detects the stale state (no `state_schema_version` + wrapper-only globs), re-derives
the per-framework globs, verifies them on-disk (AC-10 self-check), and updates `guarded_globs` +
stamps `state_schema_version` in-place (preserving `phase`, `tokens_active`, `override`). If the
on-disk check fails, it emits `<<NEED_USER_INPUT>>` without updating — never silently persists
stale globs. See also AC-13 CHANGELOG in the plugin README.

## State shape (RFC-022 schema v1)

```json
{
  "phase": "design",
  "tokens_rfc": "",
  "tokens_active": false,
  "guarded_globs": "src/components/**|app/**|components/**",
  "override": false,
  "state_schema_version": "1",
  "framework": "react",
  "started_at": "2026-06-30T00:00:00Z",
  "phase_entered_at": "2026-06-30T00:00:00Z"
}
```

- `tokens_active` — the C5 lever. `false` blocks every guarded write; `true` unlocks them. Only the
  `canvas-coordinator` flips it to `true`, and only after Gate V PASS + the tokens RFC is `active` in
  ForgePlan. Never flip it by hand to "move things along" — that defeats the gate.
- `guarded_globs` — the per-framework design-system paths the gate protects. Pipe-delimited;
  trailing `/**` = subtree. Derived from the detected framework by `init-framework`.
- `state_schema_version` — `"1"` for RFC-022+ state. Absent in pre-RFC-022 (v0.3.0) state; the
  gate-side `migrate` command detects the absence as a stale-state signal.
- `framework` — the resolved framework name recorded at init time (informational; used by `migrate`).
- `override` — a logged human escape hatch for legitimate non-design-system edits.

## State CLI (the canvas-coordinator uses these; the hook only reads)

```bash
bash "$LIB" init-framework <slug> <framework>  # RFC-022: derive + verify + arm (recommended)
bash "$LIB" init <slug> [guarded_globs]         # legacy: explicit glob (non-conventional layouts)
bash "$LIB" migrate <slug> <framework>          # RFC-022 AC-9: migrate stale v0.3.0 state
bash "$LIB" derive-globs <framework>            # RFC-022: preview derived globs without writing
bash "$LIB" set-phase <slug> <phase>            # design|audit|port|tokens-pending|assemble|done
bash "$LIB" set-tokens <slug> RFC-NNN true      # C5 UNLOCK — only after Gate V PASS + RFC active
bash "$LIB" set-override <slug> true|false      # log a human override
bash "$LIB" get <slug> [field]                  # read state (or one field)
```

## Escape hatches (bounded, audited)

- **Throwaway spikes:** write under a `.canvas-scratch/` segment (gitignored) — always allowed, even
  before the tokens RFC is active. It is never the committed design-system.
- **Legitimate non-DS edit:** set a logged override — `CANVAS_GATE_OVERRIDE=1` (env) or
  `bash "$LIB" set-override <slug> true` — recorded in state for audit. Never use it to write actual
  design-system source early; that defeats C5.
- **Non-conventional layout:** pass explicit globs to `init` (e.g. `app/ui/**|src/ds/**`) when the
  conventional framework path does not exist and `init-framework` emits `<<NEED_USER_INPUT>>`.

## HARD RULES

1. **Run once per branch before `/canvas`.** No state file → the gate is dormant → no enforcement.
2. **Use `init-framework` (not bare `init`) for any framework that has a native in-app layout.**
   A bare `init` with no glob arg writes the legacy `packages/**` default, which guards nothing in
   `src/components/**` and fails OPEN for native frameworks (the verified DD-7 hazard).
3. **Never hand-edit `tokens_active` to `true`.** Only the `canvas-coordinator` flips it, and only on
   Gate V PASS with the tokens RFC `active`. The flag is the contract's enforcement lever.
4. **After upgrading from v0.3.0, run `migrate` on every existing branch.** Stale persisted globs
   silently fail OPEN for native framework layouts until migrated (AC-9 / RFC-022 R-1).
5. **This command does not start a cycle** — it only arms the gate. `/canvas` does the walk.

## Related

- `/canvas` — the methodology walk this gate enables (`skills/canvas/SKILL.md`).
- `canvas-coordinator` agent — the master that writes phase + tokens transitions.
- `hooks/scripts/canvas-gate.sh` + `hooks/scripts/canvas-lib.sh` — the C5 enforcement layer.
- RFC-022 (AC-1/AC-9/AC-10/AC-11 острый-gate repair), RFC-021 (the CANVAS spec, FR-5/FR-6),
  ADR-010 C5 (the enforcement element), ADR-012 (the hook-gate test).
