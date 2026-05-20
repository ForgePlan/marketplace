# Full SDLC: Route → Shape → Build → Audit → Activate

## Цель

Run the complete forgeplan SDLC pipeline for a standard-depth feature
without skipping gates or accumulating draft artifacts.

## The 5 stages

```
1. ROUTE   — determine scope and depth
2. SHAPE   — PRD: create + fill + validate
3. BUILD   — implement per RFC/PRD; compile/lint pass
4. AUDIT   — Evidence: create + bold-pattern body + link + activate
5. ACTIVATE — PRD activate (same session)
```

## Команда

```bash
# Stage 1 — Route
forgeplan route "describe your task"
# → returns: tactical / standard / deep / critical + risk flags

# Stage 2 — Shape
forgeplan new prd "Feature name"
# fill Vision / Goals / FRs / ACs
forgeplan validate PRD-NNN   # must PASS before proceeding

# Stage 3 — Build
# ... write code / content per PRD spec
# run: compile, lint, typecheck

# Stage 4 — Audit
forgeplan new evidence "Feature name verification"
# fill bold-pattern body (CL3 + Supports)
forgeplan link EVID-NNN PRD-NNN --relation informs
forgeplan activate EVID-NNN

# Stage 5 — Activate PRD
forgeplan activate PRD-NNN
```

## Stage gates

| Gate | Must pass before | What blocks |
|------|-----------------|-------------|
| `forgeplan validate` | BUILD | Missing sections, no FRs |
| Compile + lint | AUDIT | Code errors |
| `forgeplan score` | PRD activate | R_eff < threshold for depth=deep+ |

## /forge-cycle integration

If using the `/forge-cycle` skill, it handles stage sequencing automatically
including NEEDS_ACTIVATION sentinel parsing (added Sprint D, PRD-032).

## Common errors

| Error | Fix |
|-------|-----|
| Skipped validate → blocker at activate | Always validate before BUILD stage |
| EVID in draft at session end | Sprint D discipline: activate EVID in same session; see dogfood recipe |
| `forgeplan route` returns no depth | Routing works on keywords; if no risk-words, calibrate manually |

## Refs

- PRD-024 (active) — Full SDLC Pipeline foundation (9 phases, 9 kinds)
- PRD-032 (active) — NEEDS_ACTIVATION sentinel + /forge-cycle integration
- RFC-002 (active) — Canonical pipeline architecture
- `dogfood-inline-activate.md` — Stage 5 discipline detail
