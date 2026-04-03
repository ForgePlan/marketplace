# Quality Gates

## Verification Gate

The verification gate runs during `forgeplan review <ARTIFACT-ID>` and checks:

1. **Completeness**: All required sections of the artifact are filled in.
2. **Evidence linkage**: At least one evidence artifact is linked (for Standard+).
3. **Test passage**: Linked test evidence shows PASS verdict.
4. **Congruence threshold**: Evidence congruence level meets the minimum for the depth.
   - Standard: CL3 or better.
   - Deep: CL2 or better.
   - Critical: CL1 required.

If any check fails, the review blocks activation and reports what needs fixing.

## Adversarial Review

For Deep and Critical tasks, forgeplan supports adversarial review — a structured challenge process:

1. **Devil's Advocate**: Challenge every assumption in the RFC/ADR. Ask "what if this assumption is wrong?"
2. **Failure Mode Analysis**: For each decision, identify how it could fail and what the blast radius would be.
3. **Alternative Challenge**: For each option rejected in the RFC, argue why it might actually be better.

Run adversarial review with:
```bash
forgeplan review --adversarial <ARTIFACT-ID>
```

The adversarial reviewer produces:
- **Challenged assumptions**: List of assumptions that may not hold.
- **Risk scenarios**: Failure modes with likelihood and impact.
- **Strengthening suggestions**: How to make the decision more robust.

## Pre-commit Quality Checks

The forgeplan-workflow plugin includes hooks that run before code changes:

- **Safety hook**: Blocks dangerous commands (force push, hard reset, rm -rf /).
- **PRD check**: Warns if code is being edited without an active PRD.

The **safety hook blocks** dangerous commands (exits non-zero — the command will not execute). The **PRD check is advisory** — it warns but allows the edit to proceed.

## Continuous Health

Run `forgeplan health` periodically to catch:
- Stale evidence (decay past threshold).
- Orphaned artifacts (PRDs with no evidence).
- Blind spots (areas of code with no coverage).
- Inconsistencies (conflicting artifact statuses).

Integrate health checks into your workflow by running them at the start of each session.
