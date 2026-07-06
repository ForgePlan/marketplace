# R_eff Scoring System

## R_eff Formula

R_eff (effective reliability) measures how much a decision or artifact can be trusted, based on the evidence that supports it:

```
R_eff = min(evidence_scores)
```

Where each evidence item's score is:

```
score = verdict_score - CL_penalty   (clamped to 0)
```

- **verdict_score**: `Supports` = 1.0, `Weakens` = 0.5, `Refutes` = 0.0.
- **CL_penalty**: Congruence Level penalty (see table below) — applied per evidence item, not to the final score.
- Expired evidence (past `valid_until`) is forced to `0.1` regardless of verdict — stale, not absent.

R_eff is a **weakest-link** score, never an average or weighted sum: trust equals the single most damaging piece of evidence, not the mean of all evidence.

## F-G-R Breakdown

F-G-R (Formality / Granularity / Reliability) is a separate metric from R_eff — it scores **artifact quality**, not decision trust. The three axes are computed independently and combined as a **geometric mean**, which penalizes imbalance more than a weighted sum would:

```
F-G-R quality = (Formality * Granularity * Reliability) ^ (1/3)
```

### Formality (F)
- Schema compliance: percentage of an artifact's validation rules (required fields/sections) that pass.
- `F = passed_checks / total_checks`

### Granularity (G)
- Content completeness: does the artifact have real substance in its Problem/Goals/Requirements/Related sections, or just stubs?
- Vague, thin sections score low; specific, substantive sections score high.

### Reliability (R)
- Trust score derived from the artifact's own R_eff, its link count, and its freshness.
- R_eff contributes the largest share of the score; additional links add a small bonus (capped); a non-stale artifact gets a freshness bonus.
- A stale artifact (past `valid_until`) scores lower even at the same R_eff.

## Congruence Levels

Congruence Level (CL) is a per-evidence-item penalty applied inside the R_eff formula above — it does not classify the final composite score.

| CL | Penalty | Meaning |
|----|---------|---------|
| CL3 | 0.0 | Fully congruent — no penalty |
| CL2 | 0.1 | Minor incongruence |
| CL1 | 0.4 | Significant incongruence |
| CL0 | 0.9 | Barely congruent — evidence nearly disqualified |

## Evidence Freshness

Evidence carries a `valid_until` TTL rather than a continuously decaying weight. Once `valid_until` has passed, the evidence item's score is fixed at `0.1` regardless of its verdict — expired evidence is treated as stale, not simply absent.

Triggers for re-verification:
- Code in the evidenced area was modified.
- Dependencies were updated.
- More than 30 days have passed on active code.

## Interpreting Scores

- **R_eff > 0.8**: Strong alignment. Ship with confidence.
- **R_eff 0.6-0.8**: Acceptable but gaps exist. Review before shipping.
- **R_eff 0.4-0.6**: Significant gaps. Address before shipping.
- **R_eff < 0.4**: Misalignment. Re-evaluate requirements or implementation.
