# Evidence Body: Bold-Pattern Convention (Anomaly #17)

## Цель

Author an Evidence artifact whose `congruence_level`, `verdict`, and
`evidence_type` are actually parsed by forgeplan scoring — not silently ignored.

## The rule

**Custom fields in YAML frontmatter are IGNORED.**
Forgeplan only reads these fields from **markdown bold-pattern** in the body:

```markdown
**Congruence level**: 3
**Verdict**: Supports
**Evidence type**: verification
```

## Команда

```bash
# Create the evidence
forgeplan new evidence "Sprint P fp-cookbook verification"
# → EVID-NNN (draft)

# Edit the body — include EXACTLY these bold lines:
```

## Canonical body template

```markdown
# EVID-NNN: Sprint P fp-cookbook verification

**Congruence level**: 3
**Verdict**: Supports
**Evidence type**: verification

## Summary

<What was verified and what was the result>

## Findings

- AC-1: ✅ plugin.json valid JSON, name=fp-cookbook, version=1.0.0
- AC-2: ✅ SKILL.md has YAML frontmatter + 8-section nav table
- AC-3: ✅ 8 sections with _index.md, ≥25 recipe files total
- AC-4: ✅ Total LOC 1500-2000
- AC-5: ✅ ≥10 real artifact references (PRD-NNN / EVID-NNN)
- AC-6: ✅ troubleshooting/ has 5 anomaly recipes
- AC-7: ✅ cli-cheatsheet/ CLI + MCP refs present
- AC-8: ✅ validate-all-plugins.sh ALL PASSED

## Refs

PRD-NNN — informs
```

## Congruence level scale

| Level | Meaning |
|-------|---------|
| 1 | Partially supports — some ACs not met |
| 2 | Mostly supports — minor gaps |
| 3 | Fully supports — all ACs verified |

## Common errors

| Error | Fix |
|-------|-----|
| Anomaly #17: `congruence_level: 3` in YAML → score stays 0 | Move to body: `**Congruence level**: 3` |
| `**Verdict**: supports` (lowercase) | Capitalise: `**Verdict**: Supports` |
| Missing `**Evidence type**` line | Add `**Evidence type**: verification` |
| Score does not update after body edit | Re-run `forgeplan score EVID-NNN` after editing |

## Refs

- EVID-064 (active) — first time Anomaly #17 was surfaced (Sprint L)
- mm-evid-body-convention — mental model: why frontmatter is ignored
- `troubleshooting/evid-body-yaml-vs-bold.md` — deeper diagnosis
