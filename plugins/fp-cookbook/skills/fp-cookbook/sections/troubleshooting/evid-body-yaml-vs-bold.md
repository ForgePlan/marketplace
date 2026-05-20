# Evidence YAML Frontmatter vs Bold-Pattern Body (Anomaly #17)

## Симптом

`forgeplan score EVID-NNN` returns R_eff=0 or congruence_level=0 even though
the EVID body clearly states `congruence_level: 3` in its YAML frontmatter.

## Root cause

Forgeplan's EVID parser only reads `congruence_level`, `verdict`, and `evidence_type`
from **markdown bold-pattern** in the body. YAML frontmatter fields beyond `name`,
`id`, `status`, and `kind` are silently ignored (Anomaly #17, Sprint L EVID-064).

There is no error message. The score just returns 0 as if no fields were set.

## Fix

```bash
# Wrong — silently ignored
---
congruence_level: 3
verdict: Supports
evidence_type: verification
---

# Correct — parsed from body bold-pattern
**Congruence level**: 3
**Verdict**: Supports
**Evidence type**: verification
```

Move these three lines from YAML frontmatter into the markdown body.
Position them at the top of the body, before the Summary section.

## Diagnosis script

```bash
# Check if an EVID has the fields in the wrong place
forgeplan get EVID-NNN | grep -E "congruence|verdict|evidence_type"
# If output shows nothing, the body may be using YAML-only format
# Read the raw body and check for bold-pattern
```

## Canonical EVID structure

```markdown
# EVID-NNN: Title

**Congruence level**: 3
**Verdict**: Supports
**Evidence type**: verification

## Summary
...
## Findings
...
```

## Common errors

| Error | Fix |
|-------|-----|
| CL=0 despite body has `**congruence_level**: 3` (lowercase) | Field names are case-sensitive: `**Congruence level**: 3` |
| CL=0 after fix | Re-run `forgeplan score EVID-NNN` — cached value may be stale |
| `**Verdict**: supports` (lowercase) → not parsed | Must be `Supports` (capital S) |

## Refs

- EVID-064 (active) — first surfacing of Anomaly #17 (Sprint L)
- mm-evid-body-convention — mental model explaining the bold-pattern requirement
- `bold-pattern-body.md` in recipes-evidence — full body template
