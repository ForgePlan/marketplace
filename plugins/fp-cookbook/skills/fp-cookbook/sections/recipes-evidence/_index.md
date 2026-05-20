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
