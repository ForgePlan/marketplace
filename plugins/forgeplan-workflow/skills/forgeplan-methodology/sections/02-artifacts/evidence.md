# Evidence Artifact

## When to Create

Create evidence after completing an implementation to link the work back to its PRD. Evidence answers: "Does the implementation match the requirements?"

## How to Create

```bash
forgeplan new evidence "Brief description of what was verified"
```

## Required Fields

- **verdict**: `PASS` or `FAIL` — does the implementation meet requirements?
- **congruence_level**: How closely the implementation matches the PRD.
  - `CL1`: Exact match — all FRs and NFRs met precisely.
  - `CL2`: Minor deviations — small acceptable differences.
  - `CL3`: Partial match — some requirements met, others deferred.
  - `CL4`: Significant deviation — major differences from PRD.
  - `CL5`: No match — implementation does not address the PRD.
- **evidence_type**: How the verification was done.
  - `test_result`: Automated test output.
  - `code_review`: Manual code inspection.
  - `manual_verification`: Manual testing or demonstration.
  - `benchmark`: Performance measurement.
- **linked_artifact**: The PRD (or other artifact) this evidence relates to.
- **summary**: What was checked and what the results were.

## Evidence Decay

Evidence loses value over time. After major code changes, re-verify:
- Evidence older than 30 days on actively changed code should be refreshed.
- Use `forgeplan health` to detect stale evidence.

## Tips

- Create evidence even for FAIL verdicts — they document what did not work.
- Multiple evidence artifacts can link to the same PRD.
- Include test output or screenshots in the summary when possible.
