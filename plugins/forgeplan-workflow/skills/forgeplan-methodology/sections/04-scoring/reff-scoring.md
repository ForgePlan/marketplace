# R_eff Scoring System

## R_eff Formula

R_eff (Requirement Effectiveness) measures how well implementation matches requirements:

```
R_eff = (F * w_f + G * w_g + R * w_r) * decay_factor
```

Where:
- **F** (Fulfillment): Percentage of functional requirements met (0-1).
- **G** (Granularity): Quality of requirement specification (0-1).
- **R** (Rigor): Strength of evidence supporting the claim (0-1).
- **w_f, w_g, w_r**: Weights (default: 0.5, 0.25, 0.25).
- **decay_factor**: Time-based decay applied to evidence freshness.

## F-G-R Breakdown

### Fulfillment (F)
- Count FRs marked as met vs total FRs.
- Partial credit for partially met requirements.
- `F = met_count / total_count`

### Granularity (G)
- Are requirements specific and testable?
- Vague requirements ("should be fast") score low.
- Measurable requirements ("p99 latency < 200ms") score high.

### Rigor (R)
- `test_result` evidence scores higher than `manual_verification`.
- Multiple evidence sources increase rigor.
- Stale evidence reduces rigor.

## Congruence Levels

| Level | Score Range | Meaning |
|-------|------------|---------|
| CL1 | 0.9 - 1.0 | Exact match, all requirements met |
| CL2 | 0.7 - 0.89 | Minor deviations, acceptable |
| CL3 | 0.5 - 0.69 | Partial match, gaps exist |
| CL4 | 0.3 - 0.49 | Significant deviation |
| CL5 | 0.0 - 0.29 | No meaningful match |

## Evidence Decay

Evidence freshness decreases over time:

```
decay_factor = max(0.1, 1.0 - (days_since_evidence / decay_window))
```

Default `decay_window` is 90 days. After 90 days, evidence retains only 10% of its original weight.

Triggers for re-verification:
- Code in the evidenced area was modified.
- Dependencies were updated.
- More than 30 days have passed on active code.

## Interpreting Scores

- **R_eff > 0.8**: Strong alignment. Ship with confidence.
- **R_eff 0.6-0.8**: Acceptable but gaps exist. Review before shipping.
- **R_eff 0.4-0.6**: Significant gaps. Address before shipping.
- **R_eff < 0.4**: Misalignment. Re-evaluate requirements or implementation.
