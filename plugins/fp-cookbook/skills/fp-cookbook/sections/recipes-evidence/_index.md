# recipes-evidence

Recipes for authoring Evidence artifacts that score well (R_eff ≥ 0.9)
and pass congruence checks correctly.

## Contents

| File | Description | Lines |
|------|-------------|-------|
| [bold-pattern-body.md](bold-pattern-body.md) | **CRITICAL** — Anomaly #17: use markdown bold not YAML frontmatter for congruence_level/verdict/evidence_type | 58 |
| [informs-not-based-on.md](informs-not-based-on.md) | Anomaly #5: based_on cascades R_eff penalty; use informs for EVID→PRD links | 50 |
| [r-eff-grade-a.md](r-eff-grade-a.md) | How to hit R_eff ≥ 0.9 on first scoring: CL3 + Supports + correct relations | 55 |

## Most common Evidence mistake

Anomaly #17: Writing `congruence_level: 3` in YAML frontmatter.
This is **silently ignored**. Use `**Congruence level**: 3` in the body.
See `bold-pattern-body.md` for the full pattern.

## New in v0.32.1 — `parent_id` auto-link

`forgeplan new evidence "..." --parent PRD-NNN` creates the `informs` link in a single call
(response includes `auto_linked: "PRD-NNN"`). This 2-step pattern is now canonical PRIMARY
in `r-eff-grade-a.md` — use the 3-step fallback only when parent is unknown at creation time.
Ref: forgeplan#295, PRD-046 Sprint T Wave D.
