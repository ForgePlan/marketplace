# troubleshooting

Recipes for diagnosing and fixing the most impactful Sprint A-O anomalies.
Each recipe: symptom → root cause → fix command → prevention.

## Contents

| File | Description | Anomaly # | Lines |
|------|-------------|:---------:|-------|
| [r-eff-cascade-fix.md](r-eff-cascade-fix.md) | based_on link causes R_eff to cascade downward; CLI unlink fix | #5 | 55 |
| [evid-stuck-draft.md](evid-stuck-draft.md) | Profile B cannot activate EVID; orchestrator must do it | #7 | 48 |
| [restore-returns-draft.md](restore-returns-draft.md) | forgeplan_restore returns artifact to draft, not prior status | #13 | 46 |
| [evid-body-yaml-vs-bold.md](evid-body-yaml-vs-bold.md) | congruence_level in YAML silently ignored; use bold-pattern | #17 | 52 |
| [link-direction-footgun.md](link-direction-footgun.md) | Inverted supersedes/informs links silently accepted; detect + fix | #15/#16 | 58 |

## Anomaly severity index

| # | Short name | Impact | Status |
|---|-----------|--------|--------|
| 5 | R_eff cascade | HIGH — lowers scores silently | Partial fix CLI v0.31.0 |
| 7 | EVID stuck draft | HIGH — invisible work | AUTO via /forge-cycle |
| 13 | restore→draft | MEDIUM — extra activate step | Upstream #291 open |
| 17 | YAML fields ignored | HIGH — CL=0 silent fail | Workaround: bold-pattern |
| 15/16 | Link direction | MEDIUM — wrong graph semantics | Detection: detect_link_footguns.sh |
