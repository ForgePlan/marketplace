# Hit R_eff ≥ 0.9 (Grade A) on First Scoring

## Цель

Author an Evidence artifact that scores R_eff ≥ 0.9 on the first
`forgeplan score` call — avoiding re-work cycles.

## The three levers

| Lever | Target | How |
|-------|--------|-----|
| Congruence level | CL = 3 | All ACs verified in body |
| Verdict | Supports | Use `**Verdict**: Supports` (exact capitalisation) |
| Relations | informs (not based_on) | `forgeplan link EVID PRD --relation informs` |

All three must be correct simultaneously. Fixing two out of three still leaves R_eff < 0.9.

## Команда

```bash
# 1. Create evidence
forgeplan new evidence "Feature X verification"

# 2. Write body with bold-pattern fields + all AC verification findings

# 3. Link correctly
forgeplan link EVID-NNN PRD-NNN --relation informs

# 4. Activate (Profile B denied activate — orchestrator does this)
forgeplan activate EVID-NNN

# 5. Score the parent PRD
forgeplan score PRD-NNN
# Expected: R_eff ≥ 0.9, grade A
```

## Scoring formula (simplified)

```
R_eff = CL_score × verdict_multiplier × relation_penalty_factor
```

- CL 3 + Supports + informs  →  R_eff ≈ 1.0
- CL 3 + Supports + based_on →  R_eff ≈ 0.6–0.7 (cascade applies)
- CL 2 + Supports + informs  →  R_eff ≈ 0.7
- CL 1 + anything            →  R_eff < 0.5

## Пример (EVID-060 Sprint E)

```
**Congruence level**: 3
**Verdict**: Supports
**Evidence type**: verification

Findings: AC-1 ✅ ... AC-7 ✅ (all 7 Sprint E ACs verified)
```

```
$ forgeplan score PRD-033
R_eff: 1.0  grade: A
weakest_link: none
```

## Common errors

| Error | Fix |
|-------|-----|
| R_eff = 0 after activate | Anomaly #17 — CL in YAML not body; see `bold-pattern-body.md` |
| R_eff ≈ 0.6 despite CL=3 | Check relation: likely based_on; switch to informs |
| Grade A but R_eff = 0.9 not 1.0 | Usually an unrelated weak link in dep chain — `forgeplan score` shows weakest_link |
| EVID stays draft, score not computed | Activate EVID first: `forgeplan activate EVID-NNN` |

## Refs

- EVID-060 (active, R_eff=1.0) — Sprint E canonical Grade A example
- mm-evid-body-convention — mental model for bold-pattern
- mm-pipeline-anomalies — 3-tier resolution for scoring failures
- `bold-pattern-body.md` — body template
- `informs-not-based-on.md` — link direction details
