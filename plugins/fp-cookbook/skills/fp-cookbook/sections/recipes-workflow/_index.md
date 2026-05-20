# recipes-workflow

Recipes for running the full forgeplan SDLC cycle efficiently.

## Contents

| File | Description | Lines |
|------|-------------|-------|
| [route-shape-build-audit-activate.md](route-shape-build-audit-activate.md) | Full Route→Shape→Build→Audit→Activate SDLC with /forge-cycle references | 60 |
| [wave-based-dispatch.md](wave-based-dispatch.md) | File-isolated parallel sub-agent pattern (Sprint A-O: 0 merge conflicts) | 52 |
| [dogfood-inline-activate.md](dogfood-inline-activate.md) | Sprint D discipline: activate PRDs+EVIDs immediately, no draft pile | 48 |

## When to use which pattern

| Scenario | Recipe |
|----------|--------|
| Starting a new feature end-to-end | route-shape-build-audit-activate.md |
| Building ≥3 files in parallel | wave-based-dispatch.md |
| EVID accumulating in draft | dogfood-inline-activate.md |
